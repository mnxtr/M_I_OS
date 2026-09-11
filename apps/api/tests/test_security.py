from types import SimpleNamespace

import jwt
import pytest

from app import security


def _settings(**overrides):
    values = {
        "supabase_url": "https://example.supabase.co",
        "supabase_publishable_key": "publishable-test-key",
        "supabase_jwt_audience": "authenticated",
    }
    values.update(overrides)
    return SimpleNamespace(**values)


def test_supabase_verification_requires_project_url(monkeypatch):
    token = jwt.encode({"sub": "user-id"}, "secret", algorithm="HS256")
    monkeypatch.setattr(security, "get_settings", lambda: _settings(supabase_url=""))

    with pytest.raises(jwt.InvalidTokenError, match="SUPABASE_URL"):
        security.decode_supabase_token(token)


def test_supabase_verification_rejects_unsupported_algorithm(monkeypatch):
    token = jwt.encode({"sub": "user-id"}, "secret", algorithm="HS512")
    monkeypatch.setattr(security, "get_settings", _settings)

    with pytest.raises(jwt.InvalidTokenError, match="Unsupported Supabase signing algorithm"):
        security.decode_supabase_token(token)
