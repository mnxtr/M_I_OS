# MIOS redesign and release readiness

## Delivery plan

1. Audit source, dependencies, CI, authentication and linked services.
2. Fix dependency/build issues and ignore local tooling artifacts, preserving user files.
3. Redesign sign-in and every workspace module with graphite surfaces, blue accents,
   readable typography, bilingual support, accessible focus states and responsive layouts.
4. Repair redirects, session cookies, stale dashboard responses and hidden request failures.
5. Run backend lint/tests, dependency checks, TypeScript, frontend lint/build and browser tests.
6. Publish a GitHub review branch and Vercel preview where credentials permit; record production gaps.

## Initial findings

- Missing frontend ESLint tooling and API Alembic dependency.
- Three frontend dependency advisories in the initial clean install (two high, one critical).
- Callback redirect edge case, discarded session cookies and dashboard request race.
- Supabase is shared with other applications; restrict database work to MIOS-owned resources.
- Untracked editor/runtime files under workspace are unrelated to the codebase; ignore, retain.
- No MIOS project in the connected Vercel team.
- The Supabase pilot uses deterministic seed data; live ingestion/RAG requires the separate API.

## Verification and deployment

- Frontend: lint and strict TypeScript pass; Next.js production build passes.
- Browser: 8 tests pass across desktop/mobile, including WCAG A/AA automated checks for sign-in
  and dashboard, language persistence, all module navigation, streamed citations and invalid inputs.
- Dependencies: npm audit reports zero vulnerabilities. Next.js 15.5.25, PostCSS 8.5.28 and
  Sharp 0.35.4 resolve the initial advisories. ESLint 9 is retained for Next 15 compatibility;
  a future Next 16/tooling upgrade should be planned separately.
- API: 75 tests pass locally; all 77 tests pass in GitHub's isolated database environment,
  including fresh migration, registration/login and tenant-isolation verification.
  Python dependencies are compatible and pinned in requirements.lock; CI and Render consume it
  as a constraints file. Alembic's full upgrade SQL compiles offline.
- Repaired the empty baseline migration, the historical revision's 33-character identifier,
  registration's tenant UUID timing, and database connections performing unnecessary schema DDL.
  CI now migrates a fresh pgvector database and tests real tenant isolation with a restricted role.
- Supabase: all nine mios_* pilot tables have RLS; ownership policies include USING/WITH CHECK
  and reject anonymous users. The pilot document bucket is private and limited to 15 MB.
  No shared database schema or records were changed.
- Local editor/runtime files are ignored and retained. Disposable npm cache was cleared after
  disk exhaustion; npm can regenerate it. No source or user records were deleted.

## Delivery boundary

Remote main has diverged into another implementation. This release is based on the checked-out
codex/mios-pilot-foundation branch; the review PR targets that branch. Reconcile with main explicitly
before promoting there. Do not overwrite the newer main application with this pilot tree.

- Review: https://github.com/mnxtr/M_I_OS/pull/15
- Verified CI: https://github.com/mnxtr/M_I_OS/actions/runs/34641585165
  API, web and secret scanning all passed. Browser tests: 8 passed; API: 77 passed;
  clean npm installation/audit: zero vulnerabilities for this branch.
- Vercel's existing GitHub integration successfully deployed the release to the mios2 / m-i-os
  project: https://m-i-os-git-feature-mios-premium-release-mios2.vercel.app
  GitHub deployment 6400701718 reports success for commit 3a4f459. The preview is protected by
  Vercel SSO; an HTTP check reaches the Vercel login screen, so authenticated hosted smoke tests
  are not claimed. The connected Vercel app lacks access to mios2 (HTTP 403).
- A separate older mios-manufacturing-pilot-preview integration failed. Its failure is distinct
  from the successful m-i-os deployment and requires reviewing that project's configuration.
- Direct deployment through the connected app to mios-web returned HTTP 403. The published
  preview above comes from the repository's existing GitHub integration, not that failed attempt.
- The divergent main branch still has its own dependency alerts. This branch's clean audit does
  not imply those alerts are resolved in main; merge/reconciliation remains separate work.

## Remaining production work

- The preview still uses labelled deterministic dashboard/chat data without MIOS_API_URL.
- Analytics/compliance/knowledge retain the Supabase pilot implementation. Uploads are stored, but
  the pilot does not implement production parsing/indexing. A live FastAPI/worker deployment and
  durable object-storage integration remain prerequisites for a production RAG release.
- Configure Preview/Production Supabase URLs and publishable keys independently. Allow the exact
  deployment callback URL in Supabase Auth, then test an invited user's email link, upload,
  assessment editing and binder export. No real authentication email was sent by these tests.
- Do not apply the canonical FastAPI schema to the shared Supabase public schema: names overlap
  with other applications. Use an isolated database/schema after reviewing the migration chain.
- Pin/update dependencies routinely; retain the new CI audit, migration, browser and accessibility gates.
