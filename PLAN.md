# Linora MIOS — Platform & Subdomain Plan

**Established:** 28 October 2026  
**Status:** Implementation underway on a review branch; **not** a production release  
**Parent identity:** Linora | **Product:** MIOS — Manufacturing Intelligence Operating System  
**Audience:** Factory owners, C-suite, compliance leaders, production managers, auditors, and partner operators.

## North star

Give every major MIOS capability a clear, recognizable entrance with its own narrative, information architecture, and eventually a dedicated first-party subdomain—**without multiplying databases, logins, authorization rules, or operational cost unnecessarily**.

Brand promise: **From manufacturing evidence to confident decisions.**  
Compliance promise: **Evidence. Accountability. Assurance.**  
The software supports preparation and human review; it does not certify a factory, guarantee regulatory compliance, or replace an accredited auditor.

## Domain truth & deployment contract

- **Proposed—not verified owned:** `linora.ai`; obtain legal/domain-owner confirmation before using it publicly or setting `LINORA_ROOT_DOMAIN`.
- **Existing canonical workspace:** `https://mios-manufacturing-pilot.vercel.app`, configured by `NEXT_PUBLIC_SITE_URL`.
- **Runnable now (on the existing Next.js deployment):** branded public pages at `/portals`, `/portals/<slug>`, `/portals/<slug>/platform`, `/portals/<slug>/about`, `/portals/<slug>/trust`, `/portals/<slug>/demo`.
- **After DNS approval:** all supported `<slug>.<LINORA_ROOT_DOMAIN>` hostnames can share the **same** Next.js deployment; host-to-portal rewrites are restricted to known hosts and public pages. Never wildcard-rewrite an unknown host.
- **Authentication:** existing Supabase Auth is centered on the canonical app. Portal CTAs link to that canonical HTTPS site, not a new per-subdomain cookie or unverified SSO. Cross-subdomain SSO is **not** part of initial launch; a reviewed SSO architecture, trusted redirect allowlists, and same-site cookie threat model must precede it.
- **Data:** keep existing Supabase project/schema, RLS and verified factory tenant boundaries; do not create parallel accounts, evidence databases, or privileged RPCs for marketing portals.
- **Sensitive-data gate:** issue #18 cross-tenant JWT isolation tests and issue #36 production release gates remain mandatory.

## Subdomain product architecture

| Priority | Proposed hostname | Module | Canonical authenticated destination | Initial promise |
| --- | --- | --- | --- | --- |
| P0 | `app.linora.ai` | Executive Workspace | `/dashboard` | Operations and decisions in one view |
| P0 | `compliance.linora.ai` | Compliance Assurance | `/compliance` | Assessments, evidence gaps, corrective action and audit preparation |
| P0 | `ask.linora.ai` | Ask Linora | `/ask` | Grounded questions on factory evidence |
| P0 | `knowledge.linora.ai` | Knowledge Hub | `/knowledge` | Documents, retrieval and source provenance |
| P1 | `analytics.linora.ai` | Analytics | `/analytics` | Explainable operations metrics, not invented numbers |
| P1 | `quality.linora.ai` | Quality | `/quality` | Defect intelligence; capability remains flag-gated/early stage |
| P1 | `integrations.linora.ai` | Integrations | `/settings/connectors` | Reliable data connections and lineage |
| P1 | `accounts.linora.ai` | Identity & Teams | `/settings/team` | Roles, invitations and secured identity |
| P1 | `billing.linora.ai` | Billing & Plans | `/settings/billing` | Transparent entitlements and invoices |
| P2 | `governance.linora.ai` | Governance & Audit | `/settings/audit-log` | Reviewable records and accountability; feature may be unavailable |

**Do not interpret a portal route as proof the linked module is complete.** Product catalog data labels what is available, gated, or pending review.

## Experience & identity

- Global visual DNA: Linora wordmark, ink/graphite backgrounds, mint signal accent, restrained gradients/grid texture, accessible type, Bangla-ready typography, and explicit human-review disclaimers.
- Each module has its own **accent, iconography, value statement, workflow strip, and capability cards**. Avoid template pages with fake dynamic numbers or manufactured endorsements.
- Mobile-first: one-column small-screen reading; 375px minimum, 44px tap targets, no hover-only controls; reduced motion, semantic headings and keyboard focus.
- Suite index acts as product directory; per-module public information architecture: `Overview → Platform → About → Trust → Explore / Demo`, with direct links to the existing protected workspace.
- Brand content and existing application screens remain intact. Do **not** replace existing `/compliance`, `/ask`, `/knowledge`, `/analytics`, etc., with marketing pages.

## Implementation work packages

### Phase 0 — Plan, security boundaries and catalog (this branch)
- [x] Write `PLAN.md` and `AGENTS.md` with governance and release rules.
- [x] Define one typed portal catalog, canonical application routes and strict host matching.
- [x] Add read-only branded suite/module portal routes without new Supabase queries.
- [x] Add hostname routing only when `LINORA_ROOT_DOMAIN` is configured.
- [x] Add unit tests for unknown hosts, origin/link safety, and all portal slugs.
- [ ] Verify CI, Vercel preview, keyboard/mobile UX and accessibility.

### Phase 1 — Domain & authentication verification
- [ ] Prove ownership of brand/root domain; decide `linora.ai` or company-owned alternative.
- [ ] Confirm DNS registrar, assign Vercel domain aliases one at a time, verify SSL and origins; no invented domain or promised live links.
- [ ] Configure `LINORA_ROOT_DOMAIN` **only after** domain assignment; test unknown-host rejection.
- [ ] Maintain canonical Supabase Auth URL/redirect allowlist; test login/password reset/email OTP from every portal CTA; no cross-domain cookie sharing without a reviewed security design.
- [ ] Complete two-factory JWT isolation checks on real user sessions with non-owner roles.

### Phase 2 — Core capability integrations
- [ ] Compliance: reconcile PR #34/#35 redesigns and PR #37 Action Center, verify human approval of positive findings; complete secure assessment writes and end-to-end evidence flow.
- [ ] Ask: unify tenant-safe hybrid RAG (PR #28), citations, no-evidence abstention, Bangla/English tests, latency/usage limits.
- [ ] Knowledge: signed upload/download, ingestion retry and failure recovery, document permissions, versioning/retention.
- [ ] Executive: trustworthy data provenance, action prioritization and date/tenant filters.

### Phase 3 — Operational and enterprise modules
- [ ] Analytics: reproducible calculations and executed-query provenance; do not claim sample-ranked SQL is executed SQL.
- [ ] Quality: validate underlying data sources, defect taxonomy, human-reviewed results; only enable flag when real backend is ready.
- [ ] Integrations: documented connector scopes, per-tenant secrets, sync status, rate limits, rollback.
- [ ] Accounts: role-based team invites, restricted audit logs and onboarding; permission escalation negative tests.
- [ ] Billing: provider callback signature verification, idempotent reconciliation and cancellation/entitlement tests.
- [ ] Governance: append-only auditable events, retention/access policy and approvals before activating.

### Phase 4 — iOS and scale
- [ ] Validate buyer demand with executive interviews; prioritize an excellent responsive web experience and optional PWA before a native iOS build.
- [ ] Native iOS using an authenticated mobile-specific API and PKCE, secure token storage, minimal permissions, read-first C-suite views, accessibility, push opt-in.
- [ ] Load tests, error budgets, disaster recovery drills, SLA and cost telemetry, paid pilot sign-off.

## Acceptance and strict no-go gates

1. Every portal page is static/read-only; no unauthenticated customer data, tenant IDs, API keys or access tokens ever rendered.
2. Unknown `Host`, prefix tricks, wrong root domain, malicious `next` paths, and public preview deployments cannot impersonate branded hostnames.
3. All CTA URLs point only to the **configured trusted canonical site**, never to untrusted user-supplied hosts.
4. No live application or database changes based solely on a marketing page passing CI.
5. New compliance writes must use a separately reviewed RLS/user-permission path (or privileged backend with verified tenant/role checks), and changes must be tested in isolated staging.
6. Screenshot/UI review at iPhone width and desktop, screen-reader semantics, no fictional KPIs or implied certifications.
7. Do not merge overlapping compliance PRs blindly or migrate the shared Supabase database without impact review.
8. Every release includes a reviewed SHA, green CI, real auth/integration smoke tests, monitoring and rollback procedure.

## Evidence and relationship to existing work

- Existing repository: https://github.com/mnxtr/M_I_OS
- Security gate: https://github.com/mnxtr/M_I_OS/issues/18
- Production launch gate: https://github.com/mnxtr/M_I_OS/issues/36
- Compliance Action Center draft: https://github.com/mnxtr/M_I_OS/pull/37
- Existing compliance redesign drafts: https://github.com/mnxtr/M_I_OS/pull/34 and https://github.com/mnxtr/M_I_OS/pull/35
- Tenant-scoped retrieval draft: https://github.com/mnxtr/M_I_OS/pull/28

## Rollback

Keep module portals on a review branch until acceptance; hostname mapping remains dormant by default. Rollback is a Vercel deployment rollback or setting `LINORA_ROOT_DOMAIN` unset, followed by a redeploy. No schema or customer data migration is required for the portal layer.
