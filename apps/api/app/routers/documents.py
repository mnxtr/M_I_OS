import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy import text as sql_text

from app.config import get_settings
from app.deps import CurrentUser, DbDep
from app.models import Chunk, Document
from app.schemas import DocumentOut
from app.services import tabular
from app.services.embeddings import embed_texts
from app.services.ocr import OcrUnavailableError
from app.services.parsers import detect_parser, is_tabular_file

router = APIRouter(prefix="/v1/documents", tags=["documents"])

ALLOWED_EXTENSIONS = {
    ".pdf",
    ".txt",
    ".md",
    ".docx",
    ".xlsx",
    ".xlsm",
    ".csv",
    ".png",
    ".jpg",
    ".jpeg",
}


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


def _set_chunk_embedding(db, chunk_id: uuid.UUID, vector: list[float]) -> None:
    literal = "[" + ",".join(f"{x:.6f}" for x in vector) + "]"
    db.execute(
        sql_text(
            "UPDATE chunks SET embedding = :vec::vector, embedding_dim = :dim "
            "WHERE id = :cid"
        ),
        {"vec": literal, "dim": len(vector), "cid": str(chunk_id)},
    )


def _store_text_chunks(db, document: Document, pages: list[str]) -> int:
    settings = get_settings()
    pieces: list[tuple[int, str]] = []
    for page_no, page_content in enumerate(pages, start=1):
        for piece in chunk_text(page_content, settings.chunk_size, settings.chunk_overlap):
            pieces.append((page_no, piece))
    if not pieces:
        return 0

    embeddings = embed_texts([p[1] for p in pieces])
    rows = [
        Chunk(
            tenant_id=document.tenant_id,
            document_id=document.id,
            chunk_index=i,
            page=pieces[i][0],
            content=pieces[i][1],
            embedding_dim=len(embeddings[i]),
            meta={"filename": document.filename},
        )
        for i in range(len(pieces))
    ]
    db.add_all(rows)
    db.flush()
    for row, vector in zip(rows, embeddings, strict=True):
        _set_chunk_embedding(db, row.id, vector)
    return len(pages)


def _store_tables(db, document: Document) -> int:
    settings = get_settings()
    sheets = tabular.parse_spreadsheet(Path(document.storage_path))
    total_rows = 0
    for sheet in sheets:
        if not sheet["columns"] or not sheet["rows"]:
            continue
        source = tabular.store_table(
            db=db,
            tenant_id=document.tenant_id,
            document_id=document.id,
            table_name=sheet["name"],
            sheet_name=sheet["name"],
            columns=sheet["columns"],
            rows=sheet["rows"],
        )
        for summary in tabular.build_table_summary_chunks(source):
            summary_chunk = Chunk(
                tenant_id=document.tenant_id,
                document_id=document.id,
                chunk_index=total_rows,
                page=0,
                content=f"{summary}\nTable ID: {source.id}",
                embedding_dim=settings.embedding_dim,
                meta={"filename": document.filename, "table_source_id": str(source.id)},
            )
            db.add(summary_chunk)
            db.flush()
            vector = embed_texts([summary])[0]
            _set_chunk_embedding(db, summary_chunk.id, vector)
        total_rows += source.row_count
    return total_rows


def process_document(document_id: uuid.UUID) -> None:
    from app.db import SessionLocal, set_tenant

    db = SessionLocal()
    try:
        document = db.get(Document, document_id)
        if document is None:
            return
        set_tenant(db, document.tenant_id)
        try:
            path = Path(document.storage_path)
            if is_tabular_file(document.filename):
                stored_rows = _store_tables(db, document)
                document.page_count = 0
                document.status = "ready" if stored_rows > 0 else "failed"
                document.error = "" if stored_rows > 0 else "No data rows found in spreadsheet"
                return

            parser = detect_parser(path.suffix.lower())
            if parser is None:
                raise ValueError(f"No parser for {path.suffix}")
            parsed = parser(path)
            page_count = _store_text_chunks(db, document, parsed.pages)
            document.page_count = page_count
            document.status = "ready" if page_count > 0 else "failed"
            if page_count == 0:
                document.error = "No extractable text found"
        except OcrUnavailableError as exc:
            document.status = "failed"
            document.error = str(exc)[:2000]
        except Exception as exc:  # noqa: BLE001
            document.status = "failed"
            document.error = str(exc)[:2000]
    finally:
        db.commit()
        db.close()


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
        doc_type="data" if is_tabular_file(file.filename or "") else doc_type,
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
