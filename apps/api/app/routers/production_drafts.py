"""One private, versioned workbench draft per verified user and tenant."""

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select, text, update
from sqlalchemy.exc import IntegrityError

from app.config import get_settings
from app.deps import CurrentUser, DbDep
from app.models import ProductionDraft, utcnow
from app.routers.operations import GapRequest, Observation

router = APIRouter(prefix="/v1/operations/draft", tags=["production drafts"])


class DraftPayload(GapRequest):
    model_config = ConfigDict(extra="forbid")
    observations: Annotated[list[Observation], Field(max_length=500)]


class SaveDraft(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expected_revision: int = Field(ge=0, le=2147483646)
    payload: DraftPayload


class DraftOut(BaseModel):
    revision: int
    payload: DraftPayload
    updated_at: datetime


def prepare(db, user, response):
    if not get_settings().production_drafts_enabled:
        raise HTTPException(503, "Production draft storage is not enabled")
    response.headers["Cache-Control"] = "private, no-store"
    # Tenant context is set by authentication. Add the verified user, never a body parameter.
    if db.get_bind().dialect.name == "postgresql":
        db.execute(text("SELECT set_config('app.user_id', :uid, true)"), {"uid": str(user.id)})


def owned(user):
    return (
        ProductionDraft.tenant_id == user.tenant_id,
        ProductionDraft.user_id == user.id,
    )


@router.get("", response_model=DraftOut | None)
def get_draft(user: CurrentUser, db: DbDep, response: Response):
    prepare(db, user, response)
    row = db.scalar(select(ProductionDraft).where(*owned(user)))
    if row is None:
        return None
    return DraftOut(revision=row.revision, payload=row.payload, updated_at=row.updated_at)


@router.post("", response_model=DraftOut)
def save_draft(payload: SaveDraft, user: CurrentUser, db: DbDep, response: Response):
    prepare(db, user, response)
    now = utcnow()
    data = payload.payload.model_dump(mode="json")
    revision = payload.expected_revision + 1
    if payload.expected_revision == 0:
        db.add(
            ProductionDraft(
                tenant_id=user.tenant_id,
                user_id=user.id,
                revision=revision,
                payload=data,
                updated_at=now,
            )
        )
    else:
        # A single conditional UPDATE prevents lost updates, including concurrent tabs.
        changed = db.execute(
            update(ProductionDraft)
            .where(
                *owned(user),
                ProductionDraft.revision == payload.expected_revision,
            )
            .values(revision=revision, payload=data, updated_at=now)
        ).rowcount
        if changed != 1:
            raise HTTPException(409, "Draft changed elsewhere. Review the saved version first.")
    try:
        # Do not acknowledge a save until the transaction is durable.
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "A saved draft already exists. Review it before saving.") from None
    return DraftOut(revision=revision, payload=data, updated_at=now)
