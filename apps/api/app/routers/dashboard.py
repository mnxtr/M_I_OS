import math
import uuid
from datetime import UTC, date, datetime, timedelta
from typing import Annotated, Literal

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, select

from app.deps import CurrentUser, DbDep
from app.models import (
    AssessmentItem,
    Document,
    Factory,
    FactoryMembership,
)

router = APIRouter(prefix="/v1/dashboard", tags=["dashboard"])


class DashboardFactory(BaseModel):
    id: str
    name: str
    timezone: str
    currency: str


class DashboardContext(BaseModel):
    factory: DashboardFactory
    factories: list[DashboardFactory]
    role: str
    capabilities: list[str]
    date_from: str
    date_to: str
    granularity: str
    line_id: str | None
    shift: str | None
    available_lines: list[str]
    available_shifts: list[str]


class KpiMetric(BaseModel):
    key: str
    value: float
    unit: str
    target: float | None = None
    delta: float
    status: Literal["good", "warning", "critical", "neutral"]
    module: str


class SeriesPoint(BaseModel):
    label: str
    actual: float
    target: float
    reject_rate: float
    downtime: float


class LineRanking(BaseModel):
    line: str
    attainment: float
    lost_output: int


class ParetoPoint(BaseModel):
    category: str
    count: int
    cumulative_pct: float


class StatusMetric(BaseModel):
    status: str
    value: int


class MaintenanceMetric(BaseModel):
    category: str
    planned: int
    completed: int
    overdue: int


class FreshnessMetric(BaseModel):
    source: str
    updated_at: str
    status: Literal["fresh", "stale", "missing"]


class DashboardSnapshot(BaseModel):
    context: DashboardContext
    generated_at: str
    seeded_demo: bool
    kpis: list[KpiMetric]
    production_series: list[SeriesPoint] | None
    line_rankings: list[LineRanking] | None
    quality_pareto: list[ParetoPoint] | None
    compliance_coverage: list[StatusMetric] | None
    maintenance_health: list[MaintenanceMetric] | None
    action_pipeline: list[StatusMetric] | None
    evidence_health: list[StatusMetric]
    freshness: list[FreshnessMetric]
    warnings: list[str]


FULL_CAPABILITIES = [
    "dashboard",
    "production",
    "quality",
    "compliance",
    "maintenance",
    "actions",
    "evidence",
]

ROLE_CAPABILITIES = {
    "owner": FULL_CAPABILITIES,
    "admin": FULL_CAPABILITIES,
    "production_manager": ["dashboard", "production", "quality", "actions", "evidence"],
    "compliance_manager": ["dashboard", "compliance", "actions", "evidence"],
    "quality_manager": ["dashboard", "quality", "actions", "evidence"],
    "maintenance_manager": ["dashboard", "maintenance", "actions", "evidence"],
    "operator": ["dashboard", "production", "actions", "evidence"],
    "auditor": ["dashboard", "compliance", "evidence"],
    "guest": ["dashboard", "compliance", "evidence"],
}


def _visible(capabilities: list[str], module: str) -> bool:
    return module in capabilities


def _factories_for_user(db: DbDep, user: CurrentUser) -> list[tuple[FactoryMembership, Factory]]:
    return list(
        db.execute(
            select(FactoryMembership, Factory)
            .join(Factory, Factory.id == FactoryMembership.factory_id)
            .where(
                FactoryMembership.user_id == user.id,
                FactoryMembership.is_active.is_(True),
                Factory.is_active.is_(True),
            )
            .order_by(Factory.name)
        ).all()
    )


def _resolve_context(
    db: DbDep,
    user: CurrentUser,
    requested_factory_id: uuid.UUID | None,
) -> tuple[DashboardFactory, list[DashboardFactory], str, list[str]]:
    memberships = _factories_for_user(db, user)
    if memberships:
        selected = next(
            (
                row
                for row in memberships
                if requested_factory_id is None or row[1].id == requested_factory_id
            ),
            None,
        )
        if selected is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Factory not found")
        membership, factory = selected
        available = [
            DashboardFactory(
                id=str(candidate.id),
                name=candidate.name,
                timezone=candidate.timezone,
                currency=candidate.currency,
            )
            for _, candidate in memberships
        ]
        capabilities = list(membership.capabilities or ROLE_CAPABILITIES.get(membership.role, []))
        return available[memberships.index(selected)], available, membership.role, capabilities

    if requested_factory_id is not None and requested_factory_id != user.tenant_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Factory not found")
    fallback = DashboardFactory(
        id=str(user.tenant_id),
        name="Demo Factory",
        timezone="Asia/Dhaka",
        currency="BDT",
    )
    return fallback, [fallback], user.role, list(ROLE_CAPABILITIES.get(user.role, ["dashboard"]))


def build_seed_dashboard(
    *,
    factory: DashboardFactory,
    factories: list[DashboardFactory],
    role: str,
    capabilities: list[str],
    date_from: date,
    date_to: date,
    granularity: str,
    line_id: str | None,
    shift: str | None,
    evidence_counts: dict[str, int] | None = None,
    compliance_counts: dict[str, int] | None = None,
) -> DashboardSnapshot:
    day_count = max(1, min((date_to - date_from).days + 1, 31))
    points: list[SeriesPoint] = []
    for index in range(day_count):
        current = date_from + timedelta(days=index)
        wave = math.sin(index * 1.17) * 260
        target = 8200 + (index % 3) * 120
        actual = round(target * (0.91 + (index % 5) * 0.015) + wave)
        points.append(
            SeriesPoint(
                label=current.strftime("%d %b"),
                actual=actual,
                target=target,
                reject_rate=round(2.1 + (index % 4) * 0.35, 1),
                downtime=round(32 + (index % 3) * 11 + abs(wave) / 40),
            )
        )

    actual_total = sum(point.actual for point in points)
    target_total = sum(point.target for point in points)
    attainment = round(actual_total / max(target_total, 1) * 100, 1)
    reject_rate = round(sum(point.reject_rate for point in points) / len(points), 1)
    downtime = round(sum(point.downtime for point in points))

    quality_counts = [37, 24, 18, 12, 7]
    quality_total = sum(quality_counts)
    running = 0
    pareto: list[ParetoPoint] = []
    for category, count in zip(
        ["Broken stitch", "Oil mark", "Measurement", "Needle mark", "Shade variation"],
        quality_counts,
        strict=True,
    ):
        running += count
        pareto.append(
            ParetoPoint(
                category=category,
                count=count,
                cumulative_pct=round(running / quality_total * 100, 1),
            )
        )

    compliance = compliance_counts or {
        "compliant": 42,
        "partial": 11,
        "gap": 6,
        "unknown": 4,
        "expiring": 3,
    }
    evidence = evidence_counts or {
        "ready": 6,
        "processing": 0,
        "failed": 0,
        "stale": 1,
        "superseded": 0,
    }

    open_gaps = compliance.get("gap", 0) + compliance.get("unknown", 0)
    overdue_actions = 5
    kpis = [
        KpiMetric(
            key="output",
            value=actual_total,
            unit="pcs",
            target=target_total,
            delta=3.8,
            status="good" if attainment >= 95 else "warning",
            module="production",
        ),
        KpiMetric(
            key="attainment",
            value=attainment,
            unit="%",
            target=100,
            delta=1.9,
            status="good" if attainment >= 95 else "warning",
            module="production",
        ),
        KpiMetric(
            key="reject_rate",
            value=reject_rate,
            unit="%",
            target=2.0,
            delta=-0.4,
            status="warning" if reject_rate > 2 else "good",
            module="quality",
        ),
        KpiMetric(
            key="downtime",
            value=downtime,
            unit="min",
            target=250,
            delta=-8.2,
            status="warning" if downtime > 250 else "good",
            module="maintenance",
        ),
        KpiMetric(
            key="compliance_gaps",
            value=open_gaps,
            unit="open",
            target=0,
            delta=-2,
            status="critical" if open_gaps > 8 else "warning",
            module="compliance",
        ),
        KpiMetric(
            key="overdue_actions",
            value=overdue_actions,
            unit="tasks",
            target=0,
            delta=-1,
            status="warning",
            module="actions",
        ),
        KpiMetric(
            key="time_saved",
            value=101,
            unit="min",
            target=None,
            delta=18,
            status="neutral",
            module="dashboard",
        ),
    ]
    visible_kpis = [metric for metric in kpis if _visible(capabilities, metric.module)]

    now = datetime.now(UTC).isoformat(timespec="seconds")
    return DashboardSnapshot(
        context=DashboardContext(
            factory=factory,
            factories=factories,
            role=role,
            capabilities=capabilities,
            date_from=date_from.isoformat(),
            date_to=date_to.isoformat(),
            granularity=granularity,
            line_id=line_id,
            shift=shift,
            available_lines=["Line 01", "Line 02", "Line 03", "Line 04", "Line 05"],
            available_shifts=["Morning", "Evening", "Night"],
        ),
        generated_at=now,
        seeded_demo=True,
        kpis=visible_kpis,
        production_series=points if _visible(capabilities, "production") else None,
        line_rankings=(
            [
                LineRanking(line="Line 03", attainment=98.4, lost_output=120),
                LineRanking(line="Line 01", attainment=96.1, lost_output=280),
                LineRanking(line="Line 05", attainment=93.8, lost_output=510),
                LineRanking(line="Line 02", attainment=89.5, lost_output=860),
                LineRanking(line="Line 04", attainment=84.2, lost_output=1310),
            ]
            if _visible(capabilities, "production")
            else None
        ),
        quality_pareto=pareto if _visible(capabilities, "quality") else None,
        compliance_coverage=(
            [StatusMetric(status=key, value=value) for key, value in compliance.items()]
            if _visible(capabilities, "compliance")
            else None
        ),
        maintenance_health=(
            [
                MaintenanceMetric(category="Preventive", planned=28, completed=23, overdue=3),
                MaintenanceMetric(category="Electrical", planned=12, completed=10, overdue=1),
                MaintenanceMetric(category="Mechanical", planned=16, completed=12, overdue=4),
            ]
            if _visible(capabilities, "maintenance")
            else None
        ),
        action_pipeline=(
            [
                StatusMetric(status="draft", value=4),
                StatusMetric(status="pending_approval", value=6),
                StatusMetric(status="in_progress", value=11),
                StatusMetric(status="overdue", value=5),
                StatusMetric(status="completed", value=24),
            ]
            if _visible(capabilities, "actions")
            else None
        ),
        evidence_health=[StatusMetric(status=key, value=value) for key, value in evidence.items()],
        freshness=[
            FreshnessMetric(source="Production & line performance", updated_at=now, status="fresh"),
            FreshnessMetric(source="Compliance evidence", updated_at=now, status="fresh"),
            FreshnessMetric(source="Maintenance schedule", updated_at=now, status="fresh"),
        ],
        warnings=["seeded_demo_data"],
    )


@router.get("", response_model=DashboardSnapshot)
def dashboard(
    user: CurrentUser,
    db: DbDep,
    factory_id: uuid.UUID | None = None,
    from_date: Annotated[date | None, Query(alias="from")] = None,
    to_date: Annotated[date | None, Query(alias="to")] = None,
    granularity: Literal["day", "shift", "line"] = "day",
    line_id: Annotated[str | None, Query(max_length=100)] = None,
    shift: Annotated[str | None, Query(max_length=100)] = None,
) -> DashboardSnapshot:
    effective_to = to_date or date.today()
    effective_from = from_date or effective_to - timedelta(days=6)
    if effective_to < effective_from:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "to must be on or after from")
    if (effective_to - effective_from).days > 90:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Dashboard range is limited to 90 days",
        )

    factory, factories, role, capabilities = _resolve_context(db, user, factory_id)
    evidence_counts = dict(
        db.execute(
            select(Document.status, func.count(Document.id)).group_by(Document.status)
        ).all()
    )
    compliance_counts = dict(
        db.execute(
            select(AssessmentItem.status, func.count(AssessmentItem.id)).group_by(
                AssessmentItem.status
            )
        ).all()
    )

    return build_seed_dashboard(
        factory=factory,
        factories=factories,
        role=role,
        capabilities=capabilities,
        date_from=effective_from,
        date_to=effective_to,
        granularity=granularity,
        line_id=line_id,
        shift=shift,
        evidence_counts=evidence_counts or None,
        compliance_counts=compliance_counts or None,
    )
