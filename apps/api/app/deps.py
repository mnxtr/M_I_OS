import uuid
from typing import Annotated

import jwt as pyjwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db, set_tenant
from app.models import Factory, FactoryMembership, Tenant, User
from app.security import decode_token

bearer = HTTPBearer(auto_error=False)

DbDep = Annotated[Session, Depends(get_db)]


def get_current_user(
    db: DbDep,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> User:
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    try:
        payload = decode_token(credentials.credentials)
    except pyjwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token") from None

    try:
        subject = uuid.UUID(payload["sub"])
    except (KeyError, ValueError, TypeError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid access token subject") from None

    settings = get_settings()
    if settings.supabase_url:
        user = db.scalar(select(User).where(User.auth_user_id == subject))
        email = str(payload.get("email", "")).strip().lower()
        if user is None and email:
            user = db.scalar(select(User).where(User.email == email))
            if user is not None and user.auth_user_id is None:
                user.auth_user_id = subject
                db.flush()
        if user is None and settings.supabase_auto_provision_pilot and email:
            tenant = Tenant(name="MIOS Pilot Factory")
            db.add(tenant)
            db.flush()
            set_tenant(db, tenant.id)
            user = User(
                tenant_id=tenant.id,
                auth_user_id=subject,
                email=email,
                full_name="",
                role="owner",
            )
            db.add(user)
            db.flush()
            factory = Factory(tenant_id=tenant.id, name="Demo Factory")
            db.add(factory)
            db.flush()
            db.add(
                FactoryMembership(
                    tenant_id=tenant.id,
                    factory_id=factory.id,
                    user_id=user.id,
                    role="owner",
                    capabilities=[
                        "dashboard",
                        "compliance",
                        "production",
                        "quality",
                        "maintenance",
                        "actions",
                        "evidence",
                    ],
                )
            )
            db.flush()
    else:
        user = db.get(User, subject)
    if user is None or not user.is_active:
        detail = "Invitation required" if settings.supabase_url else "User not found or inactive"
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail)

    set_tenant(db, user.tenant_id)
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
