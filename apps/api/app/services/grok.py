"""xAI chat-completions adapter. Only supplied context is sent; no server-side tools."""

import json
from collections.abc import AsyncIterator

import httpx

from app.config import get_settings

URL = "https://api.x.ai/v1/chat/completions"


def request_data(system: str, prompt: str, max_tokens: int, streaming: bool) -> tuple[dict, dict]:
    settings = get_settings()
    if not settings.xai_api_key or not settings.xai_model:
        raise RuntimeError("Grok requires XAI_API_KEY and XAI_MODEL")
    headers = {"Authorization": f"Bearer {settings.xai_api_key}"}
    payload = {
        "model": settings.xai_model,
        "stream": streaming,
        "max_tokens": min(max_tokens, 2000),
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": prompt}],
    }
    return headers, payload


def complete(system: str, prompt: str, max_tokens: int) -> str:
    headers, payload = request_data(system, prompt, max_tokens, False)
    with httpx.Client(timeout=45) as client:
        response = client.post(URL, headers=headers, json=payload)
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"] or ""


async def stream(system: str, prompt: str, max_tokens: int) -> AsyncIterator[str]:
    headers, payload = request_data(system, prompt, max_tokens, True)
    complete_frame = False
    async with httpx.AsyncClient(timeout=httpx.Timeout(45, connect=10)) as client:
        async with client.stream("POST", URL, headers=headers, json=payload) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if data == "[DONE]":
                    complete_frame = True
                    break
                event = json.loads(data)
                if event.get("error"):
                    raise RuntimeError("Grok stream failed")
                for choice in event.get("choices", []):
                    if choice.get("finish_reason") == "length":
                        raise RuntimeError("Grok output limit reached")
                    value = choice.get("delta", {}).get("content")
                    if value:
                        yield value
    if not complete_frame:
        raise RuntimeError("Grok stream interrupted")
