import json
import re
from dataclasses import dataclass, field

from sqlalchemy.orm import Session

from app.models import AssessmentItem, ChecklistTemplate
from app.services.compliance_seed import PACKS
from app.services.llm import COMPLIANCE_SYSTEM_PROMPT, llm_configured, stream_completion
from app.services.retrieval import hybrid_search


def ensure_templates_seeded(db: Session) -> None:
    for pack in PACKS:
        existing = db.query(ChecklistTemplate).filter_by(code=pack["code"]).first()
        if existing is None:
            db.add(
                ChecklistTemplate(
                    code=pack["code"],
                    name=pack["name"],
                    version=pack["version"],
                    description=pack["description"],
                    items=pack["items"],
                )
            )
    db.flush()


@dataclass
class Verdict:
    status: str  # compliant | partial | gap | unknown
    notes: str = ""
    quote: str = ""
    evidence: list[dict] = field(default_factory=list)


def heuristic_verdict(scores: list[float], threshold: float = 0.25) -> Verdict:
    """Offline mode: judge purely by retrieval confidence."""
    if not scores:
        return Verdict(status="unknown", notes="No matching records found in the knowledge base.")
    best = max(scores)
    if best >= threshold:
        return Verdict(
            status="partial" if best < threshold * 2 else "compliant",
            notes=f"Retrieval confidence {best:.2f}; review cited excerpts.",
        )
    return Verdict(
        status="unknown",
        notes=f"Weak match (best score {best:.2f}). Likely missing documentation.",
    )


VERDICT_JSON_INSTRUCTION = (
    'Respond with ONLY a JSON object: {"status": "compliant|partial|gap|unknown", '
    '"notes": "<one short paragraph>", "quote": '
    '"<most relevant sentence from context or empty>"}'
)


def build_assess_prompt(item: AssessmentItem, contexts: list[dict]) -> str:
    context_block = "\n\n---\n\n".join(
        f"[doc:{c['document_name']} p.{c['page']}]\n{c['content'][:900]}" for c in contexts
    )
    return (
        f"Auditor requirement [{item.ref}] ({item.category}):\n{item.title}\n"
        f"What auditors look for: {item.guidance}\n\n"
        f"Factory document excerpts:\n{context_block or '(none)'}\n\n"
        f"{VERDICT_JSON_INSTRUCTION}"
    )


def parse_verdict(raw: str) -> Verdict | None:
    """Robustly extract the verdict JSON from an LLM reply."""
    if not raw:
        return None
    text = raw.strip()
    if text.startswith("```"):
        text = "\n".join(line for line in text.splitlines() if not line.strip().startswith("```"))
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        return None
    try:
        payload: dict = json.loads(match.group(0))
    except json.JSONDecodeError:
        return None

    status = str(payload.get("status", "")).lower().strip()
    if status not in ("compliant", "partial", "gap", "unknown"):
        return None
    return Verdict(
        status=status,
        notes=str(payload.get("notes", ""))[:1500],
        quote=str(payload.get("quote", ""))[:400],
    )


def citation_of(chunk) -> dict:
    return {
        "document_id": str(chunk.document_id),
        "document_name": chunk.document_name,
        "page": chunk.page,
        "snippet": chunk.content[:300],
    }


async def judge_item(db, item: AssessmentItem):
    """Auto-assess one item via hybrid retrieval + LLM judgment.

    Async generator yielding progress events; the final event carries the verdict."""
    query = f"{item.title}. {item.guidance}"
    chunks = hybrid_search(db, query, top_k=4)
    contexts = [
        {"document_name": c.document_name, "page": c.page, "content": c.content} for c in chunks
    ]

    verdict: Verdict | None = None
    if llm_configured():
        prompt = build_assess_prompt(item, contexts)
        raw_parts: list[str] = []
        try:
            async for token in stream_completion(COMPLIANCE_SYSTEM_PROMPT, prompt):
                raw_parts.append(token)
            yield {"type": "progress", "ref": item.ref}
            verdict = parse_verdict("".join(raw_parts))
        except Exception:  # noqa: BLE001 — provider errors fall back to heuristic
            verdict = None
        if verdict is not None and verdict.quote and chunks:
            best = max(chunks, key=lambda c: c.score)
            citation = citation_of(best)
            citation["snippet"] = verdict.quote
            verdict.evidence.append(citation)

    if verdict is None:
        verdict = heuristic_verdict([c.score for c in chunks])
        for chunk in chunks[:2]:
            verdict.evidence.append(citation_of(chunk))

    item.status = verdict.status
    item.ai_notes = verdict.notes
    item.evidence = verdict.evidence
    yield {"type": "verdict", "ref": item.ref, "status": verdict.status}


CAP_PROMPT_TEMPLATE = """Draft a concise corrective action plan (CAP) for this audit finding.

Requirement [{ref}] ({category}): {title}
Assessment result: {status}
Auditor notes: {notes}

Format:
Root cause hypothesis:
Corrective actions (numbered):
Responsible role:
Suggested timeline (days):
Verification method:"""


def build_cap_prompt(item: AssessmentItem) -> str:
    return CAP_PROMPT_TEMPLATE.format(
        ref=item.ref,
        category=item.category,
        title=item.title,
        status=item.status,
        notes=item.ai_notes or "(none)",
    )


def fallback_cap(item: AssessmentItem) -> str:
    return (
        f"Root cause hypothesis: Documentation or implementation gap for '{item.title}'.\n"
        "Corrective actions:\n"
        f"1. Collect/prepare required evidence: {item.guidance}\n"
        "2. Assign owner to close the gap and verify on the floor.\n"
        "3. Update internal compliance tracker.\n"
        "Responsible role: Compliance Manager\n"
        "Suggested timeline (days): 14\n"
        "Verification method: Document review + floor inspection before next audit."
    )
