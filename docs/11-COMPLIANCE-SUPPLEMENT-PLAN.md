# Linora Compliance Supplement — Bangladesh Manufacturing Pilot

**Prepared:** 25 October 2026. **Scope:** evidence-first compliance support for Bangladesh manufacturing facilities, starting with ready-made garments and textile factories. **Release principle:** Linora supports compliance work; it does not certify legal compliance or substitute for qualified factory inspectors, worker representatives or accredited auditors.

## Why this supplement fits MIOS

Current MIOS already contains:
- Core Social Compliance and fire/building-safety checklist packs in `apps/api/app/services/compliance_seed.py` and Supabase templates;
- assessments, manual review, evidence, corrective action plans (CAPs), AI-supported explanation and evidence-binder export;
- tenant-scoped document ingestion, signed links and Bangla/English interface.

Two important gaps: (1) generic checklists have no source/version, applicability or certificate-expiry rules; (2) the legacy FastAPI `heuristic_verdict` can label an item `compliant` purely from retrieval similarity, which **must never count as verification**. The Next.js compliance pipeline also searches up to 3,000 tenant chunks lexically, independently of the canonical FastAPI RAG system. Keep evidence/finding assessment consistent rather than add a third retriever.

## Proposed supplement in order

### Phase A — Requirements registry and document readiness (Weeks 1–2)

1. Create **versioned requirement packs** with `requirement_id`, `jurisdiction`, `standard_owner`, `title`, `version`, `effective_from`, `source_url`, `applicability`, `risk_level`, `reviewed_by` and `last_checked_at`. Separate verified Bangladesh law / regulator guidance from contractual buyer standards and MIOS-authored practice checklists.
2. Start with fire and electrical inspection records, worker safety committee and drill records, recruitment/age proof, attendance and wage files, relevant permits and environmental clearances. Determine applicability with a factory intake (product, sector, processes such as dyeing, number of workers, audit schemes); do not assert a requirement universally.
3. Add `evidence_requirements` and `evidence_links` linking each requirement to actual document ID, page/chunk, upload date, issuing authority, expiry/review date, and extraction confidence. Unknown evidence stays **unknown**; expired evidence is flagged.
4. Allow users to record manual validation. AI proposes candidates and page citations; only designated humans can approve a check.

### Phase B — CAP and inspection workflow (Weeks 3–4)

1. Add actionable findings with `severity`, `area`, `status`, `owner`, `target_date`, `source_audit`, `evidence`, `reviewer`, and `closure_verified_at`.
2. Build an audit/remediation board: **Open → Assigned → In progress → Submitted for verification → Verified closed**. Reopening is supported; overdue/high-severity items surface in the dashboard. Never auto-close from an LLM recommendation.
3. Offer line/floor-based safety walkthroughs using photos, signed inspection notes and follow-up evidence, with privacy controls for employee images.
4. CAP reminder digests via the user's opt-in notification channel; maintain change history and export human-readable evidence binders.

### Phase C — Buyer programmes and bilingual assistance (Weeks 5–6)

1. Add templates for factory-applicable buyer codes only with verified **current** references/licensing; the generic core pack must not imply an audit against official SMETA/amfori/WRAP materials.
2. Align AI evidence lookup to canonical hybrid pgvector+keyword retrieval, with hard tenant filtering, ready-only documents, citations, evidence quality and no-answer fallback.
3. Support Bangla, English and Banglish questions, but require human checking of technical translations and source language; OCR flags uncertain text for correction.
4. Export an audit pack with evidence manifest, checklist revision, reviewer approval, CAP history, original file links and missing-evidence report.

### Phase D — Safeguards and measurement (Weeks 7–8)

- Fix both compliance engines so similarity scores cannot produce a verified-compliant verdict; distinguish `ai_suggested_status`, `review_status` and `final_status`, with signed human authorization for the final status.
- Require server-verifiable tenant isolation on all documents, assessments, inspections, evidence links and exports. Limit audit-binder shares with expiry/revocation and appropriate role restrictions.
- Track evidence coverage, expired documents, unresolved critical items, overdue CAPs, mean time to verification, false-positive citation rate and inspection follow-up completion; never fabricate compliance scores or claim certification.
- Build two-tenant tests, corrupted document/citation tests, stale-licence tests, Bangla document retrieval tests, human signoff tests and a staging integration pass.

## Acceptance requirements for the first customer pilot

1. A supervisor can create a pack, attach a current fire/drill/OSH record, and click through to exact document-page evidence.
2. A missing or expired record is shown as **unknown / needs evidence**, not "compliant."
3. A finding produces a CAP with accountable owner, deadline, and human-verified closure.
4. Guest auditor access can be scoped, expires, and cannot see another factory's records.
5. All generated outcomes distinguish **AI suggestion**, **document evidence** and **human final assessment**.
6. Performance tested with 1,000+ documents per tenant and bilingual questions; limits must be measured, not assumed.

## Suggested data objects

- `compliance_requirement_versions` (tenant-independent approved requirement catalog; immutable version references)
- `tenant_compliance_programs` (tenant-owned pack, applicability, audit scope)
- `compliance_evidence_links` (tenant_id, requirement version, document_id, chunk/page, checksum, issued/expires)
- `compliance_findings` and `cap_events` (owner, severity, due date, status transitions, reviewer)
- `compliance_reviews` (signed approvals, justification, reviewer role, timestamps)
- `compliance_audit_exports` (manifest checksum, scope and generation timestamp)

Use the existing Supabase/Postgres RLS and storage model; any new tables need RLS, explicit grants and server-side tenant validation. Design migrations against staging and review with factory compliance specialists before production.

## Reference sources (verify applicable edition and authority at deployment)

- [RSC Corrective Action Plan terminology](https://rsc-bd.org/key-information/) — CAPs require remedial actions, timelines and monitoring.
- [RSC Remediation Programme](https://rsc-bd.org/remediation-programme/) — inspection follow-up, escalation and remediation workflows.
- [RSC Safety Committee and Safety Training](https://rsc-bd.org/scst/) — safety committee meetings, factory inspections and walkthroughs.
- [RSC Technical Remediation Guidance](https://rsc-bd.org/technical-remediation-guidance/) — technical materials; these must be interpreted by competent practitioners.
- [DIFE](https://dife.gov.bd/) — verify current Bangladeshi government notices and applicable inspection requirements before publishing any legal obligation.

**Non-goals for this supplement:** legal advice or certification; autonomous closure of high-risk findings; automatic disclosure of worker complaints to employers; copying proprietary buyer checklist contents without rights.
