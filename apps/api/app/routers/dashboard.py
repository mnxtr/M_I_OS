from __future__ import annotations

import uuid
from collections import Counter, defaultdict
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from app.deps import CurrentUser, DbDep
from app.models import Assessment, AssessmentItem, Document, TableRow, TableSource, Tenant
from app.routers.compliance import _counts
from app.routers.tenant import _plan_out
from app.services.plans import ALL_METRICS, estimate_minutes_saved, get_used, limit_for, period_key

router = APIRouter(prefix="/v1/dashboard", tags=["dashboard"])


class DashboardFilters(BaseModel):
    range_days: int = Field(30, ge=7, le=365)
    line: str = ""
    department: str = ""
    status: str = ""


class BreakdownOut(BaseModel):
    key: str
    label: str
    count: int
    tone: str = "neutral"


class TrendPointOut(BaseModel):
    date: str
    output_qty: int
    target_qty: int
    defects: int
    downtime_min: int
    defect_rate: float


class LineMetricOut(BaseModel):
    line: str
    output_qty: int
    target_qty: int
    defects: int
    downtime_min: int
    defect_rate: float


class DocumentOut(BaseModel):
    id: uuid.UUID
    filename: str
    doc_type: str
    department: str
    language: str
    status: str
    page_count: int
    error: str
    created_at: datetime


class TableOut(BaseModel):
    id: uuid.UUID
    name: str
    sheet_name: str
    columns: list[dict]
    row_count: int


class AssessmentOut(BaseModel):
    id: uuid.UUID
    title: str
    template_code: str
    due_date: str
    status: str
    created_at: datetime
    counts: dict[str, int]


class UsageOut(BaseModel):
    plan: dict
    period: str
    usage: dict[str, int]
    limits: dict[str, int]
    estimated_minutes_saved: int


class KnowledgeMetricsOut(BaseModel):
    total_documents: int
    ready_documents: int
    processing_documents: int
    failed_documents: int
    page_count: int
    status_breakdown: list[BreakdownOut]
    department_breakdown: list[BreakdownOut]
    recent_documents: list[DocumentOut]


class AnalyticsMetricsOut(BaseModel):
    table_count: int
    total_rows: int
    largest_tables: list[TableOut]


class ComplianceMetricsOut(BaseModel):
    assessment_count: int
    open_assessments: int
    gap_count: int
    partial_count: int
    manually_set_count: int
    status_breakdown: list[BreakdownOut]
    recent_assessments: list[AssessmentOut]


class ProductionMetricsOut(BaseModel):
    output_qty: int
    target_qty: int
    defects: int
    downtime_min: int
    defect_rate: float
    trend: list[TrendPointOut]
    by_line: list[LineMetricOut]


class QualityMetricsOut(BaseModel):
    defect_count: int
    defect_rate: float
    trend: list[TrendPointOut]
    by_line: list[LineMetricOut]


class DashboardSummaryOut(BaseModel):
    generated_at: datetime
    filters: DashboardFilters
    available_filters: dict[str, list[str]]
    knowledge: KnowledgeMetricsOut
    analytics: AnalyticsMetricsOut
    compliance: ComplianceMetricsOut
    production: ProductionMetricsOut
    quality: QualityMetricsOut
    usage: UsageOut | None


STATUS_TONES = {
    "ready": "ok",
    "processing": "accent",
    "failed": "danger",
    "compliant": "ok",
    "partial": "warn",
    "gap": "danger",
    "pending": "neutral",
    "unknown": "warn",
    "not_applicable": "neutral",
}


@router.get("/summary", response_model=DashboardSummaryOut)
def get_dashboard_summary(
    user: CurrentUser,
    db: DbDep,
    range_days: int = Query(30, ge=7, le=365),
    line: str = "",
    department: str = "",
    status: str = "",
) -> DashboardSummaryOut:
    filters = DashboardFilters(
        range_days=range_days,
        line=line.strip(),
        department=department.strip(),
        status=status.strip(),
    )
    since = datetime.now(UTC) - timedelta(days=filters.range_days)

    documents = list(db.query(Document).order_by(Document.created_at.desc()).all())
    tables = list(db.query(TableSource).order_by(TableSource.row_count.desc()).all())
    assessments = list(db.query(Assessment).order_by(Assessment.created_at.desc()).all())
    items = list(db.query(AssessmentItem).all())
    rows = list(db.query(TableRow).limit(5000).all())

    filtered_documents = [
        doc
        for doc in documents
        if (not filters.department or doc.department == filters.department)
        and (not filters.status or doc.status == filters.status)
        and _in_window(doc.created_at, since)
    ]
    production_rows = [
        row.data
        for row in rows
        if _row_in_window(row.data, since)
        and (not filters.line or _text(row.data, "line") == filters.line)
    ]

    production = _production_metrics(production_rows)

    return DashboardSummaryOut(
        generated_at=datetime.now(UTC),
        filters=filters,
        available_filters={
            "lines": sorted({_text(row.data, "line") for row in rows if _text(row.data, "line")}),
            "departments": sorted({doc.department for doc in documents if doc.department}),
            "statuses": ["ready", "processing", "failed"],
        },
        knowledge=_knowledge_metrics(filtered_documents),
        analytics=AnalyticsMetricsOut(
            table_count=len(tables),
            total_rows=sum(table.row_count for table in tables),
            largest_tables=[_table_out(table) for table in tables[:5]],
        ),
        compliance=_compliance_metrics(assessments, items),
        production=production,
        quality=QualityMetricsOut(
            defect_count=production.defects,
            defect_rate=production.defect_rate,
            trend=production.trend,
            by_line=production.by_line,
        ),
        usage=_usage(db, user),
    )


def _knowledge_metrics(documents: list[Document]) -> KnowledgeMetricsOut:
    status_counts = Counter(doc.status for doc in documents)
    department_counts = Counter(doc.department or "general" for doc in documents)
    return KnowledgeMetricsOut(
        total_documents=len(documents),
        ready_documents=status_counts["ready"],
        processing_documents=status_counts["processing"],
        failed_documents=status_counts["failed"],
        page_count=sum(doc.page_count for doc in documents),
        status_breakdown=_breakdown(status_counts),
        department_breakdown=_breakdown(department_counts),
        recent_documents=[_document_out(doc) for doc in documents[:5]],
    )


def _compliance_metrics(
    assessments: list[Assessment], items: list[AssessmentItem]
) -> ComplianceMetricsOut:
    counts = Counter(item.status for item in items)
    assessment_counts = _assessment_item_counts(items)
    return ComplianceMetricsOut(
        assessment_count=len(assessments),
        open_assessments=sum(1 for assessment in assessments if assessment.status != "complete"),
        gap_count=counts["gap"],
        partial_count=counts["partial"],
        manually_set_count=sum(1 for item in items if item.manually_set),
        status_breakdown=_breakdown(counts),
        recent_assessments=[
            AssessmentOut(
                id=assessment.id,
                title=assessment.title,
                template_code=assessment.template_code,
                due_date=assessment.due_date,
                status=assessment.status,
                created_at=assessment.created_at,
                counts=assessment_counts.get(assessment.id, {}),
            )
            for assessment in assessments[:5]
        ],
    )


def _production_metrics(rows: list[dict[str, Any]]) -> ProductionMetricsOut:
    by_date: dict[str, dict[str, int]] = defaultdict(_metric_bucket)
    by_line: dict[str, dict[str, int]] = defaultdict(_metric_bucket)
    total = _metric_bucket()

    for row in rows:
        date = _date_key(row) or "undated"
        line = _text(row, "line") or "Unknown line"
        bucket_values = {
            "output_qty": _number(row, "output_qty", "output", "qty", "quantity"),
            "target_qty": _number(row, "target_qty", "target"),
            "defects": _number(row, "defects", "defect_count", "rejects"),
            "downtime_min": _number(row, "downtime_min", "downtime", "downtime_minutes"),
        }
        for key, value in bucket_values.items():
            total[key] += value
            by_date[date][key] += value
            by_line[line][key] += value

    trend = [
        TrendPointOut(date=date, **_with_defect_rate(values))
        for date, values in sorted(by_date.items())
        if date != "undated"
    ][-30:]
    line_metrics = [
        LineMetricOut(line=line, **_with_defect_rate(values))
        for line, values in sorted(
            by_line.items(), key=lambda item: item[1]["output_qty"], reverse=True
        )
    ][:8]

    return ProductionMetricsOut(
        **_with_defect_rate(total),
        trend=trend,
        by_line=line_metrics,
    )


def _usage(db: DbDep, user: CurrentUser) -> UsageOut | None:
    tenant = db.get(Tenant, user.tenant_id)
    if tenant is None:
        return None
    usage = {metric: get_used(db, tenant.id, metric) for metric in ALL_METRICS}
    limits = {metric: limit_for(tenant.plan, metric) for metric in ALL_METRICS}
    return UsageOut(
        plan=_plan_out(tenant.plan).model_dump(),
        period=period_key(),
        usage=usage,
        limits=limits,
        estimated_minutes_saved=estimate_minutes_saved(usage),
    )


def _breakdown(counts: Counter) -> list[BreakdownOut]:
    return [
        BreakdownOut(
            key=str(key),
            label=str(key).replace("_", " ").title(),
            count=count,
            tone=STATUS_TONES.get(str(key), "neutral"),
        )
        for key, count in counts.most_common()
        if count > 0
    ]


def _assessment_item_counts(items: list[AssessmentItem]) -> dict[uuid.UUID, dict[str, int]]:
    by_assessment: dict[uuid.UUID, list[AssessmentItem]] = defaultdict(list)
    for item in items:
        by_assessment[item.assessment_id].append(item)
    return {assessment_id: _counts(group) for assessment_id, group in by_assessment.items()}


def _document_out(doc: Document) -> DocumentOut:
    return DocumentOut(
        id=doc.id,
        filename=doc.filename,
        doc_type=doc.doc_type,
        department=doc.department,
        language=doc.language,
        status=doc.status,
        page_count=doc.page_count,
        error=doc.error,
        created_at=doc.created_at,
    )


def _table_out(table: TableSource) -> TableOut:
    return TableOut(
        id=table.id,
        name=table.name,
        sheet_name=table.sheet_name,
        columns=table.columns,
        row_count=table.row_count,
    )


def _metric_bucket() -> dict[str, int]:
    return {"output_qty": 0, "target_qty": 0, "defects": 0, "downtime_min": 0}


def _with_defect_rate(values: dict[str, int]) -> dict[str, int | float]:
    output = values["output_qty"]
    return {
        **values,
        "defect_rate": round((values["defects"] / output) * 100, 2) if output > 0 else 0,
    }


def _number(row: dict[str, Any], *keys: str) -> int:
    normalized = {_normalize(key): value for key, value in row.items()}
    for key in keys:
        value = normalized.get(_normalize(key))
        if value is None:
            continue
        try:
            return int(float(str(value).replace(",", "")))
        except ValueError:
            continue
    return 0


def _text(row: dict[str, Any], key: str) -> str:
    normalized = {_normalize(name): value for name, value in row.items()}
    value = normalized.get(_normalize(key))
    return str(value).strip() if value is not None else ""


def _date_key(row: dict[str, Any]) -> str:
    for key in ("date", "production_date", "day"):
        raw = _text(row, key)
        if raw:
            return raw[:10]
    return ""


def _row_in_window(row: dict[str, Any], since: datetime) -> bool:
    date_key = _date_key(row)
    if not date_key:
        return True
    try:
        return datetime.fromisoformat(date_key).replace(tzinfo=UTC) >= since
    except ValueError:
        return True


def _in_window(value: datetime, since: datetime) -> bool:
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value >= since


def _normalize(value: str) -> str:
    return value.lower().strip().replace(" ", "_").replace("-", "_")
