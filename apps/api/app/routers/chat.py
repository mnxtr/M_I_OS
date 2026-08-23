from fastapi import APIRouter

from app.deps import CurrentUser, DbDep
from app.schemas import ChatIn, ChatOut, Citation
from app.services.llm import generate_answer
from app.services.retrieval import hybrid_search

router = APIRouter(prefix="/v1/chat", tags=["chat"])


@router.post("", response_model=ChatOut)
def chat(payload: ChatIn, user: CurrentUser, db: DbDep) -> ChatOut:
    chunks = hybrid_search(db, payload.question, payload.top_k)

    contexts = [
        {
            "document_name": c.document_name,
            "page": c.page,
            "content": c.content,
        }
        for c in chunks
    ]
    answer, provider = generate_answer(payload.question, contexts)

    citations = [
        Citation(
            document_id=c.document_id,
            document_name=c.document_name,
            page=c.page,
            chunk_index=c.chunk_index,
            snippet=c.content[:300],
        )
        for c in chunks
    ]
    return ChatOut(answer=answer, citations=citations, provider=provider)
