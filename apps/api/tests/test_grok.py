import asyncio
import json
from types import SimpleNamespace

import httpx
import pytest

from app.services import grok


@pytest.fixture(autouse=True)
def configured(monkeypatch):
    monkeypatch.setattr(
        grok,
        "get_settings",
        lambda: SimpleNamespace(xai_api_key="test-server-only", xai_model="test-model"),
    )


def test_credentials_required(monkeypatch):
    monkeypatch.setattr(grok, "get_settings", lambda: SimpleNamespace(xai_api_key="", xai_model=""))
    with pytest.raises(RuntimeError, match="requires"):
        grok.request_data("system", "context", 100, True)


def test_sync_provider_request_is_bounded(monkeypatch):
    original_client = httpx.Client

    def handler(request):
        assert str(request.url) == "https://api.x.ai/v1/chat/completions"
        assert request.headers["authorization"] == "Bearer test-server-only"
        payload = json.loads(request.content)
        assert payload["max_tokens"] == 2000
        assert payload["model"] == "test-model"
        assert "tools" not in payload
        return httpx.Response(200, json={"choices": [{"message": {"content": "Evidence"}}]})

    monkeypatch.setattr(
        grok.httpx,
        "Client",
        lambda **kwargs: original_client(transport=httpx.MockTransport(handler), **kwargs),
    )
    assert grok.complete("system", "supplied context", 9999) == "Evidence"


@pytest.mark.parametrize(
    "ending,error",
    [
        ("data: [DONE]\n\n", None),
        ("", "interrupted"),
        ('data: {"error":{"message":"provider error"}}\n\n', "failed"),
        ('data: {"choices":[{"finish_reason":"length"}]}\n\n', "limit"),
    ],
)
def test_stream_completion_and_partial_failures(monkeypatch, ending, error):
    original_client = httpx.AsyncClient
    body = 'data: {"choices":[{"delta":{"content":"Evidence"}}]}\n\n' + ending
    monkeypatch.setattr(
        grok.httpx,
        "AsyncClient",
        lambda **kwargs: original_client(
            transport=httpx.MockTransport(lambda request: httpx.Response(200, text=body)), **kwargs
        ),
    )
    chunks = []

    async def consume():
        async for chunk in grok.stream("system", "context", 100):
            chunks.append(chunk)

    if error:
        with pytest.raises(RuntimeError, match=error):
            asyncio.run(consume())
    else:
        asyncio.run(consume())
    assert chunks == ["Evidence"]
