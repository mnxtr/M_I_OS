import uuid
from dataclasses import dataclass

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import get_settings
from app.services.embeddings import embed_texts


@dataclass
class RetrievedChunk:
    chunk_id: uuid.UUID
    document_id: uuid.UUID
    document_name: str
    page: int
    chunk_index: int
    content: str
    score: float


def hybrid_search(
    db: Session, question: str, top_k: int | None = None, variants: list[str] | None = None
) -> list[RetrievedChunk]:
    """Dense (pgvector cosine) + keyword (tsvector) with reciprocal rank fusion.
    Searches every query variant (e.g. Banglish → English expansion) and fuses.
    Tenant isolation comes from the RLS policy set on the session."""
    settings = get_settings()
    k = top_k or settings.retrieve_top_k
    query_variants = variants or [question]
    query_variants = [v for v in query_variants if v and v.strip()][:3]

    dense_sql = text(
        """
        SELECT c.id, c.document_id, d.filename AS document_name,
               c.page, c.chunk_index, c.content,
               1 - (c.embedding <=> :vec::vector) AS score
        FROM chunks c JOIN documents d ON d.id = c.document_id
        WHERE c.embedding IS NOT NULL
        ORDER BY c.embedding <=> :vec::vector
        LIMIT :k
        """
    )
    keyword_sql = text(
        """
        SELECT c.id, c.document_id, d.filename AS document_name,
               c.page, c.chunk_index, c.content,
               ts_rank(c.content_tsv, websearch_to_tsquery('simple', :q)) AS score
        FROM chunks c JOIN documents d ON d.id = c.document_id
        WHERE c.content_tsv @@ websearch_to_tsquery('simple', :q)
        ORDER BY score DESC
        LIMIT :k
        """
    )

    def run(sql, params):
        rows = db.execute(sql, params).mappings().all()
        return [
            RetrievedChunk(
                chunk_id=r["id"],
                document_id=r["document_id"],
                document_name=r["document_name"],
                page=r["page"],
                chunk_index=r["chunk_index"],
                content=r["content"],
                score=float(r["score"]),
            )
            for r in rows
        ]

    dense: list[RetrievedChunk] = []
    keyword: list[RetrievedChunk] = []
    for variant in query_variants:
        vector_literal = "[" + ",".join(f"{x:.6f}" for x in embed_texts([variant])[0]) + "]"
        dense.extend(run(dense_sql, {"vec": vector_literal, "k": k * 2}))
        keyword.extend(run(keyword_sql, {"q": variant, "k": k * 2}))

    fused: dict[uuid.UUID, tuple[float, RetrievedChunk]] = {}
    for rank, item in enumerate(dense + keyword):
        weight = 1.0 / (60 + rank)
        prev_score = fused[item.chunk_id][0] if item.chunk_id in fused else 0.0
        fused[item.chunk_id] = (prev_score + weight, item)

    ranked = sorted(fused.values(), key=lambda pair: pair[0], reverse=True)
    return [item for _, item in ranked[:k]]
