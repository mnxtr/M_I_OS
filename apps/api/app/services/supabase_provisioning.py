"""Controlled server-side provisioning for Supabase factory memberships.

The secret key is deliberately required here. A browser must never be able to
assign its own tenant or role through user metadata.
"""

import uuid

import httpx

from app.config import get_settings

ALLOWED_ROLES = frozenset({"owner", "admin", "compliance_manager", "production_manager", "operator"})


def provision_membership(
    *, user_id: uuid.UUID, tenant_id: uuid.UUID, email: str, full_name: str, role: str
) -> None:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_secret_key:
        raise RuntimeError("Supabase membership provisioning is not configured")
    if role not in ALLOWED_ROLES:
        raise ValueError("Unsupported factory role")

    base = settings.supabase_url.rstrip("/")
    headers = {
        "apikey": settings.supabase_secret_key,
        "Authorization": f"Bearer {settings.supabase_secret_key}",
        "Content-Type": "application/json",
    }
    membership = {"tenant_id": str(tenant_id), "role": role}
    with httpx.Client(timeout=15) as client:
        identity = client.get(f"{base}/auth/v1/admin/users/{user_id}", headers=headers)
        identity.raise_for_status()
        identity_json = identity.json()
        identity_payload = identity_json.get("user") or identity_json
        existing_metadata = identity_payload.get("app_metadata") or {}
        update = client.put(
            f"{base}/auth/v1/admin/users/{user_id}",
            headers=headers,
            json={"app_metadata": {**existing_metadata, **membership}},
        )
        update.raise_for_status()
        profile = client.post(
            f"{base}/rest/v1/profiles",
            headers={
                **headers,
                "Prefer": "resolution=merge-duplicates,return=minimal",
            },
            params={"on_conflict": "id"},
            json={
                "id": str(user_id),
                "tenant_id": str(tenant_id),
                "email": email,
                "full_name": full_name,
                "role": role,
                "is_active": True,
            },
        )
        profile.raise_for_status()
