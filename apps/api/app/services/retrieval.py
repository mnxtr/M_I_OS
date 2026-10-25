import uuid
from dataclasses import dataclass, replace

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


def reciprocal_rank_fuse(
    result_lists: list[list[RetrievedChunk]], top_k: int, rank_constant: int = 60
) -> list[RetrievedChunk]:
    """Fuse independent ranked lists fairly; do not carry ranks between modalities."""
    scores: dict[uuid.UUID, float] = {}
    first_seen: dict[uuid.UUID, RetrievedChunk] = {}
    for ranking in result_lists:
        seen_in_ranking: set[uuid.UUID] = set()
        for rank, item in enumerate(ranking, start=1):
            if item.chunk_id in seen_in_ranking:
                continue
            seen_in_ranking.add(item.chunk_id)
            first_seen.setdefault(item.chunk_id, item)
            scores[item.chunk_id] = scores.get(item.chunk_id, 0.0) + 1.0 / (
                rank_constant + rank
            )

    ordered = sorted(scores, key=lambda chunk_id: (-scores[chunk_id], str(chunk_id)))
    return [
        replace(first_seen[chunk_id], score=scores[chunk_id])
        for chunk_id in ordered[:top_k]
    ]


def hybrid_search(
    db: Session,
    question: str,
    top_k: int | None = None,
    variants: list[str] | None = None,
    *,
    tenant_id: uuid.UUID,
) -> list[RetrievedChunk]:
    """Hybrid RRF search with mandatory tenant scoping and ready-document filtering.

    The verified caller supplies tenant_id. Tenant filters are enforced in SQL
    in addition to transaction RLS, including when the DB connection is privileged.
    Do not accept a tenant id from a browser request body.
    """
    settings = get_settings()
    k = top_k or settings.retrieve_top_k
    query_variants = list(
        dict.fromkeys(v.strip() for v in (variants or [question]) if v and v.strip())
    )[:3]
    if not query_variants:
        return []

    dense_sql = text(
        """
        SELECT c.id, c.document_id, d.filename AS document_name,
               c.page, c.chunk_index, c.content,
               1 - (c.embedding <=> CAST(:vec AS vector)) AS score
        FROM chunks c JOIN documents d ON d.id = c.document_id
        WHERE c.tenant_id = CAST(:tenant_id AS uuid)
          AND d.tenant_id = CAST(:tenant_id AS uuid)
          AND d.status = 'ready'
          AND c.embedding IS NOT NULL
        ORDER BY c.embedding <=> CAST(:vec AS vector)
        LIMIT :k
        """
    )
    keyword_sql = text(
        """
        SELECT c.id, c.document_id, d.filename AS document_name,
               c.page, c.chunk_index, c.content,
               ts_rank(c.content_tsv, websearch_to_tsquery('simple', :q)) AS score
        FROM chunks c JOIN documents d ON d.id = c.document_id
        WHERE c.tenant_id = CAST(:tenant_id AS uuid)
          AND d.tenant_id = CAST(:tenant_id AS uuid)
          AND d.status = 'ready'
          AND c.content_tsv @@ websearch_to_tsquery('simple', :q)
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

    rankings: list[list[RetrievedChunk]] = []
    for variant in query_variants:
        vector_literal = "[" + ",".join(f"{x:.6f}" for x in embed_texts([variant])[0]) + "]"
        rankings.append(
            run(dense_sql, {"vec": vector_literal, "k": k * 2, "tenant_id": str(tenant_id)})
        )
        rankings.append(
            run(keyword_sql, {"q": variant, "k": k * 2, "tenant_id": str(tenant_id)})
        )

    return reciprocal_rank_fuse(rankings, k)
