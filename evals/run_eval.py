"""Golden-set retrieval evaluation.

Runs hybrid retrieval for each bilingual QA case and reports hit@k / MRR.
Requires a live Postgres (pgvector) instance with ingested documents whose
filenames match `expected_doc` in the JSONL cases.

Usage:
    cd apps/api
    MIOS_TEST_DSN=postgresql+psycopg://mios:mios_dev@localhost:5432/mios \
        ../..../evals/run_eval.py            # or: python run_eval.py <cases.jsonl>

CI policy: fail if hit@8 regresses more than 2 points vs the stored baseline
(baseline file: evals/baseline.json).
"""

import asyncio
import json
import sys
from pathlib import Path

DEFAULT_K = 8


async def evaluate(cases: list[dict], k: int = DEFAULT_K) -> dict:
    from app.services.query_understanding import expand_query

    hits = 0
    reciprocal_ranks: list[float] = []
    per_case = []

    async def run_case(case: dict) -> dict:
        analysis = expand_query(case["question"])
        chunks = await asyncio.to_thread(
            _run_with_tenant, case["tenant_id"], case["question"], analysis.variants, k
        )
        expected = case["expected_doc"].lower()
        rank = next(
            (i + 1 for i, c in enumerate(chunks) if c.document_name.lower() == expected),
            None,
        )
        hit = rank is not None
        rr = 1.0 / rank if rank else 0.0
        return {
            "id": case["id"],
            "lang": case["lang"],
            "hit": hit,
            "rank": rank,
            "rr": round(rr, 3),
        }

    results = []
    for case in cases:
        result = await run_case(case)
        results.append(result)
        hits += int(result["hit"])
        reciprocal_ranks.append(result["rr"])
        per_case.append(result)

    total = len(cases) or 1
    return {
        "total": len(cases),
        "hit_rate": round(hits / total, 3),
        "mrr": round(sum(reciprocal_ranks) / total, 3),
        "cases": per_case,
    }


def _run_with_tenant(tenant_id: str, question: str, variants: list[str], k: int):
    from app.db import SessionLocal, set_tenant
    from app.services.retrieval import hybrid_search

    db = SessionLocal()
    try:
        set_tenant(db, tenant_id)
        return hybrid_search(db, question, k, variants=variants)
    finally:
        db.close()


def main() -> int:
    import os

    dsn = os.environ.get("MIOS_TEST_DSN")
    if not dsn:
        print("Set MIOS_TEST_DSN to a Postgres+pgvector URL with ingested docs.")
        return 2

    cases_path = (
        Path(sys.argv[1])
        if len(sys.argv) > 1
        else Path(__file__).parent / "golden_set.sample.jsonl"
    )
    tenant_id = os.environ.get("MIOS_EVAL_TENANT_ID")
    if not tenant_id:
        print("Set MIOS_EVAL_TENANT_ID to the tenant UUID owning the eval documents.")
        return 2

    cases = [
        {**json.loads(line), "tenant_id": tenant_id}
        for line in cases_path.read_text().splitlines()
        if line.strip()
    ]

    os.environ.setdefault("DATABASE_URL", dsn)

    from app.main import _init_schema

    _init_schema()
    report = asyncio.run(evaluate(cases))

    print(f"\nGolden-set evaluation ({report['total']} cases)")
    print(f"  hit@{DEFAULT_K}: {report['hit_rate']:.1%}")
    print(f"  MRR:       {report['mrr']:.3f}\n")
    for case in report["cases"]:
        marker = "PASS" if case["hit"] else "MISS"
        print(f"  [{marker}] {case['id']} ({case['lang']}) rank={case['rank']}")

    baseline_path = Path(__file__).parent / "baseline.json"
    if baseline_path.exists():
        baseline = json.loads(baseline_path.read_text())
        delta = report["hit_rate"] - baseline.get("hit_rate", 0)
        if delta < -0.02:
            print(f"\nREGRESSION: hit rate dropped {abs(delta):.1%} vs baseline.")
            return 1
    else:
        baseline_path.write_text(
            json.dumps({"hit_rate": report["hit_rate"], "mrr": report["mrr"]}, indent=2)
        )
        print("\nBaseline saved.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
