import os

os.environ.setdefault("JWT_SECRET", "test-secret")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import create_app  # noqa: E402


@pytest.fixture(scope="module")
def client():
    return TestClient(create_app())


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "mios-api"}


def test_register_login_me_flow_requires_db(client):
    """Integration flow — requires Postgres with pgvector (docker compose)."""
    import os

    if not os.environ.get("MIOS_TEST_DSN"):
        pytest.skip("Set MIOS_TEST_DSN to run integration tests against Postgres")
    os.environ["DATABASE_URL"] = os.environ["MIOS_TEST_DSN"]

    email = "owner@testfactory.com"
    register = client.post(
        "/v1/auth/register",
        json={"company_name": "Test Factory Ltd", "email": email, "password": "s3cretpass"},
    )
    assert register.status_code == 201
    token = register.json()["access_token"]

    me = client.get("/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == email
    assert me.json()["role"] == "owner"

    login = client.post("/v1/auth/login", json={"email": email, "password": "s3cretpass"})
    assert login.status_code == 200

    unauthorized = client.get("/v1/auth/me")
    assert unauthorized.status_code == 401
