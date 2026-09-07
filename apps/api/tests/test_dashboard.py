"""Real SQL + HTTP integration on SQLite; this does NOT certify PostgreSQL RLS."""

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.db import get_db
from app.main import create_app
from app.models import Document, Tenant, User
from app.security import create_access_token


@pytest.fixture
def dashboard_client(monkeypatch):
    monkeypatch.setattr("app.deps.set_tenant", lambda db, tenant: None)
    engine = create_engine(
        "sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False}
    )
    for table in (Tenant.__table__, User.__table__, Document.__table__):
        table.create(engine)
    tenant_a, tenant_b, user_id = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    with Session(engine) as db:
        db.add_all([Tenant(id=tenant_a, name="A"), Tenant(id=tenant_b, name="B")])
        db.add(
            User(
                id=user_id,
                tenant_id=tenant_a,
                email="a@test.invalid",
                password_hash="unused",
                role="owner",
            )
        )
        db.add_all(
            [
                Document(tenant_id=tenant_a, filename="ready.pdf", status="ready"),
                Document(tenant_id=tenant_a, filename="failed.pdf", status="failed"),
                Document(tenant_id=tenant_b, filename="private-other-tenant.pdf", status="ready"),
            ]
        )
        db.commit()
    app = create_app()

    def session():
        with Session(engine) as db:
            yield db

    app.dependency_overrides[get_db] = session
    with TestClient(app) as client:
        yield client, {"Authorization": f"Bearer {create_access_token(user_id, tenant_a, 'owner')}"}
    engine.dispose()


def test_dashboard_is_tenant_scoped(dashboard_client):
    client, headers = dashboard_client
    response = client.get("/v1/dashboard/knowledge", headers=headers)
    assert response.status_code == 200
    assert response.headers["cache-control"] == "private, no-store"
    body = response.json()
    assert body["total"] == 2
    assert body["ready_percent"] == 50.0
    assert body["counts"] == {"ready": 1, "failed": 1, "processing": 0}
    assert "private-other-tenant" not in response.text
    assert "storage_path" not in response.text


def test_status_drilldown_and_pagination(dashboard_client):
    client, headers = dashboard_client
    body = client.get("/v1/dashboard/knowledge?status=failed&limit=1", headers=headers).json()
    assert body["matched"] == 1 and body["total"] == 2
    assert body["records"][0]["filename"] == "failed.pdf"
    assert client.get("/v1/dashboard/knowledge?offset=2", headers=headers).json()["records"] == []


@pytest.mark.parametrize("params", ["status=invalid", "offset=-1", "limit=51", "limit=0"])
def test_invalid_dashboard_filters(dashboard_client, params):
    client, headers = dashboard_client
    assert client.get(f"/v1/dashboard/knowledge?{params}", headers=headers).status_code == 422


def test_dashboard_rejects_unauthenticated(dashboard_client):
    client, _ = dashboard_client
    assert client.get("/v1/dashboard/knowledge").status_code == 401
    assert (
        client.get("/v1/dashboard/knowledge", headers={"Authorization": "Bearer bad"}).status_code
        == 401
    )


def test_inactive_and_empty_tenants(dashboard_client):
    client, headers = dashboard_client
    session = next(client.app.dependency_overrides[get_db]())
    # Open a new session through the same in-memory engine.
    with Session(session.bind) as db:
        user = db.query(User).one()
        user.tenant_id = uuid.uuid4()
        db.commit()
    body = client.get("/v1/dashboard/knowledge", headers=headers).json()
    assert body["total"] == 0 and body["ready_percent"] is None
    with Session(session.bind) as db:
        db.query(User).one().is_active = False
        db.commit()
    assert client.get("/v1/dashboard/knowledge", headers=headers).status_code == 401


def test_gap_endpoint_auth_and_validation(dashboard_client):
    client, headers = dashboard_client
    payload = {
        "observations": [
            {"line": "L1", "start": "2026-09-01T09:00:00+06:00", "target": 100, "actual": 75}
        ]
    }
    assert client.post("/v1/operations/gaps", json=payload).status_code == 401
    response = client.post("/v1/operations/gaps", json=payload, headers=headers)
    assert response.status_code == 200
    assert response.json()["gap_units"] == 25
    assert response.headers["cache-control"] == "private, no-store"
    assert (
        client.post("/v1/operations/gaps", json={"observations": []}, headers=headers).status_code
        == 422
    )
