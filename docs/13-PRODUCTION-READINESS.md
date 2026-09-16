# Linora production readiness

This checklist is the release gate for the Vercel frontend and FastAPI API.

## Required API variables

Configure these in the API deployment environment, never in browser-visible files:

| Variable | Purpose |
|---|---|
| `APP_ENV` | Set to `production` or `staging`. |
| `DATABASE_URL` | Supabase PostgreSQL pooler connection string. |
| `AUTH_PROVIDER` | Set to `supabase` for the connected project. |
| `SUPABASE_URL` | Project URL. |
| `SUPABASE_PUBLISHABLE_KEY` | Used to verify the user session through the Data API. |
| `SUPABASE_SECRET_KEY` | Server-only key used only by membership provisioning. |
| `CORS_ORIGINS` | JSON list containing the production frontend origin. |
| `LLM_PROVIDER` | `grok`, `openai`, or `none`. |
| `XAI_API_KEY` / `OPENAI_API_KEY` | Server-only model provider credential. |

The `/health` endpoint is a liveness check. `/health/ready` checks production configuration
and database reachability without returning secrets.

## Membership provisioning

Self-registration creates an identity but does not grant factory access. An owner or admin can
call `POST /v1/tenant/memberships` after the target user exists in Supabase Auth. The API writes
the server-managed `app_metadata` membership claim and the matching `profiles` row. Never use
`user_metadata` for authorization.

## Schema decision required before pilot

The connected project contains both the legacy MIOS tables (`tenants`, `profiles`, `documents`,
`chunks`) and the newer operations tables (`organizations`, `factories`, `production_lines`,
`machines`, and related tables). Keep the legacy RAG tables temporarily, but choose one canonical
organization/factory membership model before adding more RLS policies. Do not create another
parallel table family.

## Release verification

1. `GET /health` returns `200`.
2. `GET /health/ready` returns `200` with production variables and the Supabase pooler URL.
3. A test user can sign in, receive a server-provisioned membership, and load the workspace.
4. A user from a second tenant cannot read the first tenant's documents or production drafts.
5. Chat status shows the configured provider, and provider failure is visible in logs rather than silently misdiagnosed as healthy.
6. Upload, retrieval, production-gap analysis, and sign-out are verified from the deployed frontend.
