import uuid
from types import SimpleNamespace

import httpx
import pytest
from fastapi import HTTPException

from app.services import supabase_auth


@pytest.fixture
def identity_server(monkeypatch):
    user_id, tenant_id = str(uuid.uuid4()), str(uuid.uuid4())
    identity = {"id": user_id, "app_metadata": {"tenant_id": tenant_id, "role": "member"}}
    profile = {
        "id": user_id,
        "tenant_id": tenant_id,
        "role": "member",
        "is_active": True,
        "email": "member@example.test",
        "full_name": "Member",
    }
    state = {"identity": identity, "rows": [profile], "status": 200}
    requests = []
    original_client = httpx.Client

    def handler(request):
        requests.append(request)
        assert request.headers["authorization"] == "Bearer user-token"
        assert request.headers["apikey"] == "public-test-key"
        if request.url.path == "/auth/v1/user":
            return httpx.Response(state["status"], json=state["identity"])
        assert request.url.params["id"] == f"eq.{user_id}"
        return httpx.Response(200, json=state["rows"])

    monkeypatch.setattr(
        supabase_auth,
        "get_settings",
        lambda: SimpleNamespace(
            supabase_url="https://project.supabase.co", supabase_publishable_key="public-test-key"
        ),
    )
    monkeypatch.setattr(
        supabase_auth.httpx,
        "Client",
        lambda **kwargs: original_client(transport=httpx.MockTransport(handler), **kwargs),
    )
    return state, requests


def test_verified_identity_and_membership(identity_server):
    state, requests = identity_server
    user = supabase_auth.verify_user("user-token")
    assert str(user.tenant_id) == state["rows"][0]["tenant_id"]
    assert user.role == "member"
    assert len(requests) == 2


@pytest.mark.parametrize("change", ["tenant", "role", "inactive", "missing", "metadata"])
def test_membership_cannot_be_self_asserted(identity_server, change):
    state, _ = identity_server
    if change == "tenant":
        state["rows"][0]["tenant_id"] = str(uuid.uuid4())
    elif change == "role":
        state["rows"][0]["role"] = "owner"
    elif change == "inactive":
        state["rows"][0]["is_active"] = False
    elif change == "missing":
        state["rows"] = []
    else:
        state["identity"]["user_metadata"] = state["identity"].pop("app_metadata")
    with pytest.raises(HTTPException) as error:
        supabase_auth.verify_user("user-token")
    assert error.value.status_code == 403


def test_expired_identity_does_not_query_profiles(identity_server):
    state, requests = identity_server
    state["status"] = 401
    with pytest.raises(HTTPException) as error:
        supabase_auth.verify_user("user-token")
    assert error.value.status_code == 401
    assert len(requests) == 1


def test_auth_provider_outage_is_not_invalid_credentials(identity_server):
    state, _ = identity_server
    state["status"] = 503
    with pytest.raises(HTTPException) as error:
        supabase_auth.verify_user("user-token")
    assert error.value.status_code == 503
