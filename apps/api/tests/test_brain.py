import sys
from types import SimpleNamespace

import pytest

from app.config import get_settings
from app.services.brain import answer_question, build_metadata
from app.services.llm import PROMPT_VERSION, complete_result


@pytest.fixture(autouse=True)
def clear_settings_cache():
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_brain_abstains_without_evidence(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "none")
    metadata = build_metadata([], requested_top_k=8)

    assert metadata.provider == "extractive-fallback"
    assert metadata.confidence == 0
    assert metadata.evidence_coverage == 0
    assert "No permitted evidence" in metadata.limitations[0]


def test_brain_falls_back_to_cited_evidence(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "none")
    contexts = [
        {
            "document_name": "Needle SOP.pdf",
            "page": 4,
            "content": "Broken needles must be logged before replacement.",
            "score": 0.8,
        }
    ]

    result = answer_question("What is the needle process?", contexts, requested_top_k=4)

    assert result.provider == "extractive-fallback"
    assert "[doc:Needle SOP.pdf p.4]" in result.answer
    assert result.confidence > 0
    assert result.suggested_actions
    assert result.trace_id


def test_openai_completion_uses_responses_api(monkeypatch):
    captured = {}

    class FakeUsage:
        def model_dump(self, mode):
            assert mode == "json"
            return {"input_tokens": 21, "output_tokens": 8, "total_tokens": 29}

    class FakeResponses:
        def create(self, **kwargs):
            captured.update(kwargs)
            return SimpleNamespace(
                output_text="Grounded answer",
                usage=FakeUsage(),
                model="gpt-5.6-terra",
                id="resp_test",
            )

    class FakeOpenAI:
        def __init__(self, **kwargs):
            captured["client"] = kwargs
            self.responses = FakeResponses()

        def close(self):
            captured["closed"] = True

    monkeypatch.setitem(sys.modules, "openai", SimpleNamespace(OpenAI=FakeOpenAI))
    monkeypatch.setenv("LLM_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("OPENAI_MODEL", "gpt-5.6-terra")
    get_settings.cache_clear()

    result = complete_result("Ground only in evidence.", "Factory evidence", max_tokens=250)

    assert result.text == "Grounded answer"
    assert result.response_id == "resp_test"
    assert result.input_tokens == 21
    assert captured["model"] == "gpt-5.6-terra"
    assert captured["store"] is False
    assert captured["metadata"]["prompt_version"] == PROMPT_VERSION
    assert captured["reasoning"] == {"effort": "low"}
    assert captured["closed"] is True
