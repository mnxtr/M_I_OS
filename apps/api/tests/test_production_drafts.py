"""HTTP + SQL persistence tests. PostgreSQL policies need the deployment gate separately."""

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.config import get_settings
from app.db import get_db
from app.main import create_app
from app.models import ProductionDraft, Tenant, User
from app.security import create_access_token


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(get_settings(), "production_drafts_enabled", True)
    monkeypatch.setattr("app.deps.set_tenant", lambda db, tenant: None)
    engine = create_engine(
        "sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False}
    )
    for table in (Tenant.__table__, User.__table__, ProductionDraft.__table__):
        table.create(engine)
    tenant_a, tenant_b = uuid.uuid4(), uuid.uuid4()
    users = [(uuid.uuid4(), tenant_a), (uuid.uuid4(), tenant_a), (uuid.uuid4(), tenant_b)]
    with Session(engine) as db:
        db.add_all([Tenant(id=tenant_a, name="A"), Tenant(id=tenant_b, name="B")])
        for i, (uid, tid) in enumerate(users):
            db.add(
                User(
                    id=uid,
                    tenant_id=tid,
                    email=f"{i}@test.invalid",
                    password_hash="unused",
                    role="operator",
                )
            )
        db.commit()
    app = create_app()

    def session():
        with Session(engine) as db:
            yield db

    app.dependency_overrides[get_db] = session
    with TestClient(app) as http:
        headers = [
            {"Authorization": f"Bearer {create_access_token(uid, tid, 'operator')}"}
            for uid, tid in users
        ]
        yield http, headers
    engine.dispose()


def body(revision=0, actual=None):
    return {
        "expected_revision": revision,
        "payload": {
            "interval_minutes": 60,
            "observations": [
                {
                    "line": "L1",
                    "start": "2026-09-01T09:00:00+06:00",
                    "target": 100,
                    "actual": actual,
                }
            ],
        },
    }


def test_roundtrip_survives_new_request_and_preserves_unknown(client):
    http, headers = client
    assert http.get("/v1/operations/draft", headers=headers[0]).json() is None
    saved = http.post("/v1/operations/draft", headers=headers[0], json=body())
    assert saved.status_code == 200 and saved.json()["revision"] == 1
    restored = http.get("/v1/operations/draft", headers=headers[0])
    assert restored.json()["payload"]["observations"][0]["actual"] is None
    assert restored.headers["cache-control"] == "private, no-store"
    updated = http.post("/v1/operations/draft", headers=headers[0], json=body(1, 0))
    assert updated.json()["revision"] == 2
    assert (
        http.get("/v1/operations/draft", headers=headers[0]).json()["payload"]["observations"][0][
            "actual"
        ]
        == 0
    )


def test_other_user_and_tenant_cannot_read_or_update_draft(client):
    http, headers = client
    http.post("/v1/operations/draft", headers=headers[0], json=body())
    for other in headers[1:]:
        assert http.get("/v1/operations/draft", headers=other).json() is None
        assert http.post("/v1/operations/draft", headers=other, json=body(1, 99)).status_code == 409
        assert http.post("/v1/operations/draft", headers=other, json=body(0, 88)).status_code == 200
    assert (
        http.get("/v1/operations/draft", headers=headers[0]).json()["payload"]["observations"][0][
            "actual"
        ]
        is None
    )


def test_stale_tab_and_duplicate_create_never_overwrite(client):
    http, headers = client
    assert http.post("/v1/operations/draft", headers=headers[0], json=body()).status_code == 200
    assert (
        http.post("/v1/operations/draft", headers=headers[0], json=body(0, 10)).status_code == 409
    )
    assert (
        http.post("/v1/operations/draft", headers=headers[0], json=body(1, 80)).status_code == 200
    )
    assert (
        http.post("/v1/operations/draft", headers=headers[0], json=body(1, 10)).status_code == 409
    )
    assert (
        http.get("/v1/operations/draft", headers=headers[0]).json()["payload"]["observations"][0][
            "actual"
        ]
        == 80
    )


def test_empty_draft_can_be_saved_to_clear_saved_intervals(client):
    http, headers = client
    data = body()
    data["payload"]["observations"] = []
    assert http.post("/v1/operations/draft", headers=headers[0], json=data).status_code == 200


@pytest.mark.parametrize("change", ["negative", "overlap", "owner", "count", "revision"])
def test_invalid_drafts_are_rejected(client, change):
    http, headers = client
    data = body()
    if change == "negative":
        data["payload"]["observations"][0]["actual"] = -1
    elif change == "overlap":
        data["payload"]["observations"] *= 2
    elif change == "owner":
        data["user_id"] = str(uuid.uuid4())
    elif change == "count":
        data["payload"]["observations"] *= 501
    else:
        data["expected_revision"] = -1
    assert http.post("/v1/operations/draft", headers=headers[0], json=data).status_code == 422


def test_requires_identity_and_explicit_enablement(client, monkeypatch):
    http, headers = client
    assert http.get("/v1/operations/draft").status_code == 401
    assert http.post("/v1/operations/draft", json=body()).status_code == 401
    monkeypatch.setattr(get_settings(), "production_drafts_enabled", False)
    assert http.get("/v1/operations/draft", headers=headers[0]).status_code == 503
