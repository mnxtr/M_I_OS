# MIOS Pilot Backend and Preview Runbook

## Outcome

The pilot frontend can run independently of the local Docker stack while the
FastAPI service remains the production-path backend for RAG, OCR, and live
factory integrations. Supabase provides the pilot authentication and hosted
data boundary; Vercel hosts the Next.js preview.

## Pilot request path

```text
Pilot user
  -> Next.js frontend on Vercel
  -> Supabase Auth session
  -> authenticated same-origin /api/mios routes
  -> FastAPI on Render Singapore
  -> RLS-protected Supabase Postgres + private Storage
```

The shareable preview uses an explicitly labelled, deterministic factory seed
until live factory connectors are enabled. The seed includes:

- six manufacturing and compliance documents;
- two structured production tables;
- line and shift analytics examples;
- evidence-grounded assistant responses;
- social-compliance and quality templates;
- a ready-to-run buyer audit assessment; and
- a pilot usage and time-saved ledger.

FastAPI is authoritative for business data and permissions. It validates the
Supabase access token, loads the application user and active factory membership,
then sets tenant context for forced database row-level security. Browser access
to the temporary `mios_*` pilot tables is transitional and must be revoked once
the corresponding FastAPI endpoints have parity.

## Local configuration

Use Node.js 22 or newer, then create `apps/web/.env.local` from the example:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
MIOS_API_URL=http://localhost:8000
```

The publishable key is safe to identify the Supabase project, but access still
depends on RLS and API authorization. Never add the Supabase service-role key
to the frontend or to a `NEXT_PUBLIC_...` variable.

Configure Supabase Auth with public sign-up disabled and allow the exact callback
URLs for local, Vercel Preview, staging, and production:

```text
http://localhost:3000/auth/callback
https://<preview-host>/auth/callback
https://<production-host>/auth/callback
```

FastAPI requires `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`,
`SUPABASE_AUDIENCE=authenticated`, and `AUTO_CREATE_SCHEMA=false` outside local
bootstrap development.

Run the frontend:

```bash
cd apps/web
npm install
npm run dev
```

## Database migrations

The migration sequence under `supabase/migrations/` retains the temporary pilot
adapter. Canonical API schema revisions live under `apps/api/migrations/versions/`:

1. `mios_pilot_backend` creates tables, seed records, storage, and policies.
2. `harden_mios_pilot_functions` removes elevated RPC execution and blocks the
   anonymous database role.
3. `require_permanent_mios_accounts` excludes anonymous Supabase identities.
4. `optimize_mios_rls_claims` makes the policy claim checks efficient at
   scale.
5. Alembic `0002_pilot_identity_and_factories` links Supabase identities,
   creates/backfills factories and memberships, and forces tenant RLS.

Apply migrations in order to a dedicated Supabase project. After changes, run
both the Supabase security and performance advisors and resolve every finding
that names an `mios_` object.

## Pilot walkthrough

1. Invite the pilot user in Supabase Auth and create/link the application membership.
2. Sign in with the email OTP/magic link and confirm the correct factory scope.
3. Review the Overview pulse and recent documents.
4. Ask about Line C downtime and inspect the attached source citations.
5. Run a line-performance analytics question.
6. Open Compliance, run the seeded assessment, review gaps, and draft a
   corrective action.
7. Export the evidence binder.
8. Upload a small supported document and confirm it appears in Knowledge.

## Preview deployment

Deploy `apps/web` as the Vercel project root. Configure the two public Supabase
variables plus the private `MIOS_API_URL` independently for Preview and Production.
The repository pins Node 22 and includes a minimal Vercel project configuration.

The root `render.yaml` defines a Singapore FastAPI web service, Celery worker,
and private key-value queue. Supply its database, Supabase, and model credentials
in Render; secrets are deliberately marked `sync: false`. The web service runs
`alembic upgrade head` as a pre-deploy command.

For a team pilot, prefer a Vercel Preview deployment with a temporary share
link. Promote to Production only after the pilot owner confirms the preview,
auth email delivery, file upload, assessment update, and binder export flows.

## Production boundary

The Command Center already prefers authenticated FastAPI data and falls back to
labelled deterministic data when `MIOS_API_URL` is absent. Ask MIOS, analytics,
compliance, and knowledge are the next routes to move behind the same proxy;
direct canonical table access is not an accepted production boundary.
