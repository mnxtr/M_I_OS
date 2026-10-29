"""Phase 1: server-resolved tenant identity regression tests.

These are unit tests, not live cross-tenant JWT / PostgREST tests.
"""

import uuid
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.deps import _profile_from_supabase


class FakeSession:
    def __init__(self, profile):
        self.profile = profile
        self.query = None
        self.parameters = None

    def execute(self, query, parameters):
        self.query = str(query)
        self.parameters = parameters
        return SimpleNamespace(mappings=lambda: SimpleNamespace(one_or_none=lambda: self.profile))


def profile(user_id, tenant_id, active=True):
    return {
        "id": user_id,
        "tenant_id": tenant_id,
        "email": "test@example.invalid",
        "full_name": "Test",
        "role": "operator",
        "is_active": active,
    }


def test_profile_tenant_is_resolved_from_server_not_editable_user_metadata():
    user_id, tenant_id, other_tenant = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    db = FakeSession(profile(user_id, tenant_id))
    result = _profile_from_supabase(db, {
        "sub": str(user_id),
        "user_metadata": {"tenant_id": str(other_tenant), "mios_role": "owner"},
    })
    assert result.tenant_id == tenant_id
    assert result.role == "operator"
    assert db.parameters == {"user_id": str(user_id)}
    assert "FROM profiles" in db.query


def test_verified_app_metadata_tenant_mismatch_is_rejected():
    user_id, tenant_id = uuid.uuid4(), uuid.uuid4()
    db = FakeSession(profile(user_id, tenant_id))
    with pytest.raises(HTTPException) as error:
        _profile_from_supabase(db, {
            "sub": str(user_id),
            "app_metadata": {"tenant_id": str(uuid.uuid4())},
        })
    assert error.value.status_code == 401


@pytest.mark.parametrize("metadata", ["invalid", [1, 2], 123, True])
def test_malformed_app_metadata_is_rejected_not_a_server_error(metadata):
    user_id, tenant_id = uuid.uuid4(), uuid.uuid4()
    with pytest.raises(HTTPException) as error:
        _profile_from_supabase(
            FakeSession(profile(user_id, tenant_id)),
            {"sub": str(user_id), "app_metadata": metadata},
        )
    assert error.value.status_code == 401


@pytest.mark.parametrize("active,missing", [(False, False), (True, True)])
def test_inactive_or_missing_profile_rejected(active, missing):
    user_id, tenant_id = uuid.uuid4(), uuid.uuid4()
    db = FakeSession(None if missing else profile(user_id, tenant_id, active))
    with pytest.raises(HTTPException) as error:
        _profile_from_supabase(db, {"sub": str(user_id)})
    assert error.value.status_code == 401


@pytest.mark.parametrize("subject", ["not-a-uuid", None, ""])
def test_invalid_supabase_subject_rejected(subject):
    with pytest.raises(HTTPException) as error:
        _profile_from_supabase(FakeSession(None), {"sub": subject})
    assert error.value.status_code == 401
