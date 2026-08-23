"""Query understanding for Bangla / English / code-mixed ("Banglish") queries.

Factories type queries like:
  - "line 7 er efficiency kemon chilo last week?"   (transliterated Bangla)
  - "লাইন ৭ এর আউটপুট কত?"                          (Bangla script)
  - "What was the SMETA audit finding?"              (English)

Retrieval quality depends on bridging these forms: we detect the dominant language
and produce query variants (original + normalized English + Bangla-script) that are
searched together and fused downstream.
"""

import re
from dataclasses import dataclass

BENGALI_RANGE = r"\u0980-\u09FF"
_BENGALI_RE = re.compile(f"[{BENGALI_RANGE}]")
_WORD_RE = re.compile(r"[a-zA-Z]+")

# Transliterated Bangla → English retrieval equivalents. Curated for factory
# vocabulary; extended per tenant via the glossary table in a later phase.
TRANSLIT_MAP: dict[str, str] = {
    "koto": "how much",
    "kemon": "how",
    "kothay": "where",
    "kokhon": "when",
    "keno": "why",
    "ki": "what",
    "chilo": "",
    "ache": "is present",
    "nei": "missing not found",
    "lagbe": "need required",
    "dekhao": "show",
    "dao": "give provide",
    "bolo": "tell",
    "utpadon": "production output",
    "shilpono": "production floor",
    "ayner": "income revenue",
    "khoroch": "expense cost",
    "manpower": "workers headcount",
    "kormi": "workers operators",
    "mohila": "female women",
    "puroskar": "bonus",
    "beton": "salary wage pay",
    "obshethe": "leave holiday",
    "chuti": "leave holiday",
    "durgotona": "accident incident",
    "agni": "fire",
    "nirapatta": "safety security",
    "poriskar": "clean housekeeping",
    "machine": "machine",
    "jontro": "machine equipment",
    "line": "line",
    "laine": "line",
    "order": "order",
    "kapor": "garment clothes",
    "style": "style",
    "sample": "sample",
    "quality": "quality",
    "matha": "defect head",
    "oyogunota": "efficiency performance",
    "apon": "own",
}

# Words that appear ONLY in Banglish and strongly signal Bengali intent.
_BANGLISH_MARKERS = {
    "koto", "kemon", "kothay", "kokhon", "keno", "ache", "nei", "lagbe",
    "dekhao", "dao", "bolo", "chilo", "kormi", "beton", "chuti", "jontro",
    "utpadon", "oyogunota", "durgotona", "er", "ar", "theke", "hoye",
}


@dataclass
class QueryAnalysis:
    language: str  # "bn" | "bn-latin" | "en"
    variants: list[str]  # deduped, order-preserving; original first


def detect_language(question: str) -> str:
    chars = _BENGALI_RE.findall(question)
    if len(chars) >= max(2, int(0.15 * max(len(question), 1))):
        return "bn"
    words = {w.lower() for w in _WORD_RE.findall(question)}
    if words & _BANGLISH_MARKERS:
        return "bn-latin"
    return "en"


def _translate_translit(question: str) -> str:
    def replace_word(match: re.Match) -> str:
        word = match.group(0).lower()
        if word in TRANSLIT_MAP:
            replacement = TRANSLIT_MAP[word]
            return f" {replacement} " if replacement else " "
        return match.group(0)

    return re.sub(r"[a-zA-Z]+", replace_word, question)


def expand_query(question: str) -> QueryAnalysis:
    """Produce retrieval variants for a question.

    - bn script: add an unchanged copy (embedders handle bn natively)
    - bn-latin: add English-normalized variant
    - en: single variant
    """
    language = detect_language(question)
    stripped = question.strip()
    variants: list[str] = [stripped] if stripped else []

    if language == "bn-latin":
        normalized = re.sub(r"\s+", " ", _translate_translit(question)).strip()
        if normalized and normalized.lower() != question.strip().lower():
            variants.append(normalized)

    seen = set()
    unique_variants = []
    for variant in variants:
        key = variant.lower().strip()
        if key not in seen:
            seen.add(key)
            unique_variants.append(variant)
    return QueryAnalysis(language=language, variants=unique_variants)
