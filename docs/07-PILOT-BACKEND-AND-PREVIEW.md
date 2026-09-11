# MIOS Vite, Supabase, and API runbook

## Runtime path

MIOS uses a Vite/React single-page application, Supabase Auth, and FastAPI:

```text
User
  -> Vite frontend (local or Vercel)
  -> Supabase Auth PKCE session
  -> FastAPI /v1 requests with the Supabase access token
  -> tenant-scoped PostgreSQL, pgvector, workers, and object storage
```

The browser uses only the Supabase project URL and publishable key. It never receives a
service-role key. FastAPI validates the bearer token, resolves the active membership, and
enforces the tenant boundary.

## Frontend configuration

Use Node.js 22 or newer. Copy `apps/web/.env.example` to `apps/web/.env.local`:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
VITE_API_URL=
VITE_API_PROXY_TARGET=http://127.0.0.1:8000
VITE_DEMO_FALLBACK=false
```

An empty `VITE_API_URL` uses Vite's local `/v1` proxy. On Vercel, set it to the public
HTTPS URL of the FastAPI service. `VITE_DEMO_FALLBACK` must remain false for production;
when true, dashboard and chat failures intentionally fall back to labelled deterministic data.

Configure Supabase Auth with public and anonymous sign-up disabled, email enabled, leaked
password protection enabled, and these redirect URLs as applicable:

```text
http://localhost:5173/auth/callback
http://127.0.0.1:5173/auth/callback
https://<preview-host>/auth/callback
https://<production-host>/auth/callback
```

Invited users may sign in with a password or invitation-only magic link. The SPA exchanges
the callback's PKCE code for a session, persists and refreshes that session, protects
`/workspace`, and clears local auth state on sign-out.

Run the frontend:

```bash
cd apps/web
npm ci
npm run dev
```

## FastAPI configuration

FastAPI needs a dedicated database and these identity/network settings:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
SUPABASE_AUDIENCE=authenticated
AUTO_CREATE_SCHEMA=false
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Add the exact Vercel preview and production origins to `CORS_ORIGINS` in deployed
environments. Wildcard origins are not used with credentialed requests.

## Database and storage

Apply the files in `supabase/migrations/` in order to the dedicated project. Canonical API
schema revisions live in `apps/api/migrations/versions/`. After migration, run Supabase
security and performance advisors and resolve every finding involving an `mios_` object.

The temporary browser-side pilot tables remain protected by RLS. Production ingestion, RAG,
analytics, and authorization should continue moving behind FastAPI endpoint parity.

## Verification

Frontend:

```bash
cd apps/web
npm audit
npm run lint
npm run typecheck
npm run build
npm test
```

Backend:

```bash
cd apps/api
.venv/bin/ruff check .
.venv/bin/pytest -q
```

Before promotion, test an invited account end to end: password login, magic-link callback,
dashboard request, cited chat response, upload, assessment update, binder export, sign-out,
and direct navigation back to the protected workspace.

## Deployment

Use `apps/web` as the Vercel project root and set the three production browser variables:
`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_API_URL`.
The included Vercel rewrite sends deep links to `index.html`.

The root `render.yaml` defines the FastAPI web service, worker, and queue. Supply database,
Supabase, model, and CORS values in Render. The API's `/health` endpoint reports process
health; `/health/ready` checks required backing services.
