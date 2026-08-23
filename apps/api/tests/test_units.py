from app.routers.documents import chunk_text
from app.services.embeddings import embed_texts
from app.services.llm import _extractive_fallback


def test_chunk_text_respects_size_and_overlap():
    text = "\n".join(f"line {i} " + "x" * 40 for i in range(100))
    chunks = chunk_text(text, size=1200, overlap=150)
    assert len(chunks) > 1
    assert all(len(c) <= 1200 for c in chunks)
    assert all(c.strip() for c in chunks)


def test_chunk_text_empty():
    assert chunk_text("", 100, 10) == []
    assert chunk_text("   \n  ", 100, 10) == []


def test_embed_texts_deterministic_and_normalized():
    a = embed_texts(["hello factory world"])[0]
    b = embed_texts(["hello factory world"])[0]
    c = embed_texts(["completely different audit report"])[0]
    assert a == b
    assert len(a) == 384
    norm = sum(x * x for x in a) ** 0.5
    assert abs(norm - 1.0) < 1e-6
    assert a != c


def test_embed_empty_list():
    assert embed_texts([]) == []


def test_extractive_fallback_cites_sources():
    contexts = [{"document_name": "sop.pdf", "page": 3, "content": "Line 7 efficiency was 62%."}]
    answer = _extractive_fallback(contexts)
    assert "[doc:sop.pdf p.3]" in answer
    assert "62%" in answer


def test_extractive_fallback_no_context():
    answer = _extractive_fallback([])
    assert "couldn't find" in answer.lower()
