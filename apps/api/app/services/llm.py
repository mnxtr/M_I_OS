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


def generate_answer(question: str, contexts: list[dict]) -> tuple[str, str]:
    """Return (answer_text, provider). Falls back to extractive mode when no LLM configured."""
    settings = get_settings()
    context_block = "\n\n---\n\n".join(
        f"[doc:{c['document_name']} p.{c['page']}]\n{c['content']}" for c in contexts
    )

    if settings.llm_provider == "openai" and settings.openai_api_key:
        answer = _openai_chat(question, context_block)
        return answer, "openai"
    if settings.llm_provider == "anthropic" and settings.anthropic_api_key:
        answer = _anthropic_chat(question, context_block)
        return answer, "anthropic"

    return _extractive_fallback(contexts), "extractive-fallback"


def _openai_chat(question: str, context_block: str) -> str:
    from openai import OpenAI

    client = OpenAI(api_key=get_settings().openai_api_key)
    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0.1,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"Context:\n\n{context_block}\n\nQuestion: {question}",
            },
        ],
    )
    return completion.choices[0].message.content or ""


def _anthropic_chat(question: str, context_block: str) -> str:
    import anthropic

    client = anthropic.Anthropic(api_key=get_settings().anthropic_api_key)
    message = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=1500,
        temperature=0.1,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": f"Context:\n\n{context_block}\n\nQuestion: {question}",
            }
        ],
    )
    return "".join(block.text for block in message.content if block.type == "text")


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


def _user_content(question: str, context_block: str) -> str:
    return f"Context:\n\n{context_block}\n\nQuestion: {question}"


async def stream_answer(question: str, contexts: list[dict]):
    """Yield answer tokens; falls back to chunked extractive output offline."""
    settings = get_settings()
    context_block = "\n\n---\n\n".join(
        f"[doc:{c['document_name']} p.{c['page']}]\n{c['content']}" for c in contexts
    )

    if settings.llm_provider == "openai" and settings.openai_api_key:
        from openai import OpenAI

        client = OpenAI(api_key=settings.openai_api_key)
        stream = client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.1,
            stream=True,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": _user_content(question, context_block)},
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
            max_tokens=1500,
            temperature=0.1,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": _user_content(question, context_block)}],
        ) as stream:
            for token in stream.text_stream:
                yield token
        return

    fallback_text = _extractive_fallback(contexts)
    step = 80
    for start in range(0, len(fallback_text), step):
        yield fallback_text[start : start + step]
