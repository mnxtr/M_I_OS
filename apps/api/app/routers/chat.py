import json
from collections.abc import AsyncIterator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.deps import CurrentUser, DbDep
from app.models import Tenant
from app.schemas import ChatIn, ChatOut, Citation
from app.services.brain import answer_question, build_metadata
from app.services.llm import stream_answer
from app.services.plans import METRIC_CHAT, enforce_quota, record_usage
from app.services.query_understanding import expand_query
from app.services.retrieval import hybrid_search

router = APIRouter(prefix="/v1/chat", tags=["chat"])


def _meter_chat(db, user: CurrentUser) -> None:
    tenant = db.get(Tenant, user.tenant_id)
    plan = tenant.plan if tenant else "trial"
    enforce_quota(db, user.tenant_id, plan, METRIC_CHAT)
    record_usage(db, user.tenant_id, METRIC_CHAT)


@router.post("", response_model=ChatOut)
def chat(payload: ChatIn, user: CurrentUser, db: DbDep) -> ChatOut:
    _meter_chat(db, user)
    analysis = expand_query(payload.question)
    chunks = hybrid_search(
        db, payload.question, payload.top_k, variants=analysis.variants
    )

    contexts = _contexts(chunks)
    result = answer_question(payload.question, contexts, payload.top_k)

    return ChatOut(
        answer=result.answer,
        citations=_citations(chunks),
        provider=result.provider,
        model=result.model,
        trace_id=result.trace_id,
        confidence=result.confidence,
        evidence_coverage=result.evidence_coverage,
        freshness=result.freshness,
        limitations=result.limitations,
        suggested_actions=result.suggested_actions,
        latency_ms=result.latency_ms,
    )


@router.post("/stream")
def chat_stream(payload: ChatIn, user: CurrentUser, db: DbDep) -> StreamingResponse:
    _meter_chat(db, user)
    analysis = expand_query(payload.question)
    chunks = hybrid_search(
        db, payload.question, payload.top_k, variants=analysis.variants
    )
    contexts = _contexts(chunks)
    citations_payload = [c.model_dump(mode="json") for c in _citations(chunks)]
    metadata = build_metadata(contexts, payload.top_k)

    def sse(event_type: str, data) -> str:
        return f"data: {json.dumps({'type': event_type, **data}, ensure_ascii=False)}\n\n"

    async def event_stream() -> AsyncIterator[str]:
        yield sse(
            "metadata",
            {
                "provider": metadata.provider,
                "model": metadata.model,
                "trace_id": metadata.trace_id,
                "confidence": metadata.confidence,
                "evidence_coverage": metadata.evidence_coverage,
                "freshness": metadata.freshness,
                "suggested_actions": metadata.suggested_actions,
            },
        )
        for citation in citations_payload:
            yield sse("citation", {"citation": citation})
        for limitation in metadata.limitations:
            yield sse("warning", {"message": limitation})
        async for token in stream_answer(payload.question, contexts):
            yield sse("token", {"value": token})
        yield sse("done", {"trace_id": metadata.trace_id})

    return StreamingResponse(event_stream(), media_type="text/event-stream")


def _citations(chunks) -> list[Citation]:
    return [
        Citation(
            document_id=c.document_id,
            document_name=c.document_name,
            page=c.page,
            chunk_index=c.chunk_index,
            snippet=c.content[:300],
        )
        for c in chunks
    ]


def _contexts(chunks) -> list[dict]:
    return [
        {
            "document_name": chunk.document_name,
            "page": chunk.page,
            "content": chunk.content,
            "score": chunk.score,
        }
        for chunk in chunks
    ]
