import uuid
from typing import Annotated

import jwt as pyjwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db, set_tenant
from app.models import User
from app.security import decode_token

bearer = HTTPBearer(auto_error=False)

DbDep = Annotated[Session, Depends(get_db)]


def get_current_user(
    db: DbDep,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> User:
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    if get_settings().auth_provider == "supabase":
        from app.services.supabase_auth import verify_user

        user = verify_user(credentials.credentials)
        set_tenant(db, user.tenant_id)
        return user
    if get_settings().auth_provider != "legacy":
        raise HTTPException(503, "Unknown authentication provider")
    try:
        payload = decode_token(credentials.credentials)
        user_id = uuid.UUID(payload["sub"])
    except (pyjwt.PyJWTError, KeyError, ValueError, TypeError, AttributeError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token") from None

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found or inactive")

    set_tenant(db, user.tenant_id)
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
