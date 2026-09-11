
import hashlib
import hmac
import os
import time
import uuid
from typing import Any

import httpx
import jwt

from app.config import get_settings

_SCRYPT_N, _SCRYPT_R, _SCRYPT_P = 2**14, 8, 1


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.scrypt(
        password.encode(), salt=salt, n=_SCRYPT_N, r=_SCRYPT_R, p=_SCRYPT_P, dklen=32
    )
    return f"scrypt${_SCRYPT_N}${_SCRYPT_R}${_SCRYPT_P}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        scheme, n, r, p, salt_hex, digest_hex = stored.split("$")
        if scheme != "scrypt":
            return False
        digest = hashlib.scrypt(
            password.encode(),
            salt=bytes.fromhex(salt_hex),
            n=int(n),
            r=int(r),
            p=int(p),
            dklen=32,
        )
        return hmac.compare_digest(digest.hex(), digest_hex)
    except (ValueError, TypeError):
        return False


def create_access_token(user_id: uuid.UUID, tenant_id: uuid.UUID, role: str) -> str:
    settings = get_settings()
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "tenant_id": str(tenant_id),
        "role": role,
        "exp": int(time.time()) + settings.jwt_expire_minutes * 60,
        "iat": int(time.time()),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])


def decode_supabase_token(token: str) -> dict[str, Any]:
    """Verify a Supabase Auth access token using the project's signing keys.

    Supabase projects using asymmetric signing keys expose a JWKS endpoint. Older
    HS256 projects cannot expose public keys, so those tokens are verified by the
    Auth `/user` endpoint instead. The API never trusts unverified claims.
    """
    settings = get_settings()
    if not settings.supabase_url:
        raise jwt.InvalidTokenError("SUPABASE_URL is not configured")

    base_url = settings.supabase_url.rstrip("/")
    issuer = f"{base_url}/auth/v1"
    header = jwt.get_unverified_header(token)
    algorithm = header.get("alg")

    if algorithm == "HS256":
        if not settings.supabase_publishable_key:
            raise jwt.InvalidTokenError("SUPABASE_PUBLISHABLE_KEY is not configured")
        response = httpx.get(
            f"{issuer}/user",
            headers={
                "apikey": settings.supabase_publishable_key,
                "Authorization": f"Bearer {token}",
            },
            timeout=5.0,
        )
        if response.status_code != 200:
            raise jwt.InvalidTokenError("Supabase rejected the access token")
        user = response.json()
        user_id = user.get("id")
        if not user_id:
            raise jwt.InvalidTokenError("Supabase user response has no id")
        return {
            "sub": user_id,
            "email": user.get("email", ""),
            "app_metadata": user.get("app_metadata") or {},
            "aud": settings.supabase_jwt_audience,
            "iss": issuer,
        }

    if algorithm not in {"RS256", "ES256", "EdDSA"}:
        raise jwt.InvalidTokenError(f"Unsupported Supabase signing algorithm: {algorithm}")

    jwks = jwt.PyJWKClient(f"{issuer}/.well-known/jwks.json", cache_jwk_set=True, lifespan=600)
    signing_key = jwks.get_signing_key_from_jwt(token).key
    return jwt.decode(
        token,
        signing_key,
        algorithms=[algorithm],
        audience=settings.supabase_jwt_audience,
        issuer=issuer,
    )
