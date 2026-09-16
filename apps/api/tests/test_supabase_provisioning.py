import uuid

import pytest

from app.config import get_settings
from app.services.supabase_provisioning import provision_membership


def test_provisioning_requires_server_secret(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.delenv("SUPABASE_SECRET_KEY", raising=False)
    get_settings.cache_clear()
    try:
        with pytest.raises(RuntimeError, match="not configured"):
            provision_membership(
                user_id=uuid.uuid4(),
                tenant_id=uuid.uuid4(),
                email="operator@example.com",
                full_name="Operator",
                role="operator",
            )
    finally:
        get_settings.cache_clear()


def test_provisioning_rejects_unknown_role(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_SECRET_KEY", "server-only-test-key")
    get_settings.cache_clear()
    try:
        with pytest.raises(ValueError, match="Unsupported factory role"):
            provision_membership(
                user_id=uuid.uuid4(),
                tenant_id=uuid.uuid4(),
                email="operator@example.com",
                full_name="Operator",
                role="superuser",
            )
    finally:
        get_settings.cache_clear()
