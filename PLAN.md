# MIOS delivery plan

**Product:** Manufacturing Operations Intelligence OS  
**Plan version:** 2.0  
**Updated:** 2026-09-02  
**Current phase:** M0 — Pilot Foundation

This is the canonical implementation plan for MIOS. It consolidates the former development plan
(`docs/04-DEVELOPMENT-PLAN.md`), frontend plan (`docs/06-FRONTEND-EXPERIENCE-PLAN.md`), pilot
runbook (`docs/07-PILOT-BACKEND-AND-PREVIEW.md`), and the Manufacturing Operations Intelligence
OS direction agreed for the pilot.

## 1. Product thesis

MIOS is a system of intelligence and coordinated action above a factory's ERP records,
spreadsheets, SOPs, buyer standards, and operational logs. Retrieval-augmented generation is the
evidence engine, not the product boundary.

The product is built as four connected layers:

1. **Evidence fabric** — ingest, version, permission, retrieve, cite, and monitor factory knowledge.
2. **Operations intelligence** — combine document RAG, structured analytics, rules, trends, and alerts.
3. **Graphical Command Center** — show current performance, exceptions, risks, and priorities.
4. **Governed workflows** — convert findings into reviewed tasks, CAPs, handoffs, and audit trails.

MIOS does not replace ERP/MES, control equipment, or make final compliance decisions. Every
consequential action remains human-approved. The north-star metric is **verified expert hours
returned per factory per week**.

## 2. Pilot personas and priority journeys

| Persona | First question | Primary journey |
|---|---|---|
| Owner/admin | Where are performance and compliance risks across factories? | Sign in → select factory → inspect Command Center → assign action |
| Production manager | Why did a line miss target? | Filter line/shift → inspect trend/ranking → open source rows → draft task |
| Quality manager | Which defects are recurring and why? | Open Pareto → inspect incidents/SOPs → draft CAPA → verify closure |
| Compliance manager | Are we ready for the next buyer audit? | Assess → inspect citations → close gaps → approve CAP → export binder |
| Maintenance manager | Which assets and work orders need attention? | Review health → open overdue work → inspect history/manual → assign owner |
| Operator | What do I need to do on this shift? | See assigned work and immediate signals → complete or escalate |
| Auditor/guest | What evidence has been explicitly shared? | Open expiring read-only link → inspect assessment/evidence → export allowed view |

The pilot's golden path is: **invitation → secure sign-in → dashboard exception → cited evidence →
human-approved action → auditable closure**.

## 3. Target architecture

```text
Browser
  → Next.js 15 / React 19 on Vercel
  → authenticated same-origin route handlers
  → FastAPI web service on Render Singapore
  → Supabase Auth + Postgres/pgvector + private Storage
  → Redis/Celery worker for ingestion, OCR, exports, and evaluations
```

Key boundaries:

- Supabase owns identity. FastAPI owns business authorization, RAG, analytics, and workflows.
- FastAPI validates the Supabase JWT issuer, signature, audience, and expiry through JWKS.
- Membership and factory scope come from protected database records, never editable user metadata.
- The browser does not directly query canonical business tables after the pilot migration.
- All private downloads use scoped, short-lived signed URLs.
- Schema changes are forward-only migrations; production startup never creates or mutates schema.

## 4. Shared platform contracts

### Identity and authorization

- Invitation-only email OTP/magic-link sign-in using `@supabase/ssr` and cookie refresh.
- Public self-registration disabled; neutral anti-enumeration responses.
- Owner/admin MFA required before pilot GA.
- Factory memberships include role and explicit capabilities.
- `Authorization: Bearer <Supabase token>` is required by FastAPI.
- `X-Factory-Id` is checked against active membership before database context is set.
- Cross-tenant/factory reads, retrieval, citations, downloads, and writes are denied and logged.

### Evidence and RAG

- Inputs: PDF, DOCX, TXT/Markdown, XLSX, CSV, and scanned images.
- Immutable source versions with document/page and workbook/sheet/row citations.
- Hybrid keyword, vector, metadata, temporal, and guarded structured-SQL retrieval.
- Pre-retrieval access enforcement by tenant, factory, department, source, and role.
- Claim-level citations, evidence coverage, confidence, freshness, limitations, and abstention.
- Bangla/Banglish/English glossary and intent-preserving query expansion.
- Trace model/provider, latency, cost, retrieved evidence, feedback, and resulting actions.

### Dashboard

- `GET /v1/dashboard` returns a bounded, chart-ready `DashboardSnapshot`.
- Filters: authorized factory, date range, granularity, line, and shift.
- Panels: KPI strip, production trend, line ranking, quality Pareto, compliance readiness,
  maintenance health, action pipeline, evidence health, and source freshness.
- Unauthorized metrics are omitted by the API.
- Every chart has a concise insight, keyboard-accessible controls, a raw table, and CSV export.
- Missing data is not represented as zero; stale and partial sources are visibly identified.

### Governed actions

`draft → pending approval → approved → in progress → done/rejected`

Every task records factory, signal/evidence origin, accountable owner, due date, approvals,
comments, status changes, and audit events.

## 5. Phased roadmap

### M0 — Pilot Foundation (now; 2–4 weeks)

**Outcome:** an invitation-only, seeded, shareable pilot whose identity, factory scope, dashboard,
and evidence boundary match the production architecture.

| Workstream | Deliverables | Exit evidence |
|---|---|---|
| Identity | Supabase SSR OTP, callback, session refresh, sign-out, expired/denied states | Invited users sign in/out; unknown/revoked users fail safely |
| Tenancy | `auth.users` linkage, factories, memberships, role capabilities, forced RLS | Isolation matrix has zero cross-tenant/factory failures |
| API boundary | Same-origin proxy, Supabase JWT verification, `/auth/me`, factory context | Browser has no direct canonical-table access |
| Command Center | Role-adaptive filters, seven KPIs, seven chart panels, freshness, tables, CSV | Values match raw tables and selected filters |
| Seed data | Coherent production, quality, compliance, maintenance, action, evidence fixtures | Demo tells one internally consistent factory story |
| Delivery | Node 22 CI, migrations, tests, Vercel preview, Render web/worker definitions | PR preview passes build, API, isolation, a11y, and smoke gates |
| Pilot operations | Environment matrix, rollback, seeded tenant walkthrough, work log | A non-developer can run and verify the demo |

**M0 remaining:** replace temporary direct-browser pilot queries, add canonical migrations/RLS,
expand dashboard API tests, add browser/a11y tests, configure invitation emails, deploy the FastAPI
service and worker, and publish a protected Vercel preview.

**M1 started (2026-09-03):** the first trusted-answer slice now uses a centralized server-side
OpenAI Responses API adapter, evidence-only degradation, injection-resistant prompts, trace IDs,
confidence/coverage metadata, normalized SSE events, and a same-origin chat proxy. Persistence of
conversation/retrieval traces, source freshness, feedback, action drafts, and golden-set evaluation
remains in the M1 backlog.

### M1 — Trusted Evidence Core (4–6 weeks)

**Outcome:** every answer is permission-safe, traceable, and measurable.

- Versioned source/processing-job schema and private object lifecycle.
- Async parsing/OCR/chunking with retries, idempotency, and visible failure recovery.
- Page- and row-level citation viewer with signed deep links.
- Authority/recency/applicable-period ranking and bilingual glossary management.
- Normalized streaming events: metadata, citation, token, warning, action draft, done, error.
- Conversations, feedback, retrieval traces, cost/latency records, and golden evaluation runner.
- Abstention and evidence-gap UX for unsupported questions.
- First 150 reviewed pilot questions, at least half Bangla/Banglish.

**Exit gates:** RAG faithfulness ≥85%, citation precision ≥90%, hit@8 ≥75%, no unauthorized
retrieval in adversarial scope tests, ingestion p95 <60 seconds for documents up to 20 pages.

### M2 — Broad Operations Suite (6–10 weeks)

**Outcome:** shared evidence, metric, and action foundations support repeatable departmental work.

- **Compliance:** framework assessments, evidence mapping, gap review, CAP drafting/approval,
  expiring evidence, auditor binder export.
- **Production:** observations, targets, attainment, downtime, rejection, line/shift bottlenecks,
  saved analyses.
- **Quality:** incidents, NCR/CAPA, repeat-issue detection, SOP linkage, owner and closure proof.
- **Maintenance:** asset registry, schedules, breakdowns, work orders, manual/history evidence.
- **Actions:** owner/due date, approval gates, comments, notifications, and closure verification.
- **Admin:** factories, invitations, roles/capabilities, glossary, retention, AI/usage controls,
  integrations, and audit log.

**Exit gates:** each department completes its seeded end-to-end scenario; chart drill-downs open the
correct filtered record set; all consequential mutations require an authorized human approval.

### M3 — Connected Pilot (6–8 weeks)

**Outcome:** one live factory can connect its existing information flows with low setup effort.

- Email-in, SFTP, Drive/folder, Odoo, and scheduled CSV imports, prioritized by pilot evidence.
- Connector freshness, failures, re-authentication, and replay controls.
- Expiring, read-only, explicitly scoped auditor access.
- Scheduled digests, exception notifications, and exportable management reports.
- Offline/PWA shell, safe cached knowledge packs, and queued uploads for unstable connections.
- Pilot analytics, ROI ledger, onboarding checklist, support and customer-success playbook.

**Exit gates:** one invited factory operates for four weeks, then three factories; import failures
are recoverable; weekly expert-hours returned are verified by the pilot owner.

### M4 — Pilot GA and scale readiness (4–6 weeks)

**Outcome:** externally supportable service with security, reliability, and cost controls.

- Independent security review, dependency/secret scanning, abuse/rate controls, MFA enforcement.
- Structured logs, trace IDs, Sentry/error tracking, uptime checks, SLO dashboards, job retries.
- Backup/PITR, quarterly restore test, rollback and incident runbooks.
- Cost caps, usage/billing controls, bKash and invoice workflow when commercial validation warrants.
- Retention/deletion automation, DPA and data-residency documentation.
- Load/performance test, WCAG 2.1 AA audit, pilot training, release/change process.

**Exit gates:** no critical/high auth, authorization, secret, or dependency findings; p75 dashboard
initial content <2.5s; filter response <500ms after data arrival; chat p95 <8s; rollback and restore
drills pass.

## 6. Work breakdown structure

| Epic | M0 | M1 | M2 | M3–M4 |
|---|---|---|---|---|
| Identity & Tenancy | OTP, memberships, RLS | audit auth events | admin role UI | MFA/SSO hardening |
| Graphical Command Center | seeded/API-backed dashboard | source trust details | department drill-downs | live connectors/SLOs |
| Evidence/RAG | proxy boundary | versioned trusted core | module-specific retrieval | scale/evaluation ops |
| Actions | seeded pipeline | trace-to-draft contract | approvals and closure | notifications/reporting |
| Compliance | existing pilot path | citation preview | complete workflow | auditor access/export |
| Production | trend/ranking | row provenance | observations/analysis | ERP imports |
| Quality | Pareto | evidence linkage | NCR/CAPA | recurring issue digest |
| Maintenance | health panel | manual/history retrieval | assets/work orders | CMMS import |
| Knowledge & Connectors | upload/source health | versioning/jobs | access scope | email/SFTP/Drive/ERP |
| Pilot Reliability | CI/build | eval/observability | E2E/a11y | backup/rollback/support |

## 7. Verification strategy

1. **Unit tests:** metric math, preceding periods, capability omission, claim/citation mapping,
   state transitions, localization completeness.
2. **API tests:** JWT failures, membership/factory authorization, bounded dashboard datasets,
   upload/citation scope, approval transitions.
3. **Database tests:** migration forward path, RLS matrix, forced tenant context, signed URL scope.
4. **Component tests:** loading, empty, error, stale, partial, permission-limited, English/Bangla.
5. **Browser tests:** invite → sign in → filter dashboard → inspect data → create/approve action →
   upload → ask → citation → sign out.
6. **Evaluation:** reviewed golden set plus adversarial unsupported and cross-scope questions.
7. **Operational tests:** worker retry/idempotency, backup/restore, preview promotion and rollback.

## 8. Delivery and branching

- Active delivery branch: `codex/mios-pilot-foundation` from `main`.
- Immediate PR: `feat(pilot): secure identity and add the graphical command center`.
- Vercel project root: `apps/web`; Render runs separate FastAPI web and Celery worker services.
- Preview, staging, and production credentials are isolated across Supabase, Vercel, and Render.
- Merge requires Node 22 frontend build, Python lint/tests, migration/RLS checks, secret scanning,
  RAG evaluation when configured, accessibility checks, and browser smoke tests.

## 9. Product and engineering decisions

The previous plan's durable decisions remain integrated:

- JSONB is acceptable for bounded pilot tabular storage; normalized observations are used for
  durable metrics and workflows.
- OpenAI-primary model routing may be used with provider fallback and extractive local mode.
- Bangla is first-class; code-mixed intent and factory terminology are evaluation requirements.
- Quality Intelligence follows the trusted foundation as the highest-value adjacent module.
- OTP is the primary pilot sign-in method; public password registration is deprecated.

The previous local-Dhaka production-hosting decision is superseded for the pilot by Vercel +
Render Singapore + Supabase. A Bangladesh/on-prem deployment remains an enterprise option to
validate through customer and legal evidence rather than an M0 prerequisite.

## 10. Scope controls and assumptions

- Initial market: Bangladeshi garment/export manufacturing.
- Seeded data is always labelled and isolated from private uploads.
- Default pilot retention is 90 days unless contracted otherwise.
- The dashboard is operations-first and role-adaptive, with an executive cross-factory view.
- Shared evidence, metric, action, approval, and audit primitives are built once across modules.
- MIOS does not execute equipment controls, autonomously approve compliance, or become the ERP.
- New connectors are ordered by signed-pilot evidence, not roadmap enthusiasm.

Progress against this plan is recorded in [`docs/WORKLOG.md`](docs/WORKLOG.md).
