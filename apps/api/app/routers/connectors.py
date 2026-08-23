import secrets

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, Request, status
from pydantic import BaseModel

from app.deps import CurrentUser, DbDep
from app.models import Document, Tenant
from app.routers.documents import create_and_store_document
from app.services.inbound_email import parse_raw_email, subject_to_doc_type
from app.services.plans import METRIC_PAGES  # noqa: F401 — pages metered inside processing

router = APIRouter(prefix="/v1/connectors", tags=["connectors"])


class ConnectorSecretOut(BaseModel):
    connector_secret: str


def _generate_secret() -> str:
    return secrets.token_urlsafe(32)


@router.get("/email/secret", response_model=ConnectorSecretOut)
def get_connector_secret(user: CurrentUser, db: DbDep) -> ConnectorSecretOut:
    tenant = db.get(Tenant, user.tenant_id)
    if tenant is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tenant not found")
    if not tenant.connector_secret:
        tenant.connector_secret = _generate_secret()
        db.flush()
    return ConnectorSecretOut(connector_secret=tenant.connector_secret)


@router.post("/email/secret", response_model=ConnectorSecretOut)
def rotate_connector_secret(user: CurrentUser, db: DbDep) -> ConnectorSecretOut:
    if user.role not in ("owner", "admin"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Owner or admin required")
    tenant = db.get(Tenant, user.tenant_id)
    if tenant is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tenant not found")
    tenant.connector_secret = _generate_secret()
    db.flush()
    return ConnectorSecretOut(connector_secret=tenant.connector_secret)


@router.post("/email/inbound", status_code=status.HTTP_202_ACCEPTED)
async def email_inbound(
    request: Request,
    background: BackgroundTasks,
    db: DbDep,
    x_mios_secret: str = Header(default=""),
) -> dict:
    """Webhook target for a per-tenant mailbox forwarding rule or IMAP poller.

    Body: raw RFC-822 email. Auth: X-MIOS-Secret header (tenant-scoped).
    Attachments with ingestible extensions become documents; everything else is skipped.
    """
    if not x_mios_secret:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing X-MIOS-Secret header")
    tenant = (
        db.query(Tenant).filter(Tenant.connector_secret == x_mios_secret).one_or_none()
    )
    if tenant is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid connector secret")

    raw = await request.body()
    if not raw:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, "Empty body — send raw MIME email"
        )

    inbound = parse_raw_email(raw)
    created: list[str] = []
    doc_type = subject_to_doc_type(inbound.subject)

    for attachment in inbound.ingestible_attachments:
        document: Document = create_and_store_document(
            db=db,
            background=background,
            tenant_id=tenant.id,
            uploaded_by=None,
            filename=attachment.filename,
            content=attachment.content,
            doc_type=doc_type,
        )
        created.append(str(document.id))

    return {
        "received": True,
        "from": inbound.sender,
        "subject": inbound.subject,
        "attachments_found": len(inbound.attachments),
        "documents_created": len(created),
        "document_ids": created,
    }
