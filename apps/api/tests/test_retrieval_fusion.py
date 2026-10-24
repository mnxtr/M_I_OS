"""Regression tests for balanced dense/keyword reciprocal-rank fusion."""

import uuid
from types import SimpleNamespace

import pytest

from app.services import retrieval


def _chunk(number: int) -> retrieval.RetrievedChunk:
    identity = uuid.UUID(int=number)
    return retrieval.RetrievedChunk(
        chunk_id=identity,
        document_id=uuid.UUID(int=100 + number),
        document_name=f"document-{number}.pdf",
        page=1,
        chunk_index=0,
        content=f"sample-{number}",
        score=0.0,
    )


def test_fusion_gives_each_result_list_its_own_first_rank():
    first = _chunk(1)
    second = _chunk(2)
    results = retrieval.reciprocal_rank_fuse([[first], [second]], 2)
    assert [item.chunk_id for item in results] == [first.chunk_id, second.chunk_id]
    assert results[0].score == pytest.approx(1 / 61)
    assert results[1].score == pytest.approx(1 / 61)


def test_fusion_rewards_independent_dense_and_keyword_agreement():
    first = _chunk(1)
    shared = _chunk(2)
    third = _chunk(3)
    results = retrieval.reciprocal_rank_fuse(
        [[first, shared], [third, shared]], 3
    )
    assert results[0].chunk_id == shared.chunk_id
    assert results[0].score == pytest.approx(2 / 62)


def test_fusion_counts_duplicate_once_within_a_single_ranking():
    repeated = _chunk(4)
    results = retrieval.reciprocal_rank_fuse([[repeated, repeated]], 2)
    assert len(results) == 1
    assert results[0].score == pytest.approx(1 / 61)


def test_hybrid_search_keeps_rank_lists_separate(monkeypatch):
    monkeypatch.setattr(
        retrieval, "embed_texts", lambda texts: [[0.1, 0.2] for _ in texts]
    )
    monkeypatch.setattr(
        retrieval, "get_settings", lambda: SimpleNamespace(retrieve_top_k=3)
    )
    first = _chunk(1)
    second = _chunk(2)
    rankings = [[first], [second], [], []]

    class FakeResult:
        def __init__(self, rows):
            self.rows = rows

        def mappings(self):
            return self

        def all(self):
            return self.rows

    class FakeSession:
        def execute(self, _sql, _params):
            row = rankings.pop(0)
            return FakeResult([
                {
                    "id": c.chunk_id,
                    "document_id": c.document_id,
                    "filename": c.document_name,
                    "document_name": c.document_name,
                    "page": c.page,
                    "chunk_index": c.chunk_index,
                    "content": c.content,
                    "score": 1.0,
                }
                for c in row
            ])

    result = retrieval.hybrid_search(
        FakeSession(), "factory output", top_k=2, variants=["factory output", "output"]
    )
    assert len(result) == 2
    assert result[0].score == pytest.approx(result[1].score)
    assert rankings == []
