from collections.abc import AsyncIterator

from app.config import get_settings

SYSTEM_PROMPT = """You are MIOS, an AI assistant embedded in a manufacturing factory's \
knowledge system. Answer strictly using the provided context excerpts from the factory's \
own documents. Always cite sources inline using [doc:FILENAME p.PAGE] markers. \
If the context does not contain the answer, say you don't have it in their records — \
never invent compliance, production, or audit facts. Reply in the language of the question."""

ANALYTICS_SYSTEM_PROMPT = """You are MIOS Analytics, a careful data analyst for a \
manufacturing factory. You generate and explain PostgreSQL over the tenant's own ingested \
tables only. Never invent numbers: every figure you state must appear in the provided SQL \
results or context. Be concise and business-focused."""

COMPLIANCE_SYSTEM_PROMPT = """You are MIOS Compliance, an audit-readiness assessor for \
a manufacturing factory. Judge evidence ONLY from the provided document excerpts. If the \
excerpts do not demonstrate the requirement, mark it unknown or gap — never assume \
compliance without documentary evidence."""


def llm_configured() -> bool:
    settings = get_settings()
    if settings.llm_provider == "openai":
        return bool(settings.openai_api_key)
    if settings.llm_provider == "anthropic":
        return bool(settings.anthropic_api_key)
    return False


async def stream_completion(
    system_prompt: str, user_prompt: str, max_tokens: int = 1500
) -> AsyncIterator[str]:
    """Stream a single-turn completion; raises LLMNotConfigured offline."""
    settings = get_settings()

    if settings.llm_provider == "openai" and settings.openai_api_key:
        from openai import OpenAI

        client = OpenAI(api_key=settings.openai_api_key)
        stream = client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.1,
            max_tokens=max_tokens,
            stream=True,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        for event in stream:
            delta = event.choices[0].delta.content if event.choices else None
            if delta:
                yield delta
        return

    if settings.llm_provider == "anthropic" and settings.anthropic_api_key:
        import anthropic

        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        with client.messages.stream(
            model="claude-sonnet-4-5",
            max_tokens=max_tokens,
            temperature=0.1,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        ) as stream:
            for token in stream.text_stream:
                yield token
        return

    raise LLMNotConfigured()


class LLMNotConfigured(RuntimeError):
    pass


def complete(system_prompt: str, user_prompt: str, max_tokens: int = 1500) -> str:
    settings = get_settings()
    if settings.llm_provider == "openai" and settings.openai_api_key:
        from openai import OpenAI

        client = OpenAI(api_key=settings.openai_api_key)
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.1,
            max_tokens=max_tokens,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        return completion.choices[0].message.content or ""
    if settings.llm_provider == "anthropic" and settings.anthropic_api_key:
        import anthropic

        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        message = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=max_tokens,
            temperature=0.1,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        return "".join(block.text for block in message.content if block.type == "text")
    raise LLMNotConfigured()


def generate_answer(question: str, contexts: list[dict]) -> tuple[str, str]:
    """Return (answer_text, provider). Falls back to extractive mode when no LLM configured."""
    context_block = _context_block(contexts)
    if llm_configured():
        try:
            answer = complete(
                SYSTEM_PROMPT,
                f"Context:\n\n{context_block}\n\nQuestion: {question}",
            )
            return answer, get_settings().llm_provider
        except Exception:  # noqa: BLE001 — fall through to extractive on provider errors
            pass
    return _extractive_fallback(contexts), "extractive-fallback"


async def stream_answer(question: str, contexts: list[dict]) -> AsyncIterator[str]:
    """Yield answer tokens; falls back to chunked extractive output offline."""
    context_block = _context_block(contexts)
    prompt = f"Context:\n\n{context_block}\n\nQuestion: {question}"
    if llm_configured():
        got_any = False
        try:
            async for token in stream_completion(SYSTEM_PROMPT, prompt):
                got_any = True
                yield token
            return
        except Exception:  # noqa: BLE001
            if got_any:
                return
    fallback_text = _extractive_fallback(contexts)
    step = 80
    for start in range(0, len(fallback_text), step):
        yield fallback_text[start : start + step]


def _context_block(contexts: list[dict]) -> str:
    return "\n\n---\n\n".join(
        f"[doc:{c['document_name']} p.{c['page']}]\n{c['content']}" for c in contexts
    )


def _extractive_fallback(contexts: list[dict]) -> str:
    if not contexts:
        return (
            "I couldn't find anything relevant in your records for that question. "
            "(Running in offline mode — configure an LLM provider for full answers.)"
        )
    parts = [
        f"[doc:{c['document_name']} p.{c['page']}]\n{c['content'][:600]}"
        + ("…" if len(c["content"]) > 600 else "")
        for c in contexts[:4]
    ]
    header = "Most relevant excerpts from your records:\n\n"
    footer = "\n\n(Extractive fallback mode: set LLM_PROVIDER to enable synthesized answers.)"
    return header + "\n\n---\n\n".join(parts) + footer
