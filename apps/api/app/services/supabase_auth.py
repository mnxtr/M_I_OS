"""Verify Supabase identity remotely, then load authorization through user-scoped RLS."""

import uuid
from dataclasses import dataclass

import httpx
from fastapi import HTTPException

from app.config import get_settings


@dataclass
class Principal:
    id: uuid.UUID
    tenant_id: uuid.UUID
    role: str
    email: str
    full_name: str
    is_active: bool = True


def verify_user(token: str) -> Principal:
    settings = get_settings()
    base = settings.supabase_url.rstrip("/")
    if not base.startswith("https://") or not settings.supabase_publishable_key:
        raise HTTPException(503, "Supabase authentication is not configured")
    headers = {"apikey": settings.supabase_publishable_key, "Authorization": f"Bearer {token}"}
    try:
        with httpx.Client(timeout=10) as client:
            identity = client.get(f"{base}/auth/v1/user", headers=headers)
            if identity.status_code in (401, 403):
                raise HTTPException(401, "Invalid or expired Supabase session")
            identity.raise_for_status()
            verified_identity = identity.json()
            user_id = uuid.UUID(verified_identity["id"])
            authorization = verified_identity.get("app_metadata", {})
            if not authorization.get("tenant_id") or not authorization.get("role"):
                raise HTTPException(403, "Server-managed factory membership is not provisioned")
            profile = client.get(
                f"{base}/rest/v1/profiles",
                headers=headers,
                params={
                    "id": f"eq.{user_id}",
                    "select": "id,tenant_id,role,email,full_name,is_active",
                },
            )
            profile.raise_for_status()
            rows = profile.json()
        if len(rows) != 1 or rows[0].get("is_active") is not True:
            raise HTTPException(403, "An active factory membership is required")
        row = rows[0]
        if uuid.UUID(row["id"]) != user_id:
            raise HTTPException(403, "Membership mismatch")
        if row["tenant_id"] != authorization["tenant_id"] or row["role"] != authorization["role"]:
            raise HTTPException(403, "Profile does not match server-managed membership")
        # Never read tenant or role from user-editable user_metadata.
        return Principal(
            id=user_id,
            tenant_id=uuid.UUID(row["tenant_id"]),
            role=row["role"],
            email=row["email"],
            full_name=row.get("full_name", ""),
        )
    except (httpx.HTTPError, ValueError, KeyError, TypeError):
        raise HTTPException(503, "Supabase identity or membership lookup unavailable") from None
