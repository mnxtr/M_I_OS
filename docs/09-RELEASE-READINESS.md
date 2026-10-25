# Linora — Release readiness and verification gates

**Last reviewed:** 2026-10-25 (Asia/Dhaka)  
**Application:** [mnxtr/M_I_OS](https://github.com/mnxtr/M_I_OS)  
**Deployment:** [mios-manufacturing-pilot-preview](https://vercel.com/mnxtrs-projects/mios-manufacturing-pilot-preview)  
**Status:** **BUILD-READY; NOT YET CUSTOMER-PRODUCTION-READY.** Do not infer application readiness from a Vercel READY status alone.

## Verified release changes

- GitHub PR [#24](https://github.com/mnxtr/M_I_OS/pull/24): corrected `vercel.json`, Vercel Root Directory = `apps/web`, working monorepo Next.js deployment, CI lockfile dependency.
- PR [#25](https://github.com/mnxtr/M_I_OS/pull/25): blocks tenant-self-approved bank transfers and unverified paid plan upgrades; CI passed.
- PR [#26](https://github.com/mnxtr/M_I_OS/pull/26): tenant authorization for guest links/connector secrets, pgvector bindings, hybrid retrieval ranking, bounded upload/email ingress, and 15 MiB web/API limits matching the existing private Supabase documents bucket. CI/preview passed before merge.
- Supabase migration `20261025070148 lock_down_mios_profile_write_privileges`: authenticated role can update `profiles.full_name` only; `role`, `tenant_id`, `is_active`, and whole-row mutation are denied.
- Supabase migration `20261025070847 restrict_mios_handle_new_user_rpc`: `anon` and `authenticated` cannot directly execute the internal `handle_new_user()` trigger function. Server-side trigger execution remains intact as designed (signup not yet smoke-tested).

## Verified environments (do not include secret values)

Production Vercel project configured with:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL=https://mios-manufacturing-pilot.vercel.app`

As of this review, **production Vercel does not list**:
- `SUPABASE_SECRET_KEY`: server-only admin operations such as signed upload URL and team invites require a correctly scoped key.
- `NEXT_PUBLIC_API_URL`: browser API requests may fall back to `http://localhost:8000`, which is not a production API origin.
- `GROQ_API_KEY`: Next.js `/api/chat/stream` returns 503 when absent.
- Any dedicated staging evaluation `STAGING_DATABASE_URL` / `STAGING_EVAL_TENANT_ID` in GitHub Actions.

**Never** put secret keys in `NEXT_PUBLIC_*`, GitHub code, public logs, or tickets. Verify all newly configured environment values in production and preview separately, and redeploy to apply them.

## Release-blocking acceptance gates

| Gate | Owner | Evidence required | State |
|---|---|---|---|
| Vercel build and main CI | Engineering | Vercel production READY; GitHub API/web/secrets jobs successful | **PASS (build only)** |
| Public origin and access | Engineering | Authenticated browser smoke test on canonical production domain; SSO and redirect rules reviewed | **BLOCKED — no authorized browser session** |
| Authentication/onboarding | Engineering | Sign up/login, email redirect allowlist, refresh/logout, owner invite/team-role management | **NOT TESTED** |
| Backend connectivity | Engineering | Healthy FastAPI `/health` and authenticated endpoint via configured `NEXT_PUBLIC_API_URL` with correct CORS | **BLOCKED — backend origin/config unverified** |
| Server secrets | Owner/operator | `SUPABASE_SECRET_KEY` server-only and `GROQ_API_KEY` set securely where required, with successful smoke tests | **BLOCKED** |
| Tenant isolation | Security | Two-tenant read/write negative tests, authenticated role as non-owner, storage upload/download isolation | **PARTIAL — policies/grants inspected, E2E missing** |
| Data ingestion | Engineering | Real authorized `<=15 MiB` file upload, signed Storage PUT, registration, processing, retry/failure | **NOT TESTED** |
| RAG | AI engineering | pgvector ingestion/query, answer provenance, Bangla/English golden-set Hit@K/MRR, abstention cases | **BLOCKED — staging evaluation fixtures/baseline needed** |
| Payments | Billing | Verified bKash callback, duplicate/webhook reconciliation tests, no self-verification | **PARTIAL — code unit tests only** |
| Observability and rollback | Operations | Runtime logs access, error budgets, tested rollback and database backup restore procedure | **NOT VERIFIED** |

### Staging retrieval evaluation prerequisites

The current `main` nightly evaluation script can incorrectly exit successfully if `STAGING_DATABASE_URL` is unset, and its baseline creation is unsafe for a true release gate. Draft [PR #23](https://github.com/mnxtr/M_I_OS/pull/23) contains the fail-closed/read-only correction, but is stacked on older branches. **Do not treat existing scheduled green runs as proof of RAG quality.**

Before enabling trustworthy evaluation, provision a **dedicated non-production staging database**, a non-owner least-privilege read-only evaluation role, realistic explicitly authorized tenant fixtures, and a reviewed golden-set baseline. Retarget and reconcile PR #23 onto current main; validate without touching live customer data.

## Database findings requiring review

Connected Supabase project: `dkxgpdhzklgojrxwzndu` (shared with other applications). It contains MIOS tenant profiles and document chunks; do not reset or reseed live records. RLS is enabled on the checked MIOS tables, but RLS alone does not certify service-role SQL or two-tenant isolation. Other database-advisor warnings cover the shared project's `public.vector` extension, intended `onboard_factory` SECURITY DEFINER function, unrelated cricket application functions, and leaked-password-protection configuration. Review each before altering shared schema.

Supabase Advisor references: [Security lints](https://supabase.com/docs/guides/database/database-linter), [RLS and column privileges](https://supabase.com/docs/guides/database/postgres/row-level-security), [Column security](https://supabase.com/docs/guides/database/postgres/column-level-security).

## Release policy

1. Deploy only from a reviewed `main` commit with green API/web/secrets CI.
2. Require a READY preview and a READY production build, **plus authenticated functional checks**.
3. No customer rollout with missing protected credentials, failed tenant isolation checks, or unverified payment provider integrations.
4. Record every gate as **PASS / FAIL / BLOCKED / NOT TESTED** with direct evidence links. Never label a missing test as passed.
5. Protect tenant files, preserve source provenance, avoid service-role exposure, and never generate fictional factory metrics.
