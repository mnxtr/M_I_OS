from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.deps import CurrentUser, DbDep
from app.models import Tenant
from app.services.plans import (
    ALL_METRICS,
    DEFAULT_PLAN,
    PLANS,
    estimate_minutes_saved,
    get_used,
    limit_for,
    period_key,
)

router = APIRouter(prefix="/v1/tenant", tags=["tenant"])


class PlanOut(BaseModel):
    code: str
    name: str
    price_usd: int


class UsageOut(BaseModel):
    plan: PlanOut
    period: str
    usage: dict[str, int]
    limits: dict[str, int]
    estimated_minutes_saved: int


class PlanSwitchIn(BaseModel):
    plan: str = Field(min_length=1, max_length=30)


@router.get("/usage", response_model=UsageOut)
def get_usage(user: CurrentUser, db: DbDep) -> UsageOut:
    tenant = _tenant_of(db, user)
    usage = {metric: get_used(db, tenant.id, metric) for metric in ALL_METRICS}
    limits = {metric: limit_for(tenant.plan, metric) for metric in ALL_METRICS}
    return UsageOut(
        plan=_plan_out(tenant.plan),
        period=period_key(),
        usage=usage,
        limits=limits,
        estimated_minutes_saved=estimate_minutes_saved(usage),
    )


@router.post("/plan", response_model=PlanOut)
def switch_plan(payload: PlanSwitchIn, user: CurrentUser, db: DbDep) -> PlanOut:
    if payload.plan not in PLANS:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"Unknown plan. Available: {sorted(PLANS)}",
        )
    if user.role != "owner":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the owner can change the plan")
    tenant = _tenant_of(db, user)
    tenant.plan = payload.plan
    db.flush()
    return _plan_out(tenant.plan)


@router.get("/plans", response_model=list[PlanOut])
def list_plans(_user: CurrentUser) -> list[PlanOut]:
    return [_plan_out(code) for code in PLANS]


def _plan_out(plan_code: str) -> PlanOut:
    plan = PLANS.get(plan_code, PLANS[DEFAULT_PLAN])
    return PlanOut(code=plan.code, name=plan.name, price_usd=plan.price_usd)


def _tenant_of(db, user: CurrentUser) -> Tenant:
    tenant = db.get(Tenant, user.tenant_id)
    if tenant is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tenant not found")
    return tenant
