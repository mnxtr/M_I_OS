"""Regression tests for SQLAlchemy parameter binding in pgvector statements."""

import uuid
from types import SimpleNamespace

from app.routers.documents import _set_chunk_embedding
from app.services import retrieval


class RecordingSession:
    def __init__(self):
        self.calls = []

    def execute(self, statement, params):
        compiled_params = statement.compile().params
        assert set(params).issubset(compiled_params), (
            f"Unbound SQL parameters: {set(params) - set(compiled_params)}"
        )
        self.calls.append((statement, params))
        return self

    def mappings(self):
        return self

    def all(self):
        return []


def test_chunk_embedding_update_binds_vector():
    session = RecordingSession()
    _set_chunk_embedding(session, uuid.uuid4(), [0.25, -0.5])
    assert len(session.calls) == 1
    assert session.calls[0][1]["vec"] == "[0.250000,-0.500000]"


def test_hybrid_retrieval_binds_vector_and_keyword_params(monkeypatch):
    monkeypatch.setattr(
        retrieval, "embed_texts", lambda values: [[0.1, 0.2] for _ in values]
    )
    monkeypatch.setattr(
        retrieval, "get_settings", lambda: SimpleNamespace(retrieve_top_k=5)
    )
    session = RecordingSession()
    assert retrieval.hybrid_search(session, "machine downtime", top_k=3) == []
    assert len(session.calls) == 2
    assert "vec" in session.calls[0][1]
    assert session.calls[1][1]["q"] == "machine downtime"
