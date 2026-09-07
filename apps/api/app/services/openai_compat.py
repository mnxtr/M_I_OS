"""Minimal OpenAI Chat Completions and embeddings adapter using HTTPX.

The API key remains server-only. Keeping this transport small avoids making the RAG
pipeline depend on an unpinned SDK while retaining streaming support.
"""

import json
from collections.abc import AsyncIterator

import httpx

from app.config import get_settings

CHAT_URL = "https://api.openai.com/v1/chat/completions"
EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings"


def _headers() -> dict[str, str]:
    key = get_settings().openai_api_key
    if not key:
        raise RuntimeError("OpenAI requires OPENAI_API_KEY")
    return {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}


def _chat_payload(system: str, prompt: str, max_tokens: int, streaming: bool) -> dict:
    settings = get_settings()
    return {
        "model": settings.openai_model,
        "stream": streaming,
        "max_tokens": min(max_tokens, 2000),
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
    }


def complete(system: str, prompt: str, max_tokens: int) -> str:
    response = httpx.post(
        CHAT_URL,
        headers=_headers(),
        json=_chat_payload(system, prompt, max_tokens, False),
        timeout=45,
    )
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"] or ""


async def stream(system: str, prompt: str, max_tokens: int) -> AsyncIterator[str]:
    complete_frame = False
    async with httpx.AsyncClient(timeout=httpx.Timeout(45, connect=10)) as client:
        async with client.stream(
            "POST",
            CHAT_URL,
            headers=_headers(),
            json=_chat_payload(system, prompt, max_tokens, True),
        ) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if data == "[DONE]":
                    complete_frame = True
                    break
                event = json.loads(data)
                for choice in event.get("choices", []):
                    value = choice.get("delta", {}).get("content")
                    if value:
                        yield value
    if not complete_frame:
        raise RuntimeError("OpenAI stream interrupted")


def embed(texts: list[str]) -> list[list[float]]:
    settings = get_settings()
    response = httpx.post(
        EMBEDDINGS_URL,
        headers=_headers(),
        json={
            "model": settings.openai_embedding_model,
            "input": texts,
            "dimensions": settings.embedding_dim,
        },
        timeout=45,
    )
    response.raise_for_status()
    return [item["embedding"] for item in response.json()["data"]]
