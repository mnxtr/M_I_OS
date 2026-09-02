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

### Environment notes

- The project mirror's `node_modules/.bin/next` resolves to an older checkout. The source tree's
  direct local binary builds successfully; a clean `npm ci` in CI/Vercel will not inherit this
  workstation-only path issue.
- The root disk was full. Only the disposable npm content cache was removed; no project source or
  user data was deleted.
- Local `.git` metadata is read-only in this project mirror, so the delivery branch and PR must be
  created through the GitHub API after the verified file set is finalized.

### Next tasks

1. Run the canonical migration and RLS integration matrix against a live isolated Postgres service.
2. Add browser automation and component accessibility checks to CI.
3. Add Render web/worker definitions and finish the Vercel/Supabase deployment runbook.
4. Remove direct browser access to pilot business tables after FastAPI endpoint parity.
5. Run final secret/status checks.
6. Create `codex/mios-pilot-foundation`, publish the commit set, open the immediate PR, and create
   the linked epics.
7. Deploy the tested frontend preview and perform the shareable pilot walkthrough.
