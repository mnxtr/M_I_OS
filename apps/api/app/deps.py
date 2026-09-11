import uuid
from dataclasses import dataclass
from typing import Annotated

import jwt as pyjwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db, set_tenant
from app.models import User
from app.security import decode_supabase_token, decode_token

bearer = HTTPBearer(auto_error=False)

DbDep = Annotated[Session, Depends(get_db)]


@dataclass(slots=True)
class AuthenticatedUser:
    """Small user contract shared by legacy SQL users and Supabase profiles."""

    id: uuid.UUID
    tenant_id: uuid.UUID
    email: str
    full_name: str
    role: str
    is_active: bool


def _profile_from_supabase(db: Session, payload: dict) -> AuthenticatedUser:
    try:
        user_id = uuid.UUID(str(payload["sub"]))
    except (KeyError, ValueError, TypeError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid Supabase subject") from None

    # Resolve tenancy from the server-side profile row, not from editable user metadata.
    # The verified app_metadata tenant claim is still checked when present so a stale or
    # misconfigured token cannot be used to select a different workspace.
    profile = db.execute(
        text(
            "SELECT id, tenant_id, email, full_name, role, is_active "
            "FROM profiles WHERE id = :user_id"
        ),
        {"user_id": str(user_id)},
    ).mappings().one_or_none()
    if profile is None or not profile["is_active"]:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found or inactive")

    app_metadata = payload.get("app_metadata") or {}
    claim_tenant = app_metadata.get("tenant_id")
    if claim_tenant and str(profile["tenant_id"]) != str(claim_tenant):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Tenant claim does not match profile")

    return AuthenticatedUser(
        id=profile["id"],
        tenant_id=profile["tenant_id"],
        email=profile["email"] or str(payload.get("email", "")),
        full_name=profile["full_name"] or "",
        role=profile["role"] or "operator",
        is_active=bool(profile["is_active"]),
    )


def get_current_user(
    db: DbDep,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> AuthenticatedUser | User:
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    settings = get_settings()
    try:
        if settings.auth_mode == "legacy":
            payload = decode_token(credentials.credentials)
            user = db.get(User, uuid.UUID(payload["sub"]))
            if user is None or not user.is_active:
                raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found or inactive")
        elif settings.auth_mode == "supabase":
            payload = decode_supabase_token(credentials.credentials)
            user = _profile_from_supabase(db, payload)
        else:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Invalid AUTH_MODE")
    except HTTPException:
        raise
    except (pyjwt.PyJWTError, ValueError, KeyError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token") from None

    set_tenant(db, user.tenant_id)
    return user


CurrentUser = Annotated[AuthenticatedUser | User, Depends(get_current_user)]
