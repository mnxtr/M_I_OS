# 04 — Development Plan (Comprehensive, 18-Month Roadmap)

> **Plan integration notice (2026-09-02):** This historical roadmap has been incorporated into
> the canonical [`PLAN.md`](../PLAN.md). Use that plan for current phase status, architecture,
> milestones, and acceptance gates. This file is retained for the original commercial context,
> budget assumptions, decision history, and traceability.

**Last updated:** 2026-08-24 · **Status:** Phase 1–2 build substantially complete; pre-pilot
**Decision log:** see §11 (open decisions flagged ⚠️ need founder sign-off)

---

## 0. Implementation status snapshot

Reality vs. original plan — the product is ~4 months ahead of the build curve on software,
behind on customer validation (no signed pilots yet; discovery must run in parallel).

| Capability | Plan phase | Status |
|---|---|---|
| Multi-tenant foundation (RLS, JWT auth, roles) | P1 | ✅ Built |
| Ingestion: PDF/TXT/DOCX/XLSX/CSV + OCR path | P1 | ✅ Built (OCR needs tesseract on host) |
| Hybrid RAG chat w/ citations + SSE streaming | P1 | ✅ Built |
| Text-to-SQL analytics over ingested sheets | P2 | ✅ Built (guarded, JSONB store, ADR-001) |
| Compliance Copilot (packs, auto-assess, CAPs, binder) | P2 | ✅ Built (wedge feature) |
| Auditor guest access (scoped, expiring) | P2 | ✅ Built |
| Plans/metering/quota + ROI ledger | P2–3 | ✅ Built (payment rails pending) |
| Bangla-first (query expansion, UI i18n) | P2 | ✅ Built (needs eval tuning vs real data) |
| Celery worker split (eager fallback) | P3 | ✅ Built (unverified against live Redis) |
| Email-in ingestion connector | P3 | ✅ Built (webhook; IMAP poller pending) |
| Alembic migration discipline | P2 | 🟡 Scaffolded; baseline policy documented |
| CI/CD pipeline, staging env, Langfuse tracing | P1 | ❌ Not started |
| Golden eval set from real factory docs (150 Q/A) | P0 | ❌ Blocked on design partners |
| Billing rails (bKash / bank / Stripe) | P2 | ❌ Not started (metering done) |
| Odoo / SAP B1 connectors, folder sync | P3 | ❌ Not started |
| Quality Intelligence module | P3 | ❌ Not started |
| On-prem deploy kit, SSO | P3 | ❌ Not started |
| Telemetry, DPP/traceability | P4 | ❌ Not started |

---

## 1. Product principles (binding for all phases)

1. **Citations always** — no answer without a traceable source (doc page, DB row).
2. **Bangla is first-class** — every feature ships bn/en; queries accepted in script, transliteration, or code-mix.
3. **Layer, don't replace** — MIOS reads what factories already produce; never demands ERP migration.
4. **Human-in-the-loop for compliance** — AI assesses; humans confirm. Manual overrides always win.
5. **ROI visible daily** — usage metering → minutes-saved ledger per tenant.
6. **Degrade gracefully offline** — extractive fallback when LLM absent; queue-and-sync uploads.

## 2. Phases (revised)

### Phase A — Pilot-Ready Hardening ← *current focus (Months 0–4)*

Everything needed to put the product in front of a real factory safely.

| Workstream | Deliverables | Done when |
|---|---|---|
| Live-stack E2E | Docker compose verified green: ingest→index→chat→analytics→copilot→binder | Full happy-path passes against Postgres+pgvector |
| CI pipeline | GitHub Actions: ruff+pytest+next build on PR; eval job (DSN-gated) nightly | Red/green enforced; eval regression gate live |
| Alembic cutover | Baseline stamped policy → all future changes as revisions; startup runs `upgrade head` | No create_all drift between dev/prod |
| Observability | Langfuse traces on chat/copilot/analytics; Sentry; /health deep-check | p95 latency + failure dashboards exist |
| Security pass 1 | Rate limiting, audit-log table+UI, RBAC test matrix, secrets handling review | Pen-test checklist clean |
| Golden eval set | 50→150 Q/A from 3 real factory doc sets (50% bn) | hit@8 ≥75%, faithfulness ≥85% measured |
| Discovery & pilots | 25 interviews; 3 LOIs; pilot playbook doc | First factory uploading real docs |
| Payment rails | **bKash merchant** (D-3): checkout + callback webhook; invoice-PDF path for bank-transfer payers | Test-mode charge succeeds |

### Phase B — GA Launch (Months 4–8)

Self-serve motion + integrations that shorten time-to-value.

- **OTP-first auth (D-5)**: email OTP issue/verify (rate-limited), SMS gateway abstraction; passwords stay for owner/admin
- Self-serve onboarding wizard (guided upload, sample-data sandbox, glossary setup)
- Integrations: **Odoo connector** (XML-RPC read-only), SFTP/Drive folder sync, email-in IMAP poller (poller complements existing webhook)
- **Quality Intelligence** (D-4): defect Pareto over QC tables, similar-defect retrieval, weekly auto-digest to directors
- Admin console: user management UI, audit-log viewer, connector management
- Billing lifecycle: trials, dunning, invoice PDFs (BDT), plan-gated features wired to metering
- Infra: managed Postgres (backups/PITR), staging environment, error budgets
- Hiring: ML/RAG eng #1, CS lead, contract DevOps→FT

**Exit:** 5–10 paying tenants · MRR $2–6k · case study published · churn <3%/mo · support <24h first-response

### Phase C — Scale Motion (Months 8–13)

- Sales team ramp (2 Bangla-speaking AEs), association channel (BGMEA/BKMEA programs), consultancy reseller program
- Enterprise groundwork: VPC/on-prem kit (Helm + air-gapped model bundle), SSO (OIDC/SAML), sub-org (group-of-factories) hierarchy
- Vector store migration trigger check (Qdrant if >10M chunks or p95 search >500ms)
- Model cost program: routing tiers, semantic cache, fine-tuned small model for classification/simple QA → gross margin ≥70%
- SAP Business One read-only connector (demand-driven)
- Telemetry pilot prep: OPC-UA/MQTT spike on 1 friendly factory

**Exit:** 12–18 tenants · MRR $8–15k · CAC payback <6 mo · margin ≥70% at Growth tier

### Phase D — Moat Expansion (Months 13–18)

- Machine telemetry v1 (downtime ↔ manual correlation), traceability/DPP export pack
- Second-sector playbook (pharma DGDA angle) reusing copilot skeleton
- Regional scouting (Pakistan/Vietnam RMG belts)
- Team ≈20; Series-A metrics or profitable-growth decision

## 3. Engineering standards

- **Language/stack:** Python 3.12/FastAPI; Next.js 15/React 19 TS. No new frameworks without an ADR.
- **Migrations:** alembic-only after baseline; `create_all` exists solely for fresh dev bootstraps.
- **Testing:** unit tests per pure module (target ≥80% on services/); integration suite gated on `MIOS_TEST_DSN`; golden-set eval gate (>2pt hit@8 regression fails CI). New RAG features ship with eval cases.
- **Code style:** ruff (E,F,I,UP,B) + ruff format; line length 100. TypeScript strict.
- **Secrets:** `.env` local only; prod secrets via cloud secret manager; no keys in repo (enforced by gitleaks in CI).
- **API versioning:** `/v1` prefix; breaking changes require `/v2`.
- **Multi-tenancy:** every new table gets `tenant_id` + RLS policy entry in `models.RLS_TABLES`; CI greps for uncovered tenant tables.
- **LLM ops:** every prompt change ships with before/after eval numbers; prompts live in `services/*`, versioned in git.

## 4. Environments & deployment

| Env | Purpose | Shape |
|---|---|---|
| local | dev | docker-compose (pgvector, redis, minio) |
| staging | pre-prod, eval runs | single small VM, seeded synthetic tenant |
| prod | customers | **Dhaka DC (D-2)**: app VMs + workers + self-managed Postgres w/ PITR; UPS/generator; encrypted off-site backup sink abroad (disclosed in DPA) |

Deploy = GitHub Actions → build/push images → migrate → rolling deploy. Feature flags via env (`USE_CELERY`, `EMBEDDING_PROVIDER`, …). Rollback = previous image tag. Local hosting means we own power/network redundancy — restore drills are a Phase B exit gate, not optional.

## 5. Observability & SLOs

- Tracing: Langfuse (all LLM calls: prompt, retrieval scores, latency, cost/token); Sentry (errors); Prometheus/Grafana (infra).
- **SLOs:** chat p95 <8s; ingestion p95 <60s/doc ≤20 pages; availability 99.5% (single-region); RAG faithfulness ≥85% on golden set.
- Weekly quality review: eval deltas, thumbs-down reasons, top failing queries.

## 6. Data governance & compliance posture

- Tenant data isolation: RLS + per-request tenant context (built); auditor scope excludes confidential-tagged docs (built at token level).
- Audit trail: who asked what, which sources surfaced (table planned Phase A).
- Retention: raw uploads retained until tenant deletion; deletion = purge objects + chunks + rows (30-day soft delete).
- DPAs with each tenant; buyer-data-sharing norms reviewed with legal counsel (Phase A task).
- Bangladesh context: track draft data-protection law; keep on-prem option viable as the trust answer.

## 7. QA strategy (layers)

1. Pure-unit (chunking, SQL guardrails, plans math, query understanding) — fast, no I/O
2. API integration (auth flow, quota enforcement, connectors) — gated on DSN
3. Retrieval/answer quality — golden set + Langfuse production sampling
4. Frontend — next build type-check; Playwright smoke on staging (login→upload→chat) planned Phase A end
5. Manual pilot UAT scripts (compliance manager persona) before each pilot go-live

## 8. GTM sync points (product↔sales)

- Pilot playbook: audit-deadline targeting ("audit in 8 weeks? let's get you ready"), 14-day success criteria defined at kickoff
- Case-study instrumentation from day 1 of every pilot (time-to-binder, queries/user, minutes-saved ledger export)
- Pricing experiments only at phase boundaries (see pricing in `05-BANGLADESH-GTM.md`)

## 9. KPI tree

```
North star: expert-hours returned / factory / week
├─ Activation: docs uploaded wk1 ≥50 · first chat <48h · copilot run <7d
├─ Engagement: WAU/factory ≥15 · queries/WAU ≥5 · analytics use ≥30% tenants
├─ Quality:   hit@8 ≥75% · faithfulness ≥85% · citation precision ≥90%
├─ Business:  MRR · logo churn <2%/mo · CAC payback <6 mo · margin ≥70%
└─ Trust:     uptime 99.5% · security findings (high) = 0 · support FRT <24h
```

## 10. Budget envelope (refreshed, USD)

| Item | Through Phase A (≈4 mo) | Phase B (4 mo) | Phase C (5 mo) | Notes |
|---|---|---|---|---|
| Salaries | $80–110k | $120–160k | $220–300k | BD rates; founders below-market initially |
| Cloud + LLM APIs | $6–12k | $15–30k | $40–70k | Margin-engineered; caching from Phase B |
| Legal/incorp/compliance | $10–15k | $5k | $10k | Incorporation urgent |
| Hardware (OCR rig, PLC demo) | $3k | $5k | $15k | |
| Travel/events | $3k | $8k | $18k | BGMEA expos, factory visits |
| Contingency 15% | $15k | $23k | $45k | |
| **Total** | **≈$117–155k** | **≈$176–231k** | **≈$348–458k** | Seed ask unchanged: $750k–1M through GA+ |

## 11. Decision log

| ID | Decision | Status |
|---|---|---|
| ADR-001 | JSONB row storage for spreadsheets (bounded-wrapper text-to-SQL) | Accepted |
| ADR-002 *(pending)* | pgvector→Qdrant migration trigger | Deferred to Phase C checkpoint |
| **D-1** | **OpenAI-primary LLM stack** — GPT-4o-mini-class default for cost, GPT-4-class for complex synthesis/verdicts; Anthropic retained as coded fallback; extractive mode stays for offline/dev. Margin levers (routing, semantic cache) become mandatory before Growth-tier scale. | **Accepted 2026-08-24** |
| **D-2** | **Local BD hosting first** — production in a Dhaka data center. Data-residency is the trust wedge for R2 (buyer-sensitive docs never leave the country). Consequences we own: UPS/generator redundancy, self-managed Postgres w/ PITR discipline, documented restore drills (Phase B gate). On-prem kit stays Phase C enterprise option. | **Accepted 2026-08-24** |
| **D-3** | **bKash merchant first** — instant digital collection fits trial→starter conversion; bank-transfer/invoice PDF path built alongside for larger factories (their actual B2B habit); Stripe deferred until foreign-currency tenants appear. | **Accepted 2026-08-24** |
| **D-4** | **Quality Intelligence is the next major module** (post Phase-A hardening) — defect Pareto over QC tables we already ingest + similar-defect retrieval. Cheapest high-demo-value build on existing analytics/RAG rails. Odoo connector follows once a live tenant instance is available to verify against. | **Accepted 2026-08-24** |
| **D-5** | **OTP-first auth, passwords optional** — email OTP at launch (free), SMS aggregator (e.g., local bulk-SMS gateway) added when floor-user volume justifies cost. Passwords remain for owner/admin accounts. | **Accepted 2026-08-24** |

### Decision consequences → backlog deltas

| From | Added work |
|---|---|
| D-1 | Semantic answer cache moves from "nice-to-have" to Phase B required; per-tenant cost caps surfaced in admin console |
| D-2 | Phase A adds: select DC vendor, UPS sizing, off-site encrypted backup target (e.g., S3 Mumbai as backup-only sink — data at rest in BD, disaster-copy abroad disclosed in DPA) |
| D-3 | Phase A payment-rails task redefined: bKash Merchant API (checkout + callback webhook) + invoice PDF generator |
| D-4 | Quality Intelligence spec drafted end of Phase A; build starts Phase B week 1 |
| D-5 | Auth refactor scheduled early Phase B: OTP issue/verify endpoints, rate-limited, email delivery via SMTP; SMS gateway abstraction behind interface |

## 12. Risk register (expanded)

| # | Risk | P×I | Mitigation | Trigger to act |
|---|---|---|---|---|
| R1 | No signed pilots by Month 4 | H×H | Founder-led discovery NOW; audit-deadline wedge; free 30-day trials | <3 LOIs by Month 2 → pivot segment (pharma) |
| R2 | Factory refuses cloud storage of buyer-sensitive docs | M×H | On-prem roadmap (Phase C); guest-scoped views; DPA templates | Any pilot blocked on this → pull on-prem kit forward |
| R3 | USD LLM costs vs BDT revenue squeeze | M×M | Routing, semantic cache, caps, annual prepay | Margin <60% any month → tighten routing |
| R4 | Bangla OCR/retrieval quality below bar on real scans | M×H | Phase-A benchmark on real scans; hosted DocAI fallback budgeted | <90% char accuracy → switch OCR backend |
| R5 | Connectivity/load-shedding erodes trust | M×M | PWA offline knowledge packs (Phase B); queue-and-sync | >2 complaints/pilot → prioritize PWA cache |
| R6 | Big-ERP AI add-ons commoditize chat | L×M | Depth in compliance + Bangla + cross-silo intelligence | Track Odoo AI releases quarterly |
| R7 | Key-person dependency on AI talent | M×H | Eval gates, IaC, prompt-in-repo, pairing | Any bus-factor-1 area → document + pair within sprint |
| R8 | Regulatory shift (BD data law / EU DPP) breaks assumptions | L×M | Quarterly legal scan; DPP work already scoped Phase D | Law enacted → 30-day impact assessment |
| R9 | Scope creep into MES/ERP territory | M×M | Principle 3; product council monthly | Any "transactional" feature request → defer to integrations |
| R10 | Single-region outage | L×H | Backups PITR; documented restore drill (Phase B) | Restore drill fail → multi-region review |
