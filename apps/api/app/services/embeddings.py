import hashlib
import math
import struct

from app.config import get_settings


def _hash_embed(text: str, dim: int) -> list[float]:
    """Deterministic feature-hashing embedding. Offline dev fallback —
    adequate for pipeline plumbing/tests; use a real multilingual model in prod."""
    vec = [0.0] * dim
    tokens = text.lower().split()
    for token in tokens:
        digest = hashlib.md5(token.encode()).digest()
        idx = struct.unpack("<I", digest[:4])[0] % dim
        sign = 1.0 if digest[4] % 2 == 0 else -1.0
        vec[idx] += sign
    norm = math.sqrt(sum(x * x for x in vec)) or 1.0
    return [x / norm for x in vec]


def _openai_embed(texts: list[str]) -> list[list[float]]:
    from openai import OpenAI

    settings = get_settings()
    client = OpenAI(api_key=settings.openai_api_key)
    response = client.embeddings.create(
        model="text-embedding-3-small", input=texts, dimensions=settings.embedding_dim
    )
    return [item.embedding for item in response.data]


def embed_texts(texts: list[str]) -> list[list[float]]:
    settings = get_settings()
    if not texts:
        return []
    if settings.embedding_provider == "openai" and settings.openai_api_key:
        out: list[list[float]] = []
        for i in range(0, len(texts), 96):
            out.extend(_openai_embed(texts[i : i + 96]))
        return out
    return [_hash_embed(t, settings.embedding_dim) for t in texts]
