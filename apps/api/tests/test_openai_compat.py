from types import SimpleNamespace

import httpx

from app.services import openai_compat


def settings():
    return SimpleNamespace(
        openai_api_key="test-server-only",
        openai_model="test-chat-model",
        openai_embedding_model="test-embedding-model",
        embedding_dim=3,
    )


def test_chat_request_is_server_side_and_bounded(monkeypatch):
    monkeypatch.setattr(openai_compat, "get_settings", settings)

    def post(url, *, headers, json, timeout):
        assert url == openai_compat.CHAT_URL
        assert headers["Authorization"] == "Bearer test-server-only"
        assert json["model"] == "test-chat-model"
        assert json["max_tokens"] == 2000
        assert json["stream"] is False
        return httpx.Response(
            200,
            request=httpx.Request("POST", url),
            json={"choices": [{"message": {"content": "Grounded answer"}}]},
        )

    monkeypatch.setattr(openai_compat.httpx, "post", post)
    assert openai_compat.complete("system", "context", 9999) == "Grounded answer"


def test_embeddings_use_configured_model_and_dimensions(monkeypatch):
    monkeypatch.setattr(openai_compat, "get_settings", settings)

    def post(url, *, headers, json, timeout):
        assert url == openai_compat.EMBEDDINGS_URL
        assert json == {
            "model": "test-embedding-model",
            "input": ["work instruction"],
            "dimensions": 3,
        }
        return httpx.Response(
            200,
            request=httpx.Request("POST", url),
            json={"data": [{"embedding": [0.1, 0.2, 0.3]}]},
        )

    monkeypatch.setattr(openai_compat.httpx, "post", post)
    assert openai_compat.embed(["work instruction"]) == [[0.1, 0.2, 0.3]]
