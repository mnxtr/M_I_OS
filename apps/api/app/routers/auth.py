from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.config import get_settings
from app.deps import CurrentUser, DbDep
from app.models import Factory, FactoryMembership, Tenant, User
from app.schemas import LoginIn, MembershipOut, RegisterIn, TokenOut, UserOut
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/v1/auth", tags=["auth"])


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterIn, db: DbDep) -> TokenOut:
    if get_settings().supabase_url:
        raise HTTPException(
            status.HTTP_410_GONE,
            "Password registration is disabled. Use an invited Supabase email OTP.",
        )
    exists = db.scalar(select(User).where(User.email == payload.email.lower()))
    if exists:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")

    tenant = Tenant(name=payload.company_name)
    user = User(
        tenant_id=tenant.id,
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        role="owner",
    )
    db.add(tenant)
    db.add(user)
    db.flush()
    token = create_access_token(user.id, tenant.id, user.role)
    return TokenOut(access_token=token)


@router.post("/login", response_model=TokenOut)
def login(payload: LoginIn, db: DbDep) -> TokenOut:
    if get_settings().supabase_url:
        raise HTTPException(
            status.HTTP_410_GONE,
            "Password login is disabled. Use Supabase email OTP.",
        )
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")
    token = create_access_token(user.id, user.tenant_id, user.role)
    return TokenOut(access_token=token)


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser, db: DbDep) -> UserOut:
    rows = db.execute(
        select(FactoryMembership, Factory)
        .join(Factory, Factory.id == FactoryMembership.factory_id)
        .where(
            FactoryMembership.user_id == user.id,
            FactoryMembership.is_active.is_(True),
            Factory.is_active.is_(True),
        )
        .order_by(Factory.name)
    ).all()
    memberships = [
        MembershipOut(
            factory_id=factory.id,
            factory_name=factory.name,
            role=membership.role,
            capabilities=list(membership.capabilities or []),
            timezone=factory.timezone,
            currency=factory.currency,
        )
        for membership, factory in rows
    ]
    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        memberships=memberships,
        active_factory_id=memberships[0].factory_id if memberships else None,
        capabilities=memberships[0].capabilities if memberships else [],
        language="en",
        onboarding_state="ready" if memberships else "factory_required",
    )
