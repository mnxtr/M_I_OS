# MIOS work log

This log records material implementation work against the canonical [`PLAN.md`](../PLAN.md).
Use one dated section per work session. Mark only verified outcomes as complete.

## Status legend

- ✅ Complete and locally verified
- 🟡 Implemented but awaiting a named verification or deployment step
- ⏳ Planned/not started
- ⛔ Blocked, with the blocking condition stated

## 2026-09-02 — M0 Pilot Foundation

### Completed

- ✅ Audited the existing Next.js, FastAPI, Supabase pilot, documentation, and uncommitted frontend
  work without overwriting prior changes.
- ✅ Pinned the dashboard/auth dependencies: Recharts 3.10.1, `react-is` 19.2.8,
  `@supabase/ssr` 0.12.5, and `@supabase/supabase-js` 2.113.0.
- ✅ Added Supabase SSR browser/server clients, cookie refresh middleware, PKCE callback route,
  invitation-only email-link sign-in, resend cooldown, neutral response, session-expired and invalid
  link states, and sign-out support.
- ✅ Added FastAPI Supabase JWT verification through JWKS with issuer, audience, signature, and
  expiry validation; retained legacy validation only when Supabase is not configured.
- ✅ Added application identity linkage (`auth_user_id`), factories, factory memberships, role
  capabilities, and membership-aware `/v1/auth/me` output.
- ✅ Deprecated custom password registration/login at runtime when Supabase mode is active.
- ✅ Added the role-filtered, bounded `GET /v1/dashboard` contract with chart-ready production,
  quality, compliance, maintenance, actions, evidence, warnings, and freshness data.
- ✅ Added an authenticated same-origin Next.js dashboard route that forwards a verified Supabase
  session to FastAPI and uses explicitly labelled deterministic seed data when the API is absent.
- ✅ Built the graphical Command Center with factory/date/line/shift controls, seven KPI cards,
  production trend, line ranking, quality Pareto, compliance readiness, maintenance health, action
  pipeline, evidence health, freshness indicators, raw-data tables, and CSV downloads.
- ✅ Added English/Bangla dashboard and sign-in strings, selected-navigation semantics, upload
  labelling, focus treatment, reduced motion, responsive one/two-column layouts, and non-color status
  text.
- ✅ Dynamically loaded interactive charts so the workspace shell is not blocked by chart code.
- ✅ Consolidated previous roadmap, frontend, and pilot documents into canonical `PLAN.md` v2.0.
- ✅ TypeScript strict check passed.
- ✅ Next.js production build passed on Node 22 by invoking the local Next binary directly.
- ✅ Created `codex/mios-pilot-foundation`, reconciled it onto the newer `main`, and opened draft
  PR [#2](https://github.com/mnxtr/M_I_OS/pull/2). The PR deliberately restores Next.js after a
  concurrent Vite migration because the approved SSR/auth/proxy architecture requires it.
- ✅ GitHub CI run 5 passed on the PR commit.
- ✅ Created linked epics [#3](https://github.com/mnxtr/M_I_OS/issues/3) through
  [#12](https://github.com/mnxtr/M_I_OS/issues/12) for identity, dashboard, evidence/RAG,
  production, quality, actions, compliance, reliability, connectors, and maintenance.
- ✅ Added Vercel and Render deployment definitions; created a Vercel Preview build from the
  verified web project with only the public Supabase project variables.

### In progress / verification pending

- ✅ Browser verification completed at desktop and 390 px mobile widths in English and Bangla;
  date filters update all visible metrics, raw tables expand, and neither viewport has page-level
  horizontal overflow.
- ✅ Python lint passed and 71 database-independent tests passed, including dashboard bounds,
  totals, and unauthorized-module omission.
- ✅ Added a forward-only Alembic migration for Supabase identity linkage, factory/membership
  backfill, capability seeds, and forced tenant RLS with write checks.
- 🟡 Live-Postgres migration and integration test (the local database service is not running).
- 🟡 Removal of direct-browser access to the temporary `mios_*` pilot tables after API parity.
- 🟡 Environment/runbook updates for Vercel, Render, and Supabase Auth redirect configuration.
- ⛔ The created Vercel URL is currently protected and the connected account could not generate a
  23-hour share bypass. A team owner must expose/approve that preview before it is pilot-shareable.

### Environment notes

- The project mirror's `node_modules/.bin/next` resolves to an older checkout. The source tree's
  direct local binary builds successfully; a clean `npm ci` in CI/Vercel will not inherit this
  workstation-only path issue.
- The root disk was full. Only the disposable npm content cache was removed; no project source or
  user data was deleted.
- Local `.git` metadata is read-only in this project mirror, so the delivery branch, PR, and epics
  were created through the GitHub API after the verified file set was finalized.

### Next tasks

1. Run the canonical migration and RLS integration matrix against a live isolated Postgres service.
2. Add browser automation and component accessibility checks to CI.
3. Finish the Vercel/Supabase redirect and production-promotion runbook.
4. Remove direct browser access to pilot business tables after FastAPI endpoint parity.
5. Have a Vercel team owner expose/approve the protected preview, then perform the external pilot
   walkthrough.
6. Begin M1 Trusted Evidence Core after M0 isolation and deployment gates pass.

## 2026-09-03 — M1 Trusted Answer Foundation

### Completed

- ✅ Replaced fragmented OpenAI Chat Completions calls with one server-side Responses API adapter
  shared by grounded chat, guarded analytics, and compliance generation.
- ✅ Added environment-controlled model, reasoning effort, verbosity, timeout, and provider-storage
  settings; selected `gpt-5.6-terra` as the cost/intelligence pilot default.
- ✅ Hardened MIOS prompts against instructions inside retrieved evidence and retained human approval
  language for consequential operational actions.
- ✅ Added the first brain orchestration contract: provider/model, trace ID, confidence, evidence
  coverage, freshness, limitations, suggested actions, latency, and safe evidence-only fallback.
- ✅ Normalized chat streaming to `metadata`, `citation`, `warning`, `token`, and `done` events.
- ✅ Routed frontend chat through authenticated same-origin Next.js endpoints instead of direct reads
  from the seeded answer table; FastAPI remains the authoritative live path.
- ✅ Added a clearly labelled deterministic fallback for previews without FastAPI/OpenAI and rendered
  provenance, confidence, coverage, trace, limitations, next step, and citations in Ask MIOS.
- ✅ Verified the seeded SSE route and the complete Ask MIOS interaction in the browser, including a
  Bangla question, Bangla answer, metadata, warning, next step, and citation.
- ✅ Added focused brain tests; Python lint, strict TypeScript, and all 74 database-independent tests
  passed. The local `TestClient` integration module still waits for unavailable service state and is
  left to the clean GitHub runner/live-Postgres gate.

### Pending

- 🟡 Add `OPENAI_API_KEY` only to the Render secret environment and run a live Responses API smoke
  test; no API key is available in this local task environment.
- 🟡 Persist conversations, response usage, retrieval evidence, latency/cost, feedback, and audit
  events through a forward-only migration.
- 🟡 Validate model quality and cost against the reviewed Bangla/Banglish/English golden set before
  changing the pilot default or enabling tool calls.
- 🟡 Add structured `action_draft` generation behind an explicit human approval workflow.
