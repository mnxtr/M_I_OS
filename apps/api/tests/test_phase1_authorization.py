"""Authorization regression checks for tenant-owned administrative features."""

import uuid
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.main import create_app
from app.routers.connectors import get_connector_secret
from app.routers.guest import GuestTokenIn, create_guest_token, revoke_guest_token


def _user(role: str) -> SimpleNamespace:
    return SimpleNamespace(role=role, tenant_id=uuid.uuid4(), id=uuid.uuid4())


def test_no_self_service_plan_activation_endpoint():
    exposed = {
        (route.path, method)
        for route in create_app().routes
        for method in (getattr(route, "methods", None) or set())
    }
    assert ("/v1/tenant/plan", "POST") not in exposed


@pytest.mark.parametrize("role", ["operator", "viewer", "auditor"])
def test_non_admin_cannot_read_connector_secret(role):
    with pytest.raises(HTTPException) as caught:
        get_connector_secret(_user(role), db=None)
    assert caught.value.status_code == 403


@pytest.mark.parametrize("role", ["operator", "viewer", "auditor"])
def test_non_admin_cannot_create_guest_links(role):
    with pytest.raises(HTTPException) as caught:
        create_guest_token(GuestTokenIn(scope_all_documents=True), _user(role), db=None)
    assert caught.value.status_code == 403


@pytest.mark.parametrize("role", ["operator", "viewer", "auditor"])
def test_non_admin_cannot_revoke_guest_links(role):
    with pytest.raises(HTTPException) as caught:
        revoke_guest_token("guest-key", _user(role), db=None)
    assert caught.value.status_code == 403


def test_guest_link_rejects_unknown_or_foreign_document_ids():
    document_id = uuid.uuid4()
    db = SimpleNamespace(scalars=lambda _query: SimpleNamespace(all=lambda: []))
    with pytest.raises(HTTPException) as caught:
        create_guest_token(GuestTokenIn(document_ids=[document_id]), _user("owner"), db=db)
    assert caught.value.status_code == 404
