# Linora — Ten Subdomain Delivery Blueprints

**Purpose:** Concrete design, frontend, backend, database and go-live sequence per module. Public brochure landing routes are implemented as a shared Next.js app under `/portals/<slug>`. All `*.linora.ai` hostnames below are **proposals**, pending ownership, DNS and TLS verification. Initial brand is **Linora** with **MIOS** as the underlying Manufacturing Intelligence OS. No new paid service, database or independent SSO is authorized by this document.

Every workstream includes: **User → User outcome → Frontend → API/service → Data/security → Verification → Launch gate.** All modules reuse existing tenancy, authentication, documentation and CI. The status in the catalog is descriptive, not a guarantee of production readiness.

## 01 · app.linora.ai — Executive Workspace (P0)

**User/outcome:** CEO, COO, owner; identify exceptions, decide what merits a visit or escalation, delegate follow-up.  
**Public UX:** "One operating picture" hero, four-step Observe/Prioritize/Delegate/Review illustration, operational-pulse and decision-queue value cards, direct canonical `/dashboard` entry. Do not show imaginary live throughput or a fake operational score.  
**Authenticated UI:** Existing `/dashboard`; later a compact mobile-first daily briefing with source timestamps, linked exceptions and drilldowns to other module workspaces.  
**API:** Use existing dashboard summary route; every metric needs tenant scope, an explicit data interval and provenance. Avoid evaluating on privileged global service clients.  
**Database:** Reuse factories, documents, usage and future verified factory feeds. Add no new schema for a landing page.  
**Tests:** Tenant A/B isolation, empty dataset, stale data, no metrics configured, slow Supabase, responsive iPhone 375px.  
**Gate:** Pass end-to-end review for metrics, status, availability, and non-technical executive usability.

## 02 · compliance.linora.ai — Compliance Assurance (P0)

**User/outcome:** Compliance manager, factory owner, authorized auditor; organize assessments, resolve gaps with evidence and human sign-off.  
**Public UX:** "Evidence, not assumptions" with Assurance editorial look, 4-step Assess/Trace/Correct/Verify, distinct standards explanation, evidence protocol and clearly labeled human review. No "certified" green state without independent verification.  
**Authenticated UI:** Existing `/compliance` read path and assessment workspace; integrate one reviewed redesign from PR #34/#35 and Action Center PR #37. Do not merge overlapping PRs blindly.  
**API:** Existing Next.js compliance assessment and item endpoints; remove privileged template seeding from reads (PR #38 already merged). For writes, authorize against up-to-date active profile role; use caller-scoped RLS or a reviewed privileged service with audit records.  
**Database:** Existing checklist_templates, assessments, assessment_items; new compliance_actions is **review-only SQL** until staged and approved. No live mutations as part of this portal.  
**Tests:** Tenant-crossing attempts, authenticated/no-tenant behavior, reviewer-role enforcement, PDF/source citations, revoked account, failure recovery, correct CAP semantics, direct PostgREST negative tests.  
**Gate:** Full human-in-the-loop approval, evidence traceability, cross-tenant test report and real deployment smoke test. Separate Heroku deployment remains unverified.

## 03 · ask.linora.ai — Ask Linora (P0)

**User/outcome:** Executive and engineer; retrieve reliable answers grounded in permitted factory records.  
**Public UX:** Question-to-evidence concept visualization with no fabricated AI chat response; "The answer should have a source."  
**Authenticated UI:** Reuse `/ask` and existing language toggle. Product improvement later: compact source panel, follow-up references, explicit "not enough evidence", loading and cancellation states.  
**API:** Reconcile existing lexical Next.js chat with hybrid retrieval FastAPI draft PR #28. Define a single canonical tenant-aware retrieval service with trace IDs, request limits, safe evidence filtering and provider errors.  
**Database:** Existing documents, chunks, pgvector; no replicated vector databases per hostname.  
**Tests:** Tenant A/B leakage, Bangla/English grounding, empty/contradictory sources, prompt-injection resistance, token/cost caps, citation correctness and eval regression baseline.  
**Gate:** A reproducible staging quality evaluation, a passing authorization gate and acceptable latency under pilot load.

## 04 · knowledge.linora.ai — Knowledge Hub (P0)

**User/outcome:** Knowledge manager, process engineer, compliance team; securely find, verify and maintain source documents.  
**Public UX:** Layered source-to-answer flow, catalog cards for document library, parsing and source provenance.  
**Authenticated UI:** Reuse `/knowledge`, document detail pages, existing upload/download routes. Add document/version/owner metadata, meaningful empty states and mobile search as a subsequent sprint.  
**API:** Signed upload, register, process, document read/delete/download; ensure all use verified tenant identity and never expose privileged key.  
**Database/storage:** Existing documents, chunks, storage buckets, lifecycle states. Protect files across both database and Storage RLS, validate size/MIME and support virus scan strategy when introduced.  
**Tests:** Cross-tenant download and URL swapping, oversize uploads, incomplete ingestion, retry, document reindex and deletion consistency, signed URL expiration.  
**Gate:** End-to-end upload→index→retrieval→download with synthetic data, restore drill and permission audit.

## 05 · analytics.linora.ai — Manufacturing Analytics (P1)

**User/outcome:** COO, operations analyst, finance; explain what changed and why with reproducible measures.  
**Public UX:** "Numbers that explain themselves"; Connect/Validate/Analyze/Explain, clear note that displayed imagery is conceptual.  
**Authenticated UI:** Reuse `/analytics`; deliver a properly sourced metric explorer with date, line, factory and dataset coverage selectors after backend is verified.  
**API:** Existing Next.js and FastAPI analysis routes require reconciliation. Explicitly distinguish returned calculation method from SQL truly executed; no arbitrary SQL or cross-tenant scans.  
**Database:** table_sources/table_rows and audited optional factory integrations; row-level tenant boundary and read-only analytics role.  
**Tests:** Numeric benchmark fixtures, reporting-period correctness, row caps, invalid query handling, SQL guard coverage and transparent aggregation.  
**Gate:** Analysts can reproduce each displayed number from the labeled dataset, with safe query plans.

## 06 · quality.linora.ai — Quality Intelligence (P1)

**User/outcome:** Quality director and manufacturing engineer; understand defects and improve work instructions.  
**Public UX:** Capture/Classify/Investigate/Improve conceptual journey; visually distinct inspection motif.  
**Authenticated UI:** Existing `/quality` shell is feature-flagged and may not be ready. Do not present it as fully live. Build canonical taxonomy, approved defect-event record, trend explorer, human-verified root cause and action closeout after product discovery.  
**API:** Read-only defect summaries first; write/update endpoints only after role model and source-system design are approved.  
**Database:** Propose quality events with tenant, source, line, product, defect code, confidence and reviewer; do not create until migration review.  
**Tests:** Provenance, insufficient data, false-positive handling, role isolation and duplicate ingestion.  
**Gate:** Usable pilot defect data and agreed taxonomy; no autogenerated blame or unreviewed machine decisions.

## 07 · integrations.linora.ai — Integrations (P1)

**User/outcome:** IT owner, ERP manager, implementation engineer; responsibly connect factory data systems.  
**Public UX:** Authorize/Connect/Monitor/Maintain, secure connector story with no claim all ERP vendors are natively supported.  
**Authenticated UI:** Reuse `/settings/connectors`; later add connection health, last-sync timestamp and scoped remediation.  
**API:** Read-only connector configuration first. Background jobs must use tenant-scoped connection records, vaulted secrets, bounded retries, deterministic deduplication and idempotency.  
**Database:** Existing connector references; future encrypted credentials and sync run history in protected/private schema, no public secrets.  
**Tests:** Expired tokens, malformed payloads, cross-factory secret access, replay, partial import, backoff and revocation.  
**Gate:** One verified connector with operator runbook and permission review, not a long list of promised integrations.

## 08 · accounts.linora.ai — Identity & Teams (P1)

**User/outcome:** Owner, administrator, IT; manage who can see and change factory information.  
**Public UX:** Invite/Verify/Authorize/Review; clarify single MIOS identity and no independent SSO claim.  
**Authenticated UI:** Existing `/settings/team`; canonical `/login`, `/register`, `/onboarding`, recovery, OTP remain hosted on the trusted main site.  
**API:** Verified Supabase JWT claims and live profile role for privileged actions, invite/revoke, onboarding authorization. Avoid relying on stale role tokens after changes.  
**Database:** Profiles, factories, auth.users, team invitations; least-privilege RLS and protected app_metadata.  
**Tests:** Admin vs operator, disabled users, invitation token replay, forged metadata, tenant-swapping JWT, signup/OTP/reset redirects.  
**Gate:** Two-factory role-isolation and account recovery E2E; independent domain SSO deferred.

## 09 · billing.linora.ai — Billing & Plans (P1)

**User/outcome:** Factory owner and finance; understand plan entitlements, payments, invoices and renewal expectations.  
**Public UX:** Choose/Authorize/Reconcile/Review. No unsupported price claims or payment success simulation.  
**Authenticated UI:** Existing `/settings/billing`; show source-verified entitlements and downloadable invoices only where real.  
**API:** Payment provider verification (including bKash where configured), callback signature checks, deduplication, reconciliation and admin/manual correction with audit trail.  
**Database:** Existing payments/monthly_usage; ownership-checked invoices and tenant billing records.  
**Tests:** Forged callback, replay/idempotency, pending transfer, charge/refund state, cross-factory invoices and expiry.  
**Gate:** Financial reconciliation verified against provider sandbox or authorized live test; never trust a customer's own "paid" flag.

## 10 · governance.linora.ai — Governance & Audit (P2)

**User/outcome:** Audit committee, security owner and leadership; review consequential changes and evidence of responsible operations.  
**Public UX:** Define/Observe/Investigate/Improve, transparent trust principles and accurate readiness labels.  
**Authenticated UI:** Existing `/settings/audit-log` is feature-gated; do not activate a placeholder with fabricated records. Later permission review, export and policy references.  
**API:** Auditable write events for privileged operations and decision approvals, redacted error/event metadata, account owner exports with access logs.  
**Database:** Consider append-only events and retention policy on a dedicated, least-privilege schema after migration and shared-project owner review.  
**Tests:** Event immutability, actor authenticity, retention, data minimization, role boundaries and cross-tenant exports.  
**Gate:** Verified alerting, legal/privacy review, operational retention and incident-handling playbook.

## Shared implementation and deployment decision

1. Shared site and codebase: one Next.js project, one typed portal catalog, one Supabase Auth backend and scoped APIs. First-party hostname routing is an **opt-in marketing rewrite only**; protected customer work continues on the canonical application.
2. Proposed DNS: one verified company-owned root domain; explicit hostnames attached to Vercel. DNS records and TLS checked independently, no speculative wildcard domain provisioning.
3. Shared QA: React/Next build, TypeScript tests, mobile audit, semantic accessibility, all unknown-host negative cases, backend integration and backup restore.
4. Sequence: P0 portal discovery pages and routes → identity/domain security → trusted operational read paths → reviewed writes and evidence workflows → selective executive iOS.
5. Per-module acceptance: named owner, functioning feature, synthetic cross-tenant authorization tests, operational logs, rollback and clear public labeling of planned capabilities.

## Honest current-state notes

- Public portal routes in this change are implemented code, **not** evidence of a production deployment.
- Quality and Governance are planned/flagged. The other modules have existing entry routes, but some backend integrations and tenant isolation tests remain incomplete.
- `PLAN.md` and root `AGENTS.md` are the controlling implementation and review documents.
- The earlier Compliance Action Center PR #37 is open; the incident fix #38 has already merged. Do not overwrite unrelated current application routes.
