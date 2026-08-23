# 04 — Development Plan (18-Month Roadmap)

## Phase 0 — Discovery & Foundations (Months 0–2)

**Goal: prove the pain, secure design partners, de-risk Bangla AI quality.**

| Workstream | Deliverables |
|---|---|
| Customer discovery | 25+ interviews across RMG (Gazipur/Savar/Narayanganj), pharma, food; map current audit-prep workflow & hours lost |
| Design partners | 3–5 signed LOIs / paid pilots (~50% discount for co-development + data rights) |
| Data reality check | Collect 10 real factory doc sets (SOPs, audit PDFs, production Excel); build the golden eval set (150 Q/A, 50% Bangla) |
| Technical spikes | Bangla OCR accuracy benchmark on real scans; multilingual retrieval eval (bge-m3 vs alternatives); text-to-SQL spike on sample production sheets |
| Legal/corp | Company incorporation (BIDA/BRTA registration), DPAs, terms; consult on Bangladesh Data Protection context + buyer data-sharing norms |
| Team | Founders + hire 2 backend eng, 1 frontend eng (start month 1) |

**Exit criteria:** 3 signed pilots; golden set built; OCR/retrieval benchmarks hit thresholds (>90% OCR char-accuracy on clean scans, retrieval hit@8 >75% on golden set).

## Phase 1 — MVP Build (Months 2–6)

**Goal: Knowledge Core live with 1 pilot factory.**

Scope:
- Multi-tenant foundation: auth (email + OTP — many factory users lack password habits), org/factory/user model, RLS
- Ingestion v1: upload UI (PDF/XLSX/DOCX/images), Tesseract bn+en OCR pipeline, structural chunking, embeddings, hybrid search
- Chat v1: streaming answers, citations w/ PDF page highlight, answer feedback buttons
- Admin: document library w/ processing status, department tagging, user management
- Infra: docker-compose dev stack → single cloud deployment, CI (lint/test/eval), Langfuse tracing

**Exit criteria:** pilot factory uploads ≥500 real docs; weekly active users ≥15 at that factory; answer faithfulness >85% on their live questions; p95 latency <8s.

## Phase 2 — Pilot Hardening & Compliance Copilot (Months 6–10)

**Goal: 3–5 paying pilots; find the wedge ROI.**

Scope:
- **Compliance Copilot**: checklist packs per buyer code (BSCI, SMETA, WRAP), gap-detection questionnaire flow, CAP drafting from past findings, "evidence binder" export (zip of cited docs)
- **Analytics v1 (text-to-SQL)**: production/QC sheet ingestion wizard, schema mapping templates, NL analytics queries + auto-charts
- Bangla UX polish: full bn UI toggle, code-mixed query handling, transliteration tolerance
- Auditor guest-access mode (scoped, time-boxed)
- Billing plumbing: Stripe + local alternative (bKash merchant / bank transfer invoicing — Stripe is weak in BD)
- Security pass: RBAC enforcement tests, penetration test, audit-log UI

**Exit criteria:** ≥3 factories paying (even discounted); measured audit-prep time reduction ≥60% at one factory (documented case study); NPS ≥40 among compliance managers.

## Phase 3 — General Availability (Months 10–14)

**Goal: repeatable sales motion; product a stranger can onboard.**

Scope:
- Self-serve onboarding (guided first-upload wizard, sample-data sandbox)
- Integrations: Odoo connector, SAP Business One (read-only), email-in ingestion, SFTP/Drive folder sync
- Quality Intelligence module (defect Pareto, similar-defect retrieval)
- Enterprise tier groundwork: VPC/on-prem deploy kit (Helm chart + air-gapped model bundle), SSO (SAML/OIDC)
- Scale infra: managed Postgres, Qdrant migration if needed, worker autoscaling
- Hire: 2 AEs (Bangla-speaking, ex-audit/ex-ERP sales), customer success lead, ML engineer

**Exit criteria:** 12–18 paying tenants; MRR ≈ $8–15k; CAC payback <6 months; churn <2%/mo.

## Phase 4 — Scale & Depth (Months 14–18)

**Goal: widen moat; second sector; telemetry.**

Scope:
- Machine telemetry pilot (OPC-UA/MQTT on 2–3 factories): downtime correlation ("this jam pattern ↔ manual section")
- Traceability/DPP groundwork: lot genealogy graph, EU Digital Product Passport export pack (EU regulation pressure = budget available)
- Second-sector playbook: pharma (DGDA-compliance angle) or food processing — reuse compliance copilot skeleton
- Model strategy shift: route high-volume simple queries to fine-tuned small/self-hosted models → gross margin >75%
- Regional scouting: Pakistan/Vietnam/India RMG belts (same buyer-driven compliance dynamics)

**Exit criteria:** 35+ tenants, ARR ≈ $400–600k, Series-A-ready metrics or profitable-growth decision.

## Team plan (headcount by phase)

| Role | P0 | P1 | P2 | P3 | P4 |
|---|---|---|---|---|---|
| CEO (BD domain/sales) | 1 | 1 | 1 | 1 | 1 |
| CTO | 1 | 1 | 1 | 1 | 1 |
| Backend/AI eng | – | 2 | 3 | 4 | 5 |
| Frontend eng | – | 1 | 2 | 2 | 3 |
| ML/RAG eng | – | – | 1 | 2 | 2 |
| DevOps (contract→FT) | c | c | c | 1 | 1 |
| Designer (contract) | c | c | 1 | 1 | 1 |
| Customer success | – | – | 1 | 1 | 2 |
| AE / Sales | – | – | – | 2 | 4 |
| **Total** | **2** | **5** | **9** | **14** | **20** |

## Budget envelope (indicative, USD)

| Item | Phase 0–1 (8 mo) | Phase 2–3 (8 mo) | Notes |
|---|---|---|---|
| Salaries | $120–160k | $350–450k | BD salaries: senior eng $1.5–2.5k/mo, mid $800–1.2k/mo |
| Cloud + LLM APIs | $8–15k | $30–60k | LLM spend scales with usage; margin-engineered per RAG design §5 |
| Compliance/legal/incorp | $10–15k | $10k | BD incorporation, contracts, pen-test |
| Hardware (OCR/test machines, demo PLC rig) | $5k | $15k | Telemetry pilot rig in P3 |
| Travel/events (BGMEA expos, factory visits) | $5k | $15k | |
| Contingency ~15% | $25k | $65k | |
| **Total** | **≈ $180–230k** | **≈ $500–600k** | Seed round: $750k–1M covers through GA |

## Top risks & mitigations

| Risk | Mitigation |
|---|---|
| Factories won't upload sensitive data to cloud | On-prem tier roadmap from day 1; auditor-scoped views; DPA templates; local references |
| Long enterprise sales cycles | Wedge on compliance managers' acute pain (audit dates are hard deadlines); design-partner co-dev creates internal champions |
| USD LLM costs vs BDT revenue | Semantic caching, model routing, per-tenant cost caps, annual prepay discounts |
| Internet/power outages degrade trust | PWA offline cache of top-queried knowledge packs; queue-and-sync for uploads |
| Big ERP vendors add AI features | We win on Bangla, compliance depth, and being system-of-intelligence across their silos—not another transactional system |
| Key-person risk on AI talent | Golden eval set + IaC + documented prompts make the system reproducible, not hero-dependent |
