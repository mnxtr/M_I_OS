# Frontend Test Instructions

These rules apply to apps/web/tests.

## Coverage

Prioritize auth redirects, onboarding refresh, tenant and guest-link scope, upload failure states, SSE parsing and cancellation, citations, document deep links, language parity, billing status, keyboard access, and critical mobile layouts.

## Environment

- Keep unit and component tests deterministic and offline.
- Mock Supabase, FastAPI, Storage, and model providers at the boundary.
- Use a dedicated preview or staging environment for authenticated E2E tests.
- Never run E2E tests against a live customer tenant.
- A successful render does not prove authorization.

## Regression

Every fixed route, auth, data-exposure, or streaming bug gets a focused regression test.