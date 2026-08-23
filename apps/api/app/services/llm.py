from app.config import get_settings

SYSTEM_PROMPT = """You are MIOS, an AI assistant embedded in a manufacturing factory's \
knowledge system. Answer strictly using the provided context excerpts from the factory's \
own documents. Always cite sources inline using [doc:FILENAME p.PAGE] markers. \
If the context does not contain the answer, say you don't have it in their records — \
never invent compliance, production, or audit facts. Reply in the language of the question."""


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
