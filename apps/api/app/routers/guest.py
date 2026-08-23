import secrets
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.db import set_tenant
from app.deps import CurrentUser, DbDep
from app.models import Document, GuestToken

router = APIRouter(tags=["guest"])


class GuestTokenIn(BaseModel):
    label: str = Field(default="", max_length=200)
    valid_days: int = Field(default=7, ge=1, le=90)
    scope_all_documents: bool = False
    document_ids: list[uuid.UUID] = Field(default_factory=list)


class GuestTokenOut(BaseModel):
    token: str
    label: str
    expires_at: str
    scope_all_documents: bool
    document_ids: list[str]


def _resolve_token(db, token: str) -> GuestToken:
    guest_token = db.get(GuestToken, token)
    if guest_token is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Invalid guest link")
    if guest_token.expires_at < datetime.now(UTC):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Guest link expired")
    return guest_token


def _token_out(guest_token: GuestToken) -> GuestTokenOut:
    return GuestTokenOut(
        token=guest_token.token,
        label=guest_token.label,
        expires_at=guest_token.expires_at.isoformat(),
        scope_all_documents=guest_token.scope_all_documents,
        document_ids=guest_token.document_ids,
    )


@router.post("/v1/guest-tokens", response_model=GuestTokenOut, status_code=status.HTTP_201_CREATED)
def create_guest_token(payload: GuestTokenIn, user: CurrentUser, db: DbDep) -> GuestTokenOut:
    if not payload.scope_all_documents and not payload.document_ids:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Provide document_ids or set scope_all_documents",
        )
    token = secrets.token_urlsafe(24)
    guest_token = GuestToken(
        token=token,
        tenant_id=user.tenant_id,
        label=payload.label,
        scope_all_documents=payload.scope_all_documents,
        document_ids=[str(doc_id) for doc_id in payload.document_ids],
        expires_at=datetime.now(UTC) + timedelta(days=payload.valid_days),
        created_by=user.id,
    )
    db.add(guest_token)
    db.flush()
    return _token_out(guest_token)


@router.delete("/v1/guest-tokens/{token}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_guest_token(token: str, user: CurrentUser, db: DbDep) -> None:
    guest_token = db.get(GuestToken, token)
    if guest_token is None or guest_token.tenant_id != user.tenant_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Guest link not found")
    db.delete(guest_token)


@router.get("/v1/guest/documents")
def guest_list_documents(token: str = Query(min_length=1), db: DbDep = None) -> list[dict]:
    guest_token = _resolve_token(db, token)
    set_tenant(db, guest_token.tenant_id)

    query = select(Document).where(Document.status == "ready")
    if not guest_token.scope_all_documents:
        allowed = [uuid.UUID(doc_id) for doc_id in guest_token.document_ids]
        if not allowed:
            return []
        query = query.where(Document.id.in_(allowed))
    documents = list(db.scalars(query.order_by(Document.created_at.desc())).all())
    return [
        {
            "id": str(document.id),
            "filename": document.filename,
            "doc_type": document.doc_type,
            "department": document.department,
            "page_count": document.page_count,
            "created_at": document.created_at.isoformat(),
        }
        for document in documents
    ]


@router.get("/v1/guest/documents/{document_id}")
def guest_download(
    document_id: uuid.UUID,
    token: str = Query(min_length=1),
    db: DbDep = None,
) -> FileResponse:
    guest_token = _resolve_token(db, token)
    set_tenant(db, guest_token.tenant_id)

    if not guest_token.scope_all_documents and str(document_id) not in guest_token.document_ids:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Document not in guest scope")
    document = db.get(Document, document_id)
    if document is None or document.status != "ready":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found")

    path = Path(document.storage_path)
    if not path.exists():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "File missing from storage")
    return FileResponse(path, filename=document.filename)
