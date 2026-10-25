"""Memory-safe ingestion tests independent of a production database."""

import asyncio
import io
import uuid
from types import SimpleNamespace

import pytest
from fastapi import BackgroundTasks, HTTPException, UploadFile

from app.routers import connectors, documents


def _upload(payload: bytes) -> UploadFile:
    return UploadFile(filename="sample.csv", file=io.BytesIO(payload))


def test_upload_accepts_exact_size_limit():
    assert documents.read_upload_content(_upload(b"12345"), 5) == b"12345"


def test_upload_rejects_payload_larger_than_limit():
    with pytest.raises(HTTPException) as caught:
        documents.read_upload_content(_upload(b"123456"), 5)
    assert caught.value.status_code == 413


def test_upload_rejects_empty_file():
    with pytest.raises(HTTPException) as caught:
        documents.read_upload_content(_upload(b""), 5)
    assert caught.value.status_code == 422


def test_shared_document_store_enforces_limit_before_io(monkeypatch):
    monkeypatch.setattr(
        documents, "get_settings", lambda: SimpleNamespace(max_upload_bytes=4)
    )
    with pytest.raises(HTTPException) as caught:
        documents.create_and_store_document(
            db=None,
            background=None,
            tenant_id=uuid.uuid4(),
            uploaded_by=None,
            filename="sample.csv",
            content=b"12345",
        )
    assert caught.value.status_code == 413


def test_inbound_email_stream_is_bounded(monkeypatch):
    monkeypatch.setattr(
        "app.config.get_settings", lambda: SimpleNamespace(max_upload_bytes=4)
    )

    class FakeRequest:
        async def stream(self):
            yield b"123"
            yield b"456"

    class FakeQuery:
        def filter(self, _expression):
            return self

        def one_or_none(self):
            return SimpleNamespace(id=uuid.uuid4())

    class FakeDB:
        def query(self, _model):
            return FakeQuery()

    with pytest.raises(HTTPException) as caught:
        asyncio.run(
            connectors.email_inbound(
                FakeRequest(), BackgroundTasks(), FakeDB(), x_mios_secret="test-key"
            )
        )
    assert caught.value.status_code == 413
