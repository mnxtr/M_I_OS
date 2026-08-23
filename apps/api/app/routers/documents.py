import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, HTTPException, UploadFile, status
from pypdf import PdfReader
from sqlalchemy import select

from app.config import get_settings
from app.deps import CurrentUser, DbDep
from app.models import Chunk, Document
from app.schemas import DocumentOut
from app.services.embeddings import embed_texts

router = APIRouter(prefix="/v1/documents", tags=["documents"])

ALLOWED_EXTENSIONS = {".pdf", ".txt", ".md"}


def _extract_pdf_pages(path: Path) -> list[str]:
    reader = PdfReader(str(path))
    return [(page.extract_text() or "") for page in reader.pages]


def _extract_text(path: Path) -> list[str]:
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        return _extract_pdf_pages(path)
    return [path.read_text(encoding="utf-8", errors="replace")]


def chunk_text(text: str, size: int, overlap: int) -> list[str]:
    text = text.strip()
    if not text:
        return []
    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = min(start + size, len(text))
        if end < len(text):
            boundary = text.rfind("\n", start + int(size * 0.7), end)
            if boundary > start:
                end = boundary
        chunks.append(text[start:end].strip())
        start = max(end - overlap, start + 1)
    return [c for c in chunks if c]


def process_document(document_id: uuid.UUID) -> None:
    from app.db import SessionLocal, set_tenant

    settings = get_settings()
    db = SessionLocal()
    try:
        document = db.get(Document, document_id)
        if document is None:
            return
        set_tenant(db, document.tenant_id)
        try:
            pages = _extract_text(Path(document.storage_path))
            full_chunks: list[tuple[int, str]] = []
            for page_no, page_text in enumerate(pages, start=1):
                for piece in chunk_text(page_text, settings.chunk_size, settings.chunk_overlap):
                    full_chunks.append((page_no, piece))
            if not full_chunks:
                document.status = "failed"
                document.error = "No extractable text found"
                return

            embeddings = embed_texts([c[1] for c in full_chunks])
            rows = [
                Chunk(
                    tenant_id=document.tenant_id,
                    document_id=document.id,
                    chunk_index=i,
                    page=page_no,
                    content=piece,
                    embedding_dim=len(embeddings[i]),
                    meta={"filename": document.filename},
                )
                for i, (page_no, piece) in enumerate(full_chunks)
            ]
            db.add_all(rows)
            db.flush()
            for row, vector in zip(rows, embeddings, strict=False):
                save_vector(db, row.id, vector)
            document.page_count = len(pages)
            document.status = "ready"
        except Exception as exc:  # noqa: BLE001
            document.status = "failed"
            document.error = str(exc)[:2000]
    finally:
        db.commit()
        db.close()


def save_vector(db, chunk_id: uuid.UUID, vector: list[float]) -> None:
    from app.config import get_settings as s

    literal = "[" + ",".join(f"{x:.6f}" for x in vector) + "]"
    db.execute(
        text_update_vector(),
        {"cid": str(chunk_id), "vec": literal, "dim": s().embedding_dim},
    )


def text_update_vector():
    from sqlalchemy import text

    return text("UPDATE chunks SET embedding = :vec::vector, embedding_dim = :dim WHERE id = :cid")


@router.post("", response_model=DocumentOut, status_code=status.HTTP_202_ACCEPTED)
def upload(
    background: BackgroundTasks,
    file: UploadFile,
    user: CurrentUser,
    db: DbDep,
    doc_type: str = "other",
    department: str = "general",
) -> Document:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            f"Unsupported file type {suffix}. Allowed: {sorted(ALLOWED_EXTENSIONS)}",
        )

    storage_root = Path(get_settings().storage_dir) / str(user.tenant_id)
    storage_root.mkdir(parents=True, exist_ok=True)
    doc_id = uuid.uuid4()
    dest = storage_root / f"{doc_id}{suffix}"
    with dest.open("wb") as out:
        shutil.copyfileobj(file.file, out)

    document = Document(
        id=doc_id,
        tenant_id=user.tenant_id,
        uploaded_by=user.id,
        filename=file.filename or dest.name,
        doc_type=doc_type,
        department=department,
        status="processing",
        storage_path=str(dest),
    )
    db.add(document)
    db.flush()
    background.add_task(process_document, doc_id)
    return document


@router.get("", response_model=list[DocumentOut])
def list_documents(user: CurrentUser, db: DbDep) -> list[Document]:
    return list(db.scalars(select(Document).order_by(Document.created_at.desc()).limit(200)))
