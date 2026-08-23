import zipfile
from io import BytesIO

from app.models import Assessment, AssessmentItem
from app.routers.compliance import build_manifest
from app.services.compliance_seed import PACKS
from app.services.copilot import (
    build_assess_prompt,
    fallback_cap,
    heuristic_verdict,
    parse_verdict,
)


def _item(**overrides) -> AssessmentItem:
    defaults = {
        "assessment_id": "00000000-0000-0000-0000-000000000000",
        "tenant_id": "00000000-0000-0000-0000-000000000000",
        "ref": "FS-01",
        "category": "Fire & Building Safety",
        "title": "Fire extinguishers serviced on schedule",
        "guidance": "Service tags within validity.",
    }
    defaults.update(overrides)
    return AssessmentItem(**defaults)


def test_seed_packs_are_wellformed():
    refs_seen = set()
    for pack in PACKS:
        assert pack["code"] and pack["name"]
        assert len(pack["items"]) >= 5
        for entry in pack["items"]:
            key = (pack["code"], entry["ref"])
            assert key not in refs_seen, f"duplicate ref {key}"
            refs_seen.add(key)
            assert entry["title"] and entry["category"]


def test_heuristic_verdict_strong_match_is_compliant():
    verdict = heuristic_verdict([0.9, 0.2])
    assert verdict.status == "compliant"
    assert len(verdict.evidence) == 0


def test_heuristic_verdict_medium_match_is_partial():
    assert heuristic_verdict([0.3]).status == "partial"


def test_heuristic_verdict_weak_or_empty_is_unknown():
    assert heuristic_verdict([0.1]).status == "unknown"
    assert heuristic_verdict([]).status == "unknown"


def test_parse_verdict_clean_json():
    raw = '{"status": "gap", "notes": "No fire drill records found.", "quote": ""}'
    verdict = parse_verdict(raw)
    assert verdict is not None
    assert verdict.status == "gap"
    assert "drill" in verdict.notes


def test_parse_verdict_with_prose_and_code_fence():
    raw = (
        'Sure! Here is my assessment:\n```json\n'
        '{"status": "compliant", "notes": "Policy present.", "quote": "policy signed 2024"}\n```'
    )
    verdict = parse_verdict(raw)
    assert verdict is not None
    assert verdict.status == "compliant"
    assert verdict.quote.startswith("policy signed")


def test_parse_verdict_invalid_status_returns_none():
    assert parse_verdict('{"status": "excellent", "notes": ""}') is None


def test_parse_verdict_garbage_returns_none():
    assert parse_verdict("no json here at all") is None
    assert parse_verdict("") is None


def test_build_assess_prompt_includes_requirement_and_context():
    item = _item()
    contexts = [{"document_name": "fire.pdf", "page": 4, "content": "Extinguisher service log."}]
    prompt = build_assess_prompt(item, contexts)
    assert "[FS-01]" in prompt
    assert "fire.pdf" in prompt
    assert '"status"' in prompt


def test_fallback_cap_structure():
    cap = fallback_cap(_item(status="gap"))
    for section in ("Root cause", "Corrective actions", "Responsible role", "Verification"):
        assert section in cap


def _assessment() -> Assessment:
    return Assessment(
        tenant_id="00000000-0000-0000-0000-000000000000",
        template_code="social-compliance-core",
        title="H&M audit prep — October",
        due_date="2026-10-15",
    )


def test_build_manifest_tables_and_details():
    assessment = _assessment()
    items = [
        _item(ref="CL-01", status="compliant", ai_notes="Age verification SOP found."),
        _item(
            ref="WH-01",
            status="gap",
            evidence=[
                {
                    "document_id": "d1",
                    "document_name": "attendance.xlsx",
                    "page": 1,
                    "snippet": "OT hours unclear",
                }
            ],
        ),
    ]
    manifest = build_manifest(assessment, items)
    assert "# Evidence Binder — H&M audit prep — October" in manifest
    assert "| CL-01 |" in manifest and "| gap |" in manifest
    assert "- Evidence: attendance.xlsx p.1" in manifest
    assert "(manual)" not in manifest


def test_binder_zip_roundtrip(tmp_path):
    from app.routers.compliance import build_manifest

    assessment = _assessment()
    items = [
        _item(
            ref="MS-01",
            status="partial",
            ai_notes="Policy found but no internal audit log.",
            evidence=[
                {
                    "document_id": "d1",
                    "document_name": "policy.pdf",
                    "page": 2,
                    "snippet": "Compliance policy signed.",
                }
            ],
        )
    ]
    bundle = BytesIO()
    with zipfile.ZipFile(bundle, "w") as archive:
        archive.writestr("manifest.md", build_manifest(assessment, items))
    bundle.seek(0)
    with zipfile.ZipFile(bundle) as archive:
        assert "manifest.md" in archive.namelist()
        content = archive.read("manifest.md").decode()
        assert "[MS-01]" in content
        assert "- Evidence: policy.pdf p.2" in content
