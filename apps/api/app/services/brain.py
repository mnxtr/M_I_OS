import time
import uuid
from dataclasses import dataclass, field

from app.services.llm import (
    SYSTEM_PROMPT,
    complete_result,
    configured_provider,
    context_text,
    extractive_fallback,
)


@dataclass
class BrainMetadata:
    trace_id: str
    provider: str
    model: str
    confidence: float
    evidence_coverage: float
    freshness: str
    limitations: list[str] = field(default_factory=list)
    suggested_actions: list[str] = field(default_factory=list)


@dataclass
class BrainAnswer(BrainMetadata):
    answer: str = ""
    latency_ms: int = 0


def build_metadata(contexts: list[dict], requested_top_k: int) -> BrainMetadata:
    provider, model = configured_provider()
    evidence_count = len(contexts)
    coverage = min(1.0, evidence_count / max(requested_top_k, 1))
    scores = [max(0.0, min(float(item.get("score", 0.0)), 1.0)) for item in contexts]
    best_score = max(scores, default=0.0)

    if not contexts:
        confidence = 0.0
        limitations = ["No permitted evidence matched this question."]
        actions = ["Upload or connect the relevant factory records, then ask again."]
    else:
        confidence = min(0.95, 0.30 + (coverage * 0.35) + (best_score * 0.25))
        limitations = ["Source freshness is not yet recorded for legacy ingested evidence."]
        actions = ["Review the cited evidence before approving an operational action."]

    if provider == "extractive-fallback":
        limitations.append("LLM synthesis is unavailable; MIOS is showing evidence excerpts only.")

    return BrainMetadata(
        trace_id=str(uuid.uuid4()),
        provider=provider,
        model=model,
        confidence=round(confidence, 2),
        evidence_coverage=round(coverage, 2),
        freshness="not-recorded",
        limitations=limitations,
        suggested_actions=actions,
    )


def answer_question(question: str, contexts: list[dict], requested_top_k: int) -> BrainAnswer:
    started = time.perf_counter()
    metadata = build_metadata(contexts, requested_top_k)
    prompt = f"Evidence excerpts:\n\n{context_text(contexts)}\n\nUser question: {question}"

    try:
        result = complete_result(SYSTEM_PROMPT, prompt)
        answer = result.text
        metadata.provider = result.provider
        metadata.model = result.model
    except Exception:  # noqa: BLE001 — evidence-only mode is the safe operational fallback
        answer = extractive_fallback(contexts, question)
        if metadata.provider != "extractive-fallback":
            metadata.limitations.append(
                "The configured synthesis provider was unavailable; evidence excerpts are shown."
            )
        metadata.provider = "extractive-fallback"
        metadata.model = "none"

    return BrainAnswer(
        **metadata.__dict__,
        answer=answer,
        latency_ms=round((time.perf_counter() - started) * 1000),
    )
