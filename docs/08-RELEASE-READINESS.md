# MIOS Vite release readiness

## Delivery plan

1. Replace the stale Next.js runtime with a Vite/React single-page application.
2. Preserve all factory workflows while creating a cohesive premium command-center design.
3. Implement Supabase password and invitation-only magic-link authentication with PKCE.
4. Protect the workspace, forward session access tokens to FastAPI, and configure explicit CORS.
5. Remove obsolete framework files and generated build debris; align and audit dependencies.
6. Verify static quality, API behavior, desktop/mobile UX, accessibility, and local runtime behavior.
7. Push the verified branch so GitHub CI and the existing Vercel integration can build it.

## Implemented

- Vite 8, React 19, TypeScript 5.9, strict type checking, and ESLint flat configuration.
- Premium graphite/navy visual system across sign-in, command center, analytics, chat,
  compliance, and knowledge views, with Lucide icons and responsive layouts.
- Supabase browser client using persisted PKCE sessions, automatic refresh, password sign-in,
  invitation-only email links, callback exchange, protected workspace rendering, and sign-out.
- Authenticated browser-to-FastAPI dashboard/chat requests with bearer tokens. Deterministic
  fallback is opt-in through `VITE_DEMO_FALLBACK` and is always enabled only in browser tests.
- Explicit FastAPI CORS origins and a regression test for the local Vite origin.
- Vite-native lazy loading for the Recharts dashboard, reducing the initial application chunk.
- SPA deep-link handling for Vercel and current environment/deployment documentation.
- Removed Next middleware, route handlers, server Supabase helpers, and a 260 MB stale
  `.next` cache. npm reports no known vulnerabilities.

## Verified locally

- Frontend lint: pass.
- Strict TypeScript: pass.
- Vite production build: pass.
- Dependency audit: zero vulnerabilities.
- Browser suite: 8/8 pass across desktop and mobile.
- Automated accessibility: zero WCAG A/AA violations on sign-in and the command center.
- Browser runtime: page content and auth controls render, no Vite overlay, no console errors,
  and an unauthenticated direct visit to `/workspace` renders the protected sign-in experience.
- FastAPI lint: pass.
- FastAPI tests: 76 passed, 2 database-dependent tests skipped.
- CORS preflight: configured local Vite origin accepted.
- Supabase: project is ACTIVE_HEALTHY; current MIOS-owned objects have no security-advisor findings.
  Performance advisor reports one informational unused pilot index, retained until production traffic exists.

## Local runtime

- Frontend: `http://127.0.0.1:5173`
- API health: `http://127.0.0.1:8000/health`
- API readiness: degraded until PostgreSQL is started or a dedicated production database is
  configured. The local ignored environment enables labelled dashboard/chat fallback so the
  authenticated frontend can still be exercised without presenting seed data as live data.

## Production blockers

- In the Supabase Auth dashboard, disable public and anonymous sign-up, enable leaked-password
  protection, and allow the exact local/preview/production callback URLs. The application itself
  never creates OTP users, but project-level controls still need this production hardening.
- Configure a dedicated PostgreSQL/pgvector database, Redis queue, and object storage for FastAPI;
  confirm `/health/ready` returns 200 before production promotion.
- Set Vercel's `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_API_URL`.
  Keep `VITE_DEMO_FALLBACK=false` in production.
- Set Render's `CORS_ORIGINS` to the exact Vercel preview and production origins.
- Run a real invited-user smoke test covering both auth methods, upload, assessment editing,
  binder export, and a live cited FastAPI response.

## Delivery boundary

The branch is intentionally based on the existing pilot foundation and continues through
GitHub review PR #15. The repository's existing Vercel GitHub integration may create a preview
after the branch is pushed; a successful build does not replace the real-user and service
readiness checks above.
