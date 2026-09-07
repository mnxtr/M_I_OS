"""Read-only knowledge readiness, always scoped to the authenticated tenant."""

import uuid
from datetime import UTC, datetime
from typing import Annotated, Literal

from fastapi import APIRouter, Query, Response
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func, select

from app.deps import CurrentUser, DbDep
from app.models import Document

router = APIRouter(prefix="/v1/dashboard", tags=["dashboard"])
DocumentStatus = Literal["ready", "processing", "failed"]


class SourceRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    filename: str
    status: DocumentStatus
    department: str
    created_at: datetime


class KnowledgeDashboard(BaseModel):
    fetched_at: datetime
    total: int
    counts: dict[DocumentStatus, int]
    ready_percent: float | None
    matched: int
    offset: int
    limit: int
    records: list[SourceRecord]


@router.get("/knowledge", response_model=KnowledgeDashboard)
def knowledge_dashboard(
    user: CurrentUser,
    db: DbDep,
    response: Response,
    status: DocumentStatus | None = None,
    offset: Annotated[int, Query(ge=0, le=100000)] = 0,
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
) -> KnowledgeDashboard:
    response.headers["Cache-Control"] = "private, no-store"
    # Explicit predicates remain essential even if a DB role can bypass RLS.
    tenant_filter = Document.tenant_id == user.tenant_id
    grouped = db.execute(
        select(Document.status, func.count(Document.id))
        .where(tenant_filter)
        .group_by(Document.status)
    ).all()
    counts = {name: 0 for name in ("ready", "processing", "failed")}
    counts.update(dict(grouped))
    total = sum(counts.values())
    query = select(Document).where(tenant_filter)
    if status is not None:
        query = query.where(Document.status == status)
    records = db.scalars(
        query.order_by(Document.created_at.desc(), Document.id.desc()).offset(offset).limit(limit)
    ).all()
    return KnowledgeDashboard(
        fetched_at=datetime.now(UTC),
        total=total,
        counts=counts,
        ready_percent=round(counts["ready"] * 100 / total, 1) if total else None,
        matched=counts[status] if status else total,
        offset=offset,
        limit=limit,
        records=[SourceRecord.model_validate(record) for record in records],
    )
