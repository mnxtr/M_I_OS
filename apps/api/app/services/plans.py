import uuid
from dataclasses import dataclass
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session as DBSession

METRIC_CHAT = "chat_queries"
METRIC_ANALYTICS = "analytics_queries"
METRIC_PAGES = "pages_ingested"

ALL_METRICS = (METRIC_CHAT, METRIC_ANALYTICS, METRIC_PAGES)


@dataclass(frozen=True)
class PlanLimits:
    code: str
    name: str
    monthly_chat_queries: int  # -1 = unlimited
    monthly_analytics_queries: int
    monthly_pages: int
    price_usd: int


PLANS: dict[str, PlanLimits] = {
    "trial": PlanLimits("trial", "Trial", 200, 50, 500, 0),
    "starter": PlanLimits("starter", "Starter", 1500, 300, 2000, 99),
    "growth": PlanLimits("growth", "Growth", -1, -1, 10000, 299),
    "enterprise": PlanLimits("enterprise", "Enterprise", -1, -1, -1, 800),
}

DEFAULT_PLAN = "trial"

# ROI ledger factors — conservative expert-time estimates per action.
ROI_MINUTES_PER = {
    METRIC_CHAT: 3,
    METRIC_ANALYTICS: 8,
}


def period_key(now: datetime | None = None) -> str:
    moment = now or datetime.now(UTC)
    return f"{moment.year:04d}-{moment.month:02d}"


def limit_for(plan_code: str, metric: str) -> int:
    plan = PLANS.get(plan_code, PLANS[DEFAULT_PLAN])
    limits = {
        METRIC_CHAT: plan.monthly_chat_queries,
        METRIC_ANALYTICS: plan.monthly_analytics_queries,
        METRIC_PAGES: plan.monthly_pages,
    }
    return limits[metric]


def get_used(db: DBSession, tenant_id: uuid.UUID, metric: str) -> int:
    row = db.execute(
        text(
            "SELECT used FROM monthly_usage WHERE tenant_id = :tid "
            "AND period = :period AND metric = :metric"
        ),
        {"tid": str(tenant_id), "period": period_key(), "metric": metric},
    ).scalar()
    return int(row or 0)


def record_usage(db: DBSession, tenant_id: uuid.UUID, metric: str, quantity: int = 1) -> None:
    if metric not in ALL_METRICS:
        raise ValueError(f"Unknown metric {metric}")
    db.execute(
        text(
            "INSERT INTO monthly_usage (tenant_id, period, metric, used) "
            "VALUES (:tid, :period, :metric, :qty) "
            "ON CONFLICT (tenant_id, period, metric) DO UPDATE SET used = monthly_usage.used + :qty"
        ),
        {"tid": str(tenant_id), "period": period_key(), "metric": metric, "qty": quantity},
    )


class QuotaExceeded(HTTPException):
    def __init__(self, plan_code: str, metric: str):
        plan = PLANS.get(plan_code, PLANS[DEFAULT_PLAN])
        super().__init__(
            status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "quota_exceeded",
                "message": (
                    f"Monthly {metric} allowance for the {plan.name} plan is exhausted. "
                    "Upgrade your plan to continue."
                ),
                "plan": plan.code,
                "metric": metric,
                "limit": limit_for(plan.code, metric),
            },
        )


def enforce_quota(db: DBSession, tenant_id: uuid.UUID, plan_code: str, metric: str) -> None:
    limit = limit_for(plan_code, metric)
    if limit < 0:
        return
    if get_used(db, tenant_id, metric) >= limit:
        raise QuotaExceeded(plan_code, metric)


def estimate_minutes_saved(usage_by_metric: dict[str, int]) -> int:
    total = 0
    for metric, minutes in ROI_MINUTES_PER.items():
        total += usage_by_metric.get(metric, 0) * minutes
    return total
