"""Unified Linora RAG contract: verified tenancy, evidence abstention, safe source selection."""

import asyncio
import uuid
from types import SimpleNamespace

import pytest

from app.routers import chat
from app.schemas import ChatIn
from app.services import llm, retrieval


def test_hybrid_search_scopes_every_query_to_verified_tenant(monkeypatch):
    tenant_id = uuid.uuid4()
    executed = []

    class FakeRows:
        def mappings(self):
            return self

        def all(self):
            return []

    class FakeDB:
        def execute(self, statement, params):
            compiled = str(statement)
            assert "c.tenant_id = CAST(:tenant_id AS uuid)" in compiled
            assert "d.tenant_id = CAST(:tenant_id AS uuid)" in compiled
            assert "d.status = 'ready'" in compiled
            assert params["tenant_id"] == str(tenant_id)
            executed.append(params)
            return FakeRows()

    monkeypatch.setattr(retrieval, "embed_texts", lambda _texts: [[0.1, 0.2]])
    monkeypatch.setattr(retrieval, "get_settings", lambda: SimpleNamespace(retrieve_top_k=8))

    result = retrieval.hybrid_search(FakeDB(), "machine downtime", tenant_id=tenant_id)
    assert result == []
    assert len(executed) == 2  # pgvector and keyword queries


def test_hybrid_search_requires_a_tenant_id():
    with pytest.raises(TypeError, match="tenant_id"):
        retrieval.hybrid_search(None, "machine downtime")


def test_chat_uses_authenticated_tenant_not_request_data(monkeypatch):
    tenant_id = uuid.uuid4()
    seen = {}
    monkeypatch.setattr(chat, "_meter_chat", lambda db, user: None)

    def retrieve(db, question, top_k, *, variants, tenant_id):
        seen["tenant_id"] = tenant_id
        seen["question"] = question
        return []

    monkeypatch.setattr(chat, "hybrid_search", retrieve)
    monkeypatch.setattr(
        chat, "generate_answer", lambda question, contexts: ("No data", "no-evidence")
    )
    user = SimpleNamespace(tenant_id=tenant_id)
    result = chat.chat(ChatIn(question="Line 7 downtime?"), user, db=object())
    assert result.citations == []
    assert result.answer == "No data"
    assert seen["tenant_id"] == tenant_id
    assert seen["question"] == "Line 7 downtime?"


def test_no_context_never_calls_llm(monkeypatch):
    monkeypatch.setattr(
        llm, "llm_configured",
        lambda: pytest.fail("LLM must not be called without supporting chunks"),
    )
    answer, provider = llm.generate_answer("Did the factory pass the fire audit?", [])
    assert provider == "no-evidence"
    assert "couldn't find supporting evidence" in answer

    async def collect():
        return [token async for token in llm.stream_answer("fire audit?", [])]

    tokens = asyncio.run(collect())
    assert len(tokens) == 1
    assert "couldn't find supporting evidence" in tokens[0]


def test_no_evidence_follows_bangla_language():
    text = llm._no_evidence_answer("লাইন ৭ এর আউটপুট কত?")
    assert "নথিতে" in text
