import io
import json
import uuid
import zipfile
from datetime import UTC, datetime
from pathlib import Path

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session as DBSession

from app.deps import CurrentUser, DbDep
from app.models import Assessment, AssessmentItem, ChecklistTemplate, Document
from app.schemas import Citation
from app.services.compliance_seed import ITEM_STATUSES
from app.services.copilot import (
    build_cap_prompt,
    ensure_templates_seeded,
    fallback_cap,
    judge_item,
)
from app.services.llm import COMPLIANCE_SYSTEM_PROMPT, complete, llm_configured

router = APIRouter(prefix="/v1/compliance", tags=["compliance"])


class TemplateOut(BaseModel):
    code: str
    name: str
    version: int
    description: str
    item_count: int


class AssessmentCreateIn(BaseModel):
    template_code: str = Field(min_length=1, max_length=100)
    title: str = Field(min_length=1, max_length=300)
    due_date: str = Field(default="", max_length=20)


class AssessmentOut(BaseModel):
    id: str
    title: str
    template_code: str
    due_date: str
    status: str
    created_at: str
    counts: dict[str, int]


class ItemOut(BaseModel):
    id: str
    ref: str
    category: str
    title: str
    guidance: str
    status: str
    manually_set: bool
    ai_notes: str
    cap_text: str
    evidence: list[Citation]


def _get_assessment(db: DBSession, user: CurrentUser, assessment_id: uuid.UUID) -> Assessment:
    assessment = db.get(Assessment, assessment_id)
    if assessment is None or assessment.tenant_id != user.tenant_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Assessment not found")
    return assessment


def _counts(items: list[AssessmentItem]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for item in items:
        counts[item.status] = counts.get(item.status, 0) + 1
    return counts


@router.get("/templates", response_model=list[TemplateOut])
def list_templates(user: CurrentUser, db: DbDep) -> list[TemplateOut]:
    ensure_templates_seeded(db)
    templates = db.query(ChecklistTemplate).order_by(ChecklistTemplate.code).all()
    return [
        TemplateOut(
            code=t.code,
            name=t.name,
            version=t.version,
            description=t.description,
            item_count=len(t.items),
        )
        for t in templates
    ]


@router.post("/assessments", response_model=AssessmentOut, status_code=status.HTTP_201_CREATED)
def create_assessment(payload: AssessmentCreateIn, user: CurrentUser, db: DbDep) -> AssessmentOut:
    ensure_templates_seeded(db)
    template = db.query(ChecklistTemplate).filter_by(code=payload.template_code).first()
    if template is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Unknown template {payload.template_code}")

    assessment = Assessment(
        tenant_id=user.tenant_id,
        template_code=template.code,
        title=payload.title,
        due_date=payload.due_date,
        status="pending",
    )
    db.add(assessment)
    db.flush()

    for pack_item in template.items:
        db.add(
            AssessmentItem(
                assessment_id=assessment.id,
                tenant_id=user.tenant_id,
                ref=pack_item["ref"],
                category=pack_item["category"],
                title=pack_item["title"],
                guidance=pack_item.get("guidance", ""),
            )
        )
    db.flush()
    items = _items_of(db, assessment.id)
    return _assessment_out(assessment, items)


def _items_of(db: DBSession, assessment_id: uuid.UUID) -> list[AssessmentItem]:
    return list(
        db.query(AssessmentItem)
        .filter_by(assessment_id=assessment_id)
        .order_by(AssessmentItem.ref)
        .all()
    )


def _assessment_out(assessment: Assessment, items: list[AssessmentItem]) -> AssessmentOut:
    return AssessmentOut(
        id=str(assessment.id),
        title=assessment.title,
        template_code=assessment.template_code,
        due_date=assessment.due_date,
        status=assessment.status,
        created_at=assessment.created_at.isoformat(),
        counts=_counts(items),
    )


@router.get("/assessments", response_model=list[AssessmentOut])
def list_assessments(user: CurrentUser, db: DbDep) -> list[AssessmentOut]:
    assessments = db.query(Assessment).order_by(Assessment.created_at.desc()).limit(50).all()
    out = []
    for assessment in assessments:
        items = _items_of(db, assessment.id)
        out.append(_assessment_out(assessment, items))
    return out


@router.get("/assessments/{assessment_id}", response_model=list[ItemOut])
def get_assessment_items(assessment_id: uuid.UUID, user: CurrentUser, db: DbDep) -> list[ItemOut]:
    assessment = _get_assessment(db, user, assessment_id)
    return [
        ItemOut(
            id=str(item.id),
            ref=item.ref,
            category=item.category,
            title=item.title,
            guidance=item.guidance,
            status=item.status,
            manually_set=item.manually_set,
            ai_notes=item.ai_notes,
            cap_text=item.cap_text,
            evidence=[
                Citation(
                    document_id=e["document_id"],
                    document_name=e["document_name"],
                    page=e["page"],
                    chunk_index=0,
                    snippet=e["snippet"],
                )
                for e in item.evidence
            ],
        )
        for item in _items_of(db, assessment.id)
    ]


@router.post("/assessments/{assessment_id}/auto-assess")
def auto_assess(assessment_id: uuid.UUID, user: CurrentUser, db: DbDep) -> StreamingResponse:
    """Stream per-item verdicts as they are computed."""
    assessment = _get_assessment(db, user, assessment_id)
    items = [i for i in _items_of(db, assessment.id) if not i.manually_set]
    assessment.status = "running"

    def sse(data: dict) -> str:
        return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"

    async def event_stream():
        yield sse({"type": "start", "total": len(items)})
        for item in items:
            try:
                async for event in judge_item(db, item):
                    yield sse(event)
            except Exception as exc:  # noqa: BLE001 — one bad item must not kill the run
                yield sse({"type": "error", "ref": item.ref, "detail": str(exc)[:200]})
            db.commit()
        remaining = _items_of(db, assessment.id)
        assessed = sum(1 for i in remaining if i.status != "pending")
        assessment.status = "complete" if assessed == len(remaining) else "partial"
        db.commit()
        yield sse({"type": "done", "status": assessment.status})

    return StreamingResponse(event_stream(), media_type="text/event-stream")


class ItemUpdateIn(BaseModel):
    status: str | None = None
    cap_text: str | None = None


@router.patch("/items/{item_id}", response_model=ItemOut)
def update_item(item_id: uuid.UUID, payload: ItemUpdateIn, user: CurrentUser, db: DbDep) -> ItemOut:
    item = db.get(AssessmentItem, item_id)
    if item is None or item.tenant_id != user.tenant_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Item not found")

    if payload.status is not None:
        if payload.status not in ITEM_STATUSES:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY, f"Invalid status {payload.status}"
            )
        item.status = payload.status
        item.manually_set = True
    if payload.cap_text is not None:
        item.cap_text = payload.cap_text[:8000]
    db.flush()
    return ItemOut(
        id=str(item.id),
        ref=item.ref,
        category=item.category,
        title=item.title,
        guidance=item.guidance,
        status=item.status,
        manually_set=item.manually_set,
        ai_notes=item.ai_notes,
        cap_text=item.cap_text,
        evidence=[],
    )


@router.post("/items/{item_id}/cap", response_model=ItemOut)
def draft_cap(item_id: uuid.UUID, user: CurrentUser, db: DbDep) -> ItemOut:
    item = db.get(AssessmentItem, item_id)
    if item is None or item.tenant_id != user.tenant_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Item not found")

    if llm_configured():
        try:
            item.cap_text = complete(
                COMPLIANCE_SYSTEM_PROMPT,
                build_cap_prompt(item),
                max_tokens=900,
            )[:8000]
        except Exception:  # noqa: BLE001
            item.cap_text = fallback_cap(item)
    else:
        item.cap_text = fallback_cap(item)
    db.flush()
    return ItemOut(
        id=str(item.id),
        ref=item.ref,
        category=item.category,
        title=item.title,
        guidance=item.guidance,
        status=item.status,
        manually_set=item.manually_set,
        ai_notes=item.ai_notes,
        cap_text=item.cap_text,
        evidence=[],
    )


@router.get("/assessments/{assessment_id}/binder")
def download_binder(assessment_id: uuid.UUID, user: CurrentUser, db: DbDep) -> Response:
    """Evidence binder: manifest markdown + cited source documents, zipped."""
    assessment = _get_assessment(db, user, assessment_id)
    items = _items_of(db, assessment.id)

    cited_doc_ids: set[str] = set()
    for item in items:
        for evidence_entry in item.evidence:
            cited_doc_ids.add(str(evidence_entry.get("document_id", "")))
    cited_doc_ids.discard("")

    documents = {
        str(doc.id): doc
        for doc in db.query(Document).filter(Document.id.in_(cited_doc_ids)).all()
        if doc.tenant_id == user.tenant_id
    }

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as bundle:
        bundle.writestr("manifest.md", build_manifest(assessment, items))
        for doc_id, document in documents.items():
            source_path = Path(document.storage_path)
            if source_path.exists():
                bundle.write(source_path, f"evidence/{doc_id}_{document.filename}")
    return Response(
        content=buffer.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="binder-{assessment.id}.zip"'},
    )


def build_manifest(assessment: Assessment, items: list[AssessmentItem]) -> str:
    lines = [
        f"# Evidence Binder — {assessment.title}",
        f"Template: {assessment.template_code}",
        f"Due date: {assessment.due_date or '—'}",
        f"Generated: {datetime.now(UTC).isoformat(timespec='seconds')}",
        "",
        "| Ref | Category | Requirement | Status | Notes |",
        "|---|---|---|---|---|",
    ]
    for item in items:
        title = item.title.replace("|", "/")
        notes = (item.ai_notes or "").replace("|", "/").replace("\n", " ")[:120]
        lines.append(f"| {item.ref} | {item.category} | {title} | {item.status} | {notes} |")

    lines.append("")
    for item in items:
        if not item.evidence and not item.cap_text:
            continue
        lines.append(f"## [{item.ref}] {item.title}")
        lines.append(f"Status: **{item.status}**{' (manual)' if item.manually_set else ''}")
        for evidence_entry in item.evidence:
            lines.append(
                f"- Evidence: {evidence_entry['document_name']} p.{evidence_entry['page']} — "
                f'"{evidence_entry["snippet"][:200]}"'
            )
        if item.cap_text:
            lines.append("\n### Corrective Action Plan\n")
            lines.append(item.cap_text)
        lines.append("")
    return "\n".join(lines)
