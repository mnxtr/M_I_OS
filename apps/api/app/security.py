import hashlib
import hmac
import os
import time
import uuid
from functools import lru_cache
from typing import Any

import httpx
import jwt
from jwt import PyJWKClient

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


@lru_cache(maxsize=4)
def _jwks_client(jwks_url: str) -> PyJWKClient:
    return PyJWKClient(jwks_url, cache_keys=True, lifespan=600)


def _decode_supabase_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    issuer = f"{settings.supabase_url.rstrip('/')}/auth/v1"
    header = jwt.get_unverified_header(token)
    algorithm = str(header.get("alg", ""))

    if algorithm == "HS256":
        if not settings.supabase_publishable_key:
            raise jwt.InvalidTokenError("Supabase publishable key is required for legacy tokens")
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
        return jwt.decode(
            token,
            algorithms=["HS256"],
            audience=settings.supabase_audience,
            issuer=issuer,
            options={"verify_signature": False},
        )

    if algorithm not in {"RS256", "ES256"}:
        raise jwt.InvalidAlgorithmError("Unsupported Supabase signing algorithm")

    signing_key = _jwks_client(f"{issuer}/.well-known/jwks.json").get_signing_key_from_jwt(token)
    return jwt.decode(
        token,
        signing_key.key,
        algorithms=[algorithm],
        audience=settings.supabase_audience,
        issuer=issuer,
    )


def decode_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    if settings.supabase_url:
        return _decode_supabase_token(token)
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
