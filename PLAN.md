# PLAN.md — Linora Multi-Subdomain Product Architecture

**Document status:** Implementation plan, maintained with the code. **Date:** 28 October 2026. **Owner:** Linora MIOS. **Current stage:** Stage 1 public product hubs in a draft GitHub branch; **domain ownership/DNS and customer launch not verified**.

## North star

Linora is one brand and one authenticated, tenant-isolated operating system. Each customer-facing capability may have its own **marketing/education subdomain** without duplicating customer databases, sessions or API authorization. Product domains explain the offer and lead to the canonical application; they **do not independently handle credentials or customer records**. Do not confuse attractive domain names with isolated deployments or finished features.

Brand: **LINORA** / Manufacturing Intelligence Operating System. Product identity: **LINORA / ASK**, **LINORA / KNOWLEDGE**, **LINORA / COMPLIANCE**, **LINORA / ANALYTICS**, **LINORA / QUALITY**, **LINORA / OPERATIONS**, **LINORA / CONNECT**. Positioning: evidence-based factory decisions, executive clarity, accountable workflows. A separate "ME" personal brand is **not assumed or invented**; obtain the official organization name, registered domain and approved legal copy prior to public launch.

## Domain registry and routing (proposed; not active until DNS is connected)

| Proposed host | Audience | Public landing | Real authenticated workspace | Lifecycle |
| --- | --- | --- | --- | --- |
| `linora.ai` / `www.linora.ai` | Buyer / investor | Current Linora homepage | `/dashboard` on canonical app | DNS/brand decision pending |
| `app.linora.ai` | Signed-in factory team | Sign-in | `/dashboard`, `/settings/*` | Auth/cookie/domain migration pending |
| `ask.linora.ai` | Operations / knowledge workers | `/products/ask` | `/ask` | Public hub implemented |
| `knowledge.linora.ai` | Document controllers | `/products/knowledge` | `/knowledge` | Public hub implemented |
| `compliance.linora.ai` | Compliance / executives | `/products/compliance` | `/compliance` | Public hub implemented; workflow security gate open |
| `analytics.linora.ai` | Plant leadership | `/products/analytics` | `/analytics` | Public hub implemented; query provenance gate |
| `quality.linora.ai` | QA team | `/products/quality` | `/quality` | Public hub implemented; workspace feature-flagged |
| `operations.linora.ai` | Executives / plant managers | `/products/operations` | `/dashboard` | Public hub implemented |
| `connect.linora.ai` | IT / integrations | `/products/connect` | `/settings/connectors` | Public hub implemented |
| `docs.linora.ai` | Developers, buyers | Future docs site | Public docs only | Planned, not deployed |
| `status.linora.ai` | Customers | Future incident status page | Public status only | Planned; needs third-party monitoring |
| `api.linora.ai` | Approved integrations | Future API gateway | Authenticated service API | **Do not expose** before reviewed gateway, quotas, CORS and audit trail |

**Important:** `linora.ai` is an example only: we have **not** verified ownership, DNS, or control. `NEXT_PUBLIC_SITE_URL` remains the currently configured canonical app URL until auth migration is reviewed. Every product has a same-app fallback URL, `/products/<slug>`, usable on Vercel without custom domain setup.

## Architecture

- **One Next.js 16 app and one deployment project.** `proxy.ts` performs **exact hostname allowlist** recognition for product public sites. Public marketing paths `/`, `/platform`, `/about`, `/trust`, `/demo` are internally rewritten to product pages; *all other product-host paths, including authenticated routes and API methods, are not served on that host*. This is not a separate deployment or permission boundary.
- **One canonical auth origin** from the reviewed `NEXT_PUBLIC_SITE_URL`; every product's CTA points to an explicit allowed app route on it. No browser cookie sharing across product hosts, no token in the query string, no cross-origin service-role credentials. Email callbacks remain canonical. Never move sign-in to product hosts without Supabase redirect, cookie, CSRF and session review.
- **One source of product content truth** in `apps/web/lib/products/catalog.ts`. Renders seven public product sites and a central product directory without fictional operational statistics or certifications. Feature availability and pilot limitations are explicit.
- **One Supabase Auth/Postgres/Storage** with tenant-scoped RLS, vetted server routes and human review. The marketing subdomains never query private factory tables. Production Supabase is shared with unrelated apps; no migration or production grants should be made for this public-site release.
- **One agent contract** in `AGENTS.md`; each release gate is auditable in GitHub. Existing application `/ask`, `/knowledge`, `/compliance`, etc. remain unchanged.

## Each product: positioning, sections, MVP and launch gates

### 1. ASK — `ask.linora.ai`
**Buyer:** manufacturing managers, analysts and frontline knowledge users. **Promise:** ask questions across authorized factory records with source-backed context. **Landing:** hero with evidence provenance; how it works (query → retrieval → cited response), source types, uncertainty policy, use cases, CTA. **Workspace:** current `/ask`; no invented AI quality claims. **MVP:** tenant-filtered document retrieval, visible citations and no-answer fallback; language support validated. **Gates:** merge and verify canonical RAG implementation; citation correctness, two-tenant JWT tests, hallucination/abstention evaluation, usage limits, provider-failure fallback. **Next:** saved verified responses, multilingual review, executive digests.

### 2. KNOWLEDGE — `knowledge.linora.ai`
**Buyer:** document controllers, QA and compliance teams. **Promise:** organize authorized manuals, SOPs, audit evidence and production tables. **Landing:** source-to-traceability story, access boundaries, upload/index/retrieve lifecycle, preview links. **Workspace:** `/knowledge`. **MVP:** upload, async extraction, indexing, semantic search availability, deletion lifecycle. **Gates:** signed-upload secret handling, MIME/file limits, storage RLS, virus/document hygiene decisions, worker retry, cross-tenant negative tests, private download; baseline 1,000-document pilot. **Next:** version history, expiry warnings, retention and OCR review.

### 3. COMPLIANCE — `compliance.linora.ai`
**Buyer:** C-suite, compliance manager, external auditor. **Promise:** connect requirements, evidence, reviews and corrective actions without calling AI judgments a certificate. **Landing:** premium executive assurance identity; "Evidence. Accountability. Assurance." sections for assessment, evidence, action and human sign-off. **Workspace:** `/compliance`, with future `/compliance/actions` behind gate. **MVP:** template-based assessment, tenant-scoped documents, evidence review, CAP tracking; distinguish human-reviewed verdicts from AI suggestions. **Gates:** production read-path fix verified; privileged writes restricted by role; no automatic `compliant` status; merge/reconcile PRs #34/#35/#37; cross-tenant/RPC/Storage tests; non-destructive staging migration, privacy/retention, audit export checks. **Next:** buyer-specific licensed standards only after authority review, deadline reminders, signed audit manifests. **No legal certification claim.**

### 4. ANALYTICS — `analytics.linora.ai`
**Buyer:** finance, engineering and plant leadership. **Promise:** explain factory indicators with reproducible numbers and computation provenance. **Landing:** production line indicators, source coverage, query traceability, executive decision use cases. **Workspace:** `/analytics`. **MVP:** approved tabular ingestion, traceable aggregation, explicit source table, query/aggregation details, exports. **Gates:** replace misleading SQL disclosure with actually executed query/structured explanation, tenant scope, resource/cost bounds, permission checks, sample-size disclosure and comparison baselines. **Next:** approved saved dashboards, scheduled summaries and alert thresholds.

### 5. QUALITY — `quality.linora.ai`
**Buyer:** QA managers and engineers. **Promise:** find defects, their recurrence and accountable prevention. **Landing:** defect lifecycle, evidence visuals, CAP links, traceability. **Workspace:** existing `/quality` is **feature-flagged and mostly placeholder**. **MVP:** real inspection ingestion, defect taxonomy, Pareto and trends, reviewable corrective actions; no fictitious metrics. **Gates:** evidence-backed data, privacy-aware image uploads, per-factory permissions, calibration and accuracy; keep demo call-to-action only until implemented. **Next:** computer vision inspection assistance with human review and edge deployment.

### 6. OPERATIONS — `operations.linora.ai`
**Buyer:** COO, plant manager, CEO. **Promise:** one concise operational control room with exception-first signals. **Landing:** production, downtime, quality, evidence and action coordination; illustrative graphics must be clearly conceptual. **Workspace:** `/dashboard`. **MVP:** production metrics with time windows, plant/site filters, drill-down and source timestamps. **Gates:** remove hard-coded factory name from customer dashboard, separate mock/demo stats, measure freshness and cross-tenant access, alerting reliability. **Next:** operational workflows, capacity and production planning.

### 7. CONNECT — `connect.linora.ai`
**Buyer:** factory IT, implementation partners, operations leads. **Promise:** bring ERP, exports, folders and documents into governed pipelines. **Landing:** integration lifecycle (connect → validate → map → monitor), source ownership and change safety. **Workspace:** `/settings/connectors`. **MVP:** approved connector catalog, credential-safe ingestion jobs, test connections and sync status. **Gates:** least-privilege key storage, webhook signature validation, per-tenant quotas, failure recovery and audit logging. **Next:** official ERP integrations and monitoring dashboards.

### 8. Shared surfaces
`app` owns identity/onboarding/team/billing and settings. `docs` owns public technical and product documentation (later); `status` owns independently available incidents (later); `api` is strictly gated. Do not create 20 autonomous apps: shared design system, auth boundary, telemetry and content registry are stronger than duplicative infrastructure.

## Design system and content

- Premium dark charcoal, restrained mint, amber exceptions, strong high-contrast typography and generous hierarchy; hero should explain a product in **one statement**.
- Responsive grids and readable forms on 375px iPhone and 1440px desktop; reduced motion, keyboard navigation, semantic headings, sufficient contrast and independent text status alongside color.
- Modular structure: **brand positioning → hero → four capability pillars → 3-step operational flow → assurance note → human-reviewed CTA → product directory**.
- Never invent customer names, live KPIs, prices, accreditations, official buyer requirements or a "certified compliant" score. Use honest capabilities and distinguish concept/preview from verified releases.
- Public pages can be indexed. Authenticated pages, API and private data may not become public via a rewrite.

## Implementation phases and acceptance

### Phase 0 — architecture and contract (this PR)
- [x] Write `PLAN.md` and `AGENTS.md`.
- [x] Inventory existing routes/flags, production deployment and open security blockers.
- [x] Select single codebase, public host rewrites and canonical app sign-in strategy.
- [ ] Approve final brand and ownership of `linora.ai` (or replace with the actual domain).

### Phase 1 — product hubs (implemented in branch)
- [x] Central registry for seven products, route to their own copy and workspace.
- [x] Public `/products` directory, `/products/[product]` landing, and informational pages.
- [x] Recognize exact proposed product hostnames with safe public-only rewrites and no session sharing.
- [x] Add public site navigation and responsive branded design.
- [x] Add pure routing and content-registry tests.
- [ ] Green CI, Vercel preview, reviewer signoff, authenticated-browser checks.

### Phase 2 — DNS/auth launch (requires domain ownership)
- [ ] Verify domain ownership with registrar; connect `linora.ai` on Vercel and issue SSL for each approved host.
- [ ] Configure `LINORA_PRODUCT_DOMAIN` for allowlisted host mapping only after DNS/SSL approval.
- [ ] Test each host: 200 public landing, 301/302 safe canonical app links, API/private routes blocked, security headers, sitemap/robots/SEO and external callback flows.
- [ ] Review migration of canonical login to `app.linora.ai` **separately**: Supabase redirect allowlist and single cookie origin. No wildcard CORS, token forwarding or global cookie scope.
- [ ] Conduct C-suite iPhone and desktop usability checks; validate intended buyer behavior.

### Phase 3 — production functionality
- [ ] Resolve repository security P0s ([#18](https://github.com/mnxtr/M_I_OS/issues/18), [#36](https://github.com/mnxtr/M_I_OS/issues/36)).
- [ ] Integrate reviewed compliant assessment writes, human approval, action timeline and evidence rules.
- [ ] Restore and test RAG, uploads, analytics provenance, payment callback, worker retry and disaster recovery.
- [ ] Verify telemetry and monitor each public host; link deployments and runbooks to Notion.

### Phase 4 — native iOS
- [ ] Customer research and role-specific executive screen map; decide web/PWA/Expo or native SwiftUI.
- [ ] Confirm secure API authorization and session handling, background notifications and app review constraints.
- [ ] Implement read-first executive portfolio, actions and evidence deep links; no secrets in app bundles.
- [ ] Test on physical devices and managed tenant accounts before any App Store claim.

## Release test plan

1. `/products` lists seven capabilities; `/products/{id}` and `/products/{id}/{about|platform|trust|demo}` respond with accurate content.
2. Only exact `{id}.{configured-domain}` hostnames match. An attacker-controlled suffix, malformed host, prefixed name, `api.`, or `app.` does not rewrite.
3. On a matched public product host `/` and informational paths rewrite to the *same product*; no open redirect or request-driven target origin.
4. Matched product host `/login`, `/dashboard`, `/api/*`, `/callback`, `/guest` cannot run customer auth or data endpoints there. Product CTA uses canonical app origin from trusted config, not user Host.
5. Existing MIOS root, auth and workspace paths retain behavior on the production hostname.
6. CI: Vitest, lint, TypeScript and Next build; Vercel preview READY. Dedicated browser and signed-in tests are required for production release.

**Operational caveat:** This plan and code **do not** register a domain, configure DNS, provision a new Heroku app, migrate Supabase sessions or merge previous draft PRs. The domains remain proposals until verified.

## External references

[GitHub #18](https://github.com/mnxtr/M_I_OS/issues/18) · [GitHub #36](https://github.com/mnxtr/M_I_OS/issues/36) · [Compliance fix PR #38](https://github.com/mnxtr/M_I_OS/pull/38) · [Action Center PR #37](https://github.com/mnxtr/M_I_OS/pull/37) · [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security)
