# Linora audit and milestone plan

Reviewed 2026-09-07. This report supersedes earlier roadmap descriptions where they conflict.
Scope: repository inspection, read-only connected-cloud inspection, official API documentation,
unit/component tests and a production frontend build. No production credentials were introduced.
The browser blocked localhost (`ERR_BLOCKED_BY_CLIENT`); no visual screenshot audit or live
factory end-to-end test was completed. The product-design audit reference also failed to load.

## Audit findings

| Priority | Finding and impact | Change or remaining gate |
|---|---|---|
| P0 | Existing customer-accessible bank-transfer reconciliation could grant paid status | `mark-paid` now rejects customer calls; add a separate platform billing authority later |
| P0 | Connected Supabase uses `profiles`; legacy API authenticates against `users`, which is absent there | Added explicit Supabase mode; verify identity remotely and require trusted app metadata to match the active profile. Reconcile remaining foreign keys before deployment |
| P0 | Profile self-update policy may allow changing authorization columns | Never trust profile role/tenant without server-managed `app_metadata`. Restrict column grants and test revocation before launch |
| P0 | Repo tenant RLS uses `app.tenant_id`; connected policies also use JWT claims and organization membership | No blanket policy replacement. Map identifiers, use a restricted runtime role and run cross-tenant PostgreSQL tests |
| P0 | Startup and connection hooks performed schema/extension DDL | Removed connection DDL; bootstrap now explicitly opt-in for disposable development databases |
| P0 | Target Vercel project is outside currently accessible project list | Accessible team has `mnxtr-github-io`; `mios-manufacturing-pilot` lookup returned 404. No target deployment verified |
| P1 | UI emphasized chat/compliance without trustworthy operational metrics | Operations first, explicit missing data, editable hourly input, gap bars and source table |
| P1 | Knowledge readiness lacked a tenant-scoped aggregate endpoint | Added authenticated dashboard with tenant predicates, pagination, error/empty states and private caching |
| P1 | Stream termination could look like a complete answer | Grok adapter requires completion frame; partial failures emit an error rather than a success event |
| P1 | Unbounded upload reading | Added 20 MiB API read bound and batch UI limits. Proxy size limits, parser isolation, malware checks and decompression limits remain gates |
| P1 | File storage and jobs are not proven durable on deployment platform | Move to private object storage and a durable worker queue before customer documents |
| P1 | Payment redirects could be mistaken for proof of payment | Added sandbox-only gating and verification. No sandbox transaction activates a real subscription |
| P2 | Documentation described Next.js while implementation uses Vite | Updated entry documentation, Vite configuration and build verification |

## First slice delivered

The complete tested path is authenticated knowledge status retrieval → tenant-scoped database
counts → React metrics/status chart → filtered records, with bulk upload acceptance and refresh.
SQLite tests prove application filtering, not PostgreSQL RLS. The additional operations workbench
analyzes supplied observations without writing production records. Activity tracks successful
actions in this browser session only. Facilities are a read-only membership-scoped directory.
Grok and payment adapters are tested with mocked provider responses, not live credentials.

## Milestones and release gates

Effort ranges are planning estimates for a small experienced team, not delivery commitments.

| Milestone | Estimated effort | Scope | Acceptance gate |
|---|---|---|---|
| M0 — Baseline audit | Completed | Code/cloud inventory, current contracts, three layouts, market hypotheses | Findings and unverified assumptions recorded |
| M1 — Evidence workbench | Implemented locally | Linora UI, knowledge dashboard/inbox, deterministic gap analysis, Supabase/Grok adapters | Unit/component tests and Vite build pass; publish code |
| M2 — Secure facility pilot | 1–2 weeks after access | Align organization/tenant/factory identities; restricted DB role; Supabase membership administration; private file storage; facility activation and durable line/shift records | Two-tenant negative tests against Postgres; revoked users denied; backup restore; one factory baseline imported twice without duplication |
| M3 — Operational action loop | 2–3 weeks | Persistent hourly records, CSV column mapping, target versions, downtime reasons, gap assignment/closure, server activity events | Corrected inputs reproduce metrics; missing versus zero survives import; actions have owner, due date and evidence |
| M4 — Knowledge intelligence | 1–2 weeks | Durable parsing queue, source versioning, access-controlled retrieval, bilingual evaluation, Grok usage budgets | Failed jobs retry safely; deletion removes retrieval access; evaluated citations supported by source; no cross-factory excerpts |
| M5 — Commercial sandbox | 1–2 weeks | Merchant-approved bKash/SSLCOMMERZ contract tests, durable payment ledger/IPN validation, retries, reconciliation and refund workflow | Duplicate callbacks have one effect; wrong amount/currency/tenant rejected; sandbox and live entitlements isolated |
| M6 — Paid multi-facility release | 2–4 weeks plus pilot evidence | Portfolio rollups, SLAs, onboarding playbooks, billing exports and managed integrations | Measured customer ROI, support/cost budget, incident drill and staged rollout signed off |

Dependencies: M2 precedes any customer data launch; M3 precedes claims of ongoing activity or
production-cycle tracking; M4 precedes trusted AI recommendations; M5 precedes live collection.
Market interviews and baseline measurement can run alongside engineering. Compliance evidence
search remains secondary; legally or contractually required controls must remain available.

## Pilot evaluation

Recruit one production manager, one IE lead, one line supervisor and one factory sponsor per
pilot. Observe seven baseline shifts before interventions. Record completeness, time to detect
a shortfall, response time, closure rate, and recovered good pieces with documented assumptions.
Compare like styles, staffing, working time and target definitions; do not attribute all change
to the software. A recurrent clock-time gap is an investigation lead, not causal proof.

Go/no-go proposal: at least 90% of planned intervals have reviewed actuals, supervisors use the
board on four of five working days, and the sponsor accepts a quantified business case. These
are proposed success thresholds, not achieved results.
