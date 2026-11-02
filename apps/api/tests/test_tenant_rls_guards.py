import os
import uuid
from types import SimpleNamespace

import jwt as pyjwt
import pytest
from fastapi import HTTPException

os.environ.setdefault("AUTH_MODE", "supabase")
os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_PUBLISHABLE_KEY", "publishable-test-key")

from app import deps  # noqa: E402
from app.routers import documents  # noqa: E402


def test_get_current_user_sets_tenant_context(monkeypatch):
    tenant_id = uuid.uuid4()
    user = deps.AuthenticatedUser(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        email="user@example.test",
        full_name="User",
        role="owner",
        is_active=True,
    )
    db = object()
    credentials = SimpleNamespace(credentials="token")

    monkeypatch.setattr(deps, "get_settings", lambda: SimpleNamespace(auth_mode="supabase"))
    monkeypatch.setattr(deps, "decode_supabase_token", lambda _token: {"sub": str(user.id)})
    monkeypatch.setattr(deps, "_profile_from_supabase", lambda _db, _payload: user)

    calls = []

    def _set_tenant(arg_db, arg_tenant_id):
        calls.append((arg_db, arg_tenant_id))

    monkeypatch.setattr(deps, "set_tenant", _set_tenant)

    resolved = deps.get_current_user(db, credentials)

    assert resolved == user
    assert calls == [(db, tenant_id)]


def test_get_current_user_rejects_invalid_token_without_setting_tenant(monkeypatch):
    db = object()
    credentials = SimpleNamespace(credentials="token")

    monkeypatch.setattr(deps, "get_settings", lambda: SimpleNamespace(auth_mode="supabase"))

    def _raise(_token):
        raise pyjwt.InvalidTokenError("bad token")

    monkeypatch.setattr(deps, "decode_supabase_token", _raise)

    set_tenant_called = False

    def _set_tenant(*_args, **_kwargs):
        nonlocal set_tenant_called
        set_tenant_called = True

    monkeypatch.setattr(deps, "set_tenant", _set_tenant)

    with pytest.raises(HTTPException) as caught:
        deps.get_current_user(db, credentials)

    assert caught.value.status_code == 401
    assert set_tenant_called is False


def test_document_worker_sets_tenant_context_before_processing(monkeypatch):
    tenant_id = uuid.uuid4()
    document_id = uuid.uuid4()
    document = SimpleNamespace(
        id=document_id,
        tenant_id=tenant_id,
        filename="test.pdf",
        storage_path="test.pdf",
        status="pending",
        error="",
        page_count=0,
    )

    class FakeSession:
        def __init__(self):
            self.committed = False
            self.closed = False

        def get(self, _model, _id):
            return document

        def commit(self):
            self.committed = True

        def close(self):
            self.closed = True

    fake_session = FakeSession()

    import app.db as db_module

    monkeypatch.setattr(db_module, "SessionLocal", lambda: fake_session)

    calls = []

    def _set_tenant(arg_db, arg_tenant_id):
        calls.append((arg_db, arg_tenant_id))

    monkeypatch.setattr(documents, "set_tenant", _set_tenant)

    def _raise(*_args, **_kwargs):
        raise RuntimeError("processing failed")

    monkeypatch.setattr(documents, "_materialize_document", _raise)

    documents.process_document(document_id)

    assert calls == [(fake_session, tenant_id)]
    assert document.status == "failed"
    assert "processing failed" in document.error
    assert fake_session.committed is True
    assert fake_session.closed is True
