# Lineora engineering contracts and deployment runbook

Release reviewed 2026-09-07. “Implemented” below means repository code and stated automated
tests; it does not mean a verified cloud deployment. No xAI, merchant or database secrets were
provided. Frontend build configuration is public; backend credentials must remain server-only.

## Code responsibilities

| Code | Responsibility and behavior |
|---|---|
| `apps/web/src/pages/WorkspacePage.tsx` | Operations-first navigation; knowledge and assistant views; last 50 successful action messages in memory; clears on refresh |
| `components/OperationsDashboard.tsx` | Hourly entry or bounded JSON input; explicit demo; authenticated analysis; bars plus exact source table; missing/error states |
| `components/KnowledgeDashboard.tsx`, `lib/dashboard.ts` | Tenant metrics, readiness statuses, filtered pagination, abortable requests; no false zero on failure |
| `components/KnowledgeInbox.tsx` | Up to 10 files sequentially, 20 MiB each, per-file accepted/failed status; refreshes dashboard; acceptance is not indexing completion |
| `components/FacilityPanel.tsx` | Reads up to 100 authorized factories through Supabase RLS; rollout checklist; does not create factories or change document tenant |
| `lib/supabase.ts`, `pages/AuthPage.tsx` | Optional Supabase session lifecycle, password sign-in/sign-up, refreshed bearer token; no service-role key |
| `app/deps.py`, `services/supabase_auth.py` | Explicit auth mode; verifies Supabase token and server-managed tenant/role; checks active matching profile and sets transaction tenant context |
| `routers/dashboard.py` | Tenant-filtered aggregate and document metadata endpoint with private/no-store response |
| `routers/operations.py` | Pure bounded gap calculations exposed behind authentication; no database insert |
| `services/grok.py`, `services/llm.py`, `routers/chat.py` | Fixed xAI host, configurable model, bounded text generation, streaming errors and existing retrieval/citations |
| `services/sslcommerz.py`, `routers/payment_sandbox.py` | Fixed sandbox host, hosted checkout and server validation; no entitlements |
| `services/bkash.py`, `routers/payments.py` | Existing sandbox adapter tightened; HTTPS callback and transaction proof checks; customer self-reconciliation disabled |
| `app/main.py`, `app/db.py` | Explicit CORS, route registration, opt-in development bootstrap; no connection-time schema DDL |

## API and metric contracts

`GET /v1/dashboard/knowledge?status=ready&offset=0&limit=20` requires a bearer token.
Status is optional and restricted to `ready`, `processing`, `failed`; page size is 1–50.
Counts cover the tenant's full document set; records and `matched` honor the filter. Records
exclude storage paths and parser errors. `ready_percent` is null when total is zero.

`POST /v1/operations/gaps` accepts:

```json
{"interval_minutes":60,"observations":[
  {"line":"Line 01","start":"2026-09-01T09:00:00+06:00","target":100,"actual":75}
]}
```

Up to 500 observations; interval length 15–240 minutes; counts 0–1,000,000; aware timestamps;
duplicate/overlapping intervals per exact line identifier rejected. Units are pieces. The caller
must normalize line identifiers; names are not yet canonical facility/line foreign keys.

- Eligible interval: actual is known and target > 0.
- Gross gap: sum of `max(0, target − actual)` over eligible intervals; surplus does not erase gaps.
- Attainment: eligible actual total / eligible target total × 100; null if no eligible target.
- Missing actual and zero-target counts are reported separately and can overlap.
- Consecutive run: adjoining deficient intervals for the same line; a non-gap or missing record
  breaks it. This is not machine cycle time or an OEE measure.
- Recurrence: same line and Dhaka clock time on at least three observed days, with gaps on at
  least 60% of them. Missing days are not implicitly zero. This is a rule, not statistical or
  causal prediction.

The workbench does not persist observations, action history or recurrence between sessions.
Production records uploaded to the knowledge inbox are not automatically mapped into this API.

## Supabase authentication and database boundary

Frontend sign-in uses `@supabase/supabase-js`. `getSession()` supplies the access token; it is
not the backend authorization decision. FastAPI calls `/auth/v1/user` with the bearer token,
then reads the caller's profile through the Data API with the same token and publishable key.
Only trusted `app_metadata.tenant_id` and `app_metadata.role`, matching the active profile, grant
access. User-editable `user_metadata` is never an authorization source. Legacy register/login
routes reject requests when Supabase mode is enabled; no fallback between backend modes.

Connected-project audit: `dkxgpdhzklgojrxwzndu` is reachable and healthy. `profiles` exists and
`users` does not. `factories` access depends on `organization_members`, while document policies
use JWT tenant metadata. The backend's transaction context uses `app.tenant_id`. These are
different policy mechanisms. **Do not simply point the existing ORM at the connected database
and assume isolation or foreign keys work.**

Required migration work: inventory every FK and policy; map organizations to tenant workspaces;
restrict profile writes to non-authorization fields; provision memberships with server authority;
choose an API runtime role without owner/BYPASSRLS privileges; reconcile app-context policies;
exercise inserts and revoked-user behavior across two tenants. Back up and test in an isolated
database before applying changes. No cloud schema or user metadata was mutated in this release.

Keep the Supabase service-role/secret key out of Vite. Current browser token persistence carries
normal SPA XSS risk; avoid unsafe HTML and add a reviewed CSP at deployment. Signup does not
create a trusted factory membership; an administrator must provision it. An email-confirmation
message is not evidence that membership exists.

## Grok chatbot behavior and toolset

Set `LLM_PROVIDER=grok`, `XAI_API_KEY` and a supported `XAI_MODEL` on the backend. No API key was
created, copied to the frontend or committed. The model is deliberately not hardcoded because
account availability changes. The adapter uses the documented chat-completions compatibility
endpoint `https://api.x.ai/v1/chat/completions`, now documented as legacy. Consider a separate
Responses API migration when adding tools; do not mix response event formats.

Runtime path: authenticate → retrieve factory-scoped source chunks → construct evidence context
and question → stream Grok text → display citations returned by the retrieval layer. Source text
is treated as untrusted input. Output is capped at 2,000 requested tokens; connection timeout is
10 seconds and provider read timeout 45 seconds. Slow reasoning models may need a reviewed
timeout/budget change. Missing completion frames and partial stream errors are surfaced.
Existing extractive fallback may run when generation fails before producing text; it should not
be marketed as a live Grok answer. Provider/fallback labeling and per-tenant cost telemetry remain
M4 work. Citation existence is not proof that every generated claim is supported; evaluate it.

The xAI docs describe function calling, search, code execution, collections and remote MCP. Their
Docs MCP is a developer documentation service, not a factory chatbot permission system. This
release enables **text generation only**. No external search, arbitrary SQL, code execution or
provider-hosted document collection receives automatic access to factory files.

Next read-tool contract: `get_gap_summary(facility_id, shift_id)` and
`search_factory_knowledge(query, document_ids)` should validate a strict schema, reauthorize
facility scope server-side and return bounded data with provenance. Never execute a function
name or tenant selected by the model without validation. Writes should first create a reviewable
action draft and require the authorized operator to confirm execution. This tool loop is planned,
not implemented.

Official references checked: [streaming](https://docs.x.ai/developers/model-capabilities/text/streaming),
[chat completions](https://docs.x.ai/developers/model-capabilities/legacy/chat-completions),
[function calling](https://docs.x.ai/developers/tools/function-calling),
[Docs MCP](https://docs.x.ai/developers/docs-mcp),
[Supabase user verification](https://supabase.com/docs/reference/python/auth-getuser).

## Payment sandbox contracts

Payments are disabled unless `PAYMENT_SANDBOX_ENABLED=true`. Never use live merchant credentials
with this release. Sandbox responses cannot activate production subscriptions.

SSLCOMMERZ: an owner/admin POSTs customer fields to `/v1/payments/sandbox/sslcommerz/session`.
The server creates a fixed BDT 100 test checkout and returns the gateway response plus signed,
30-minute tenant/transaction context. After checkout, an authenticated client POSTs `context`
and `validation_id` to `/validate`. Validation checks gateway status, transaction, exact amount,
BDT currency and risk flag. The `/return` POST is only an acknowledgement, not a durable payment
ledger or verified subscription event. There is no completed frontend billing UI for this flow.

Before live use, implement durable IPN capture, independent server validation, unique event keys,
row locking/idempotency, callback retries, reconciliation, refunds and environment-specific
entitlements. Current `/return` acknowledges notifications without storing them; it is suitable
only for this non-entitling sandbox probe. Test duplicate/canceled/expired and mismatched cases
with the merchant sandbox. Official [v4 documentation](https://developer.sslcommerz.com/doc/v4/)
requires server-side initiation and transaction validation; redirects alone are insufficient.

bKash: existing tokenized sandbox adapter now requires HTTPS backend callback configuration and
completed transaction proof including amount, currency and payment ID. The portal at
[developer.bka.sh](https://developer.bka.sh/) did not expose enough current contract detail to
verify token-grant headers/body in this session. Merchant credential testing, callback RLS access
and retry/idempotency remain unresolved. Do not report this as an operational merchant sandbox.

## Environment contract

| Location | Variables | Handling |
|---|---|---|
| Vercel frontend build | `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | Public values; API URL must be the deployed HTTPS FastAPI origin |
| Backend auth | `AUTH_PROVIDER=supabase`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | Must match frontend project; provision trusted membership |
| Backend database | `DATABASE_URL` | Restricted runtime credentials, TLS verified, bounded pool; absent in current environment |
| Backend application | `JWT_SECRET`, `CORS_ORIGINS`, `PUBLIC_BASE_URL`, `API_PUBLIC_BASE_URL` | Strong random signing secret ≥32 bytes; exact HTTPS origins; JSON list for CORS |
| Backend AI | `LLM_PROVIDER=grok`, `XAI_API_KEY`, `XAI_MODEL` | Server secrets; configure spend limits separately |
| Backend embeddings | `EMBEDDING_PROVIDER`, provider key, `EMBEDDING_DIM` | Grok text does not replace embeddings; align vector dimension and reindex when changing provider |
| Backend files/jobs | `STORAGE_DIR`, `USE_CELERY`, `REDIS_URL` | Local disk is development-only; durable storage/worker required for production |
| Backend sandbox | `PAYMENT_SANDBOX_ENABLED`, `SSLCOMMERZ_STORE_ID`, `SSLCOMMERZ_STORE_PASSWORD`, `BKASH_*` | Sandbox only, disabled by default |
| Development only | `DEV_BOOTSTRAP_SCHEMA=true` | Disposable local database only; false for any managed database |

Legacy default JWT/database values are development placeholders, not production credentials.
Optional OpenAI/Anthropic SDK paths and embedding quality must be verified if selected; Grok
uses the installed HTTP client directly. Local deterministic embeddings are not semantic-search
quality. Existing API dependencies use ranges; add a reproducible backend lock before release.

## Vercel connection and deployment

Access already verified for team `mnxtrs-projects`, with one listed project `mnxtr-github-io`.
The intended `mios-manufacturing-pilot` returned 404 under that team. A public site URL does not
prove this connection can manage it. No new deployment has been verified.

1. In ChatGPT's app connection settings, connect Vercel using the account/team that owns the
   intended project. In Vercel, confirm the same team grants project access. Do not paste tokens
   into chat. Re-run the project list and target lookup after access is corrected.
2. In the intended Vercel project, connect GitHub repository `mnxtr/M_I_OS`; grant the Vercel
   GitHub installation access to that repository. Select root directory `apps/web`, Vite,
   Node.js 22, install `npm ci`, build `npm run build`, output `dist`.
3. Configure the three public frontend variables above for Preview first. Deploy FastAPI and its
   durable worker separately; configure CORS to that exact preview origin. This repo does not
   yet package its parsing worker as a Vercel service.
4. Use a preview branch and inspect the deployment build logs. The current router is HashRouter;
   workspace URL is `/#/workspace`. A `/workspace` rewrite serves the app shell but does not
   replace hash routing. Configure auth confirmation/redirect URLs accordingly.
5. Complete M2 gates, then verify sign-in, unauthorized access, two-tenant isolation, upload →
   processing → ready, gap calculation and Grok citations using a supported model. Verify
   payment sandbox separately. Promote the tested artifact only when these checks pass.
6. Record deployment ID, commit, environment and smoke-test result. Roll back the frontend alias
   to the last known good deployment if needed; database rollback requires its own tested plan.

Official [Vercel GitHub deployment documentation](https://vercel.com/docs/git/vercel-for-github).
No unrelated accessible Vercel project was repurposed, and no authentication boundary was bypassed.

## Verification and known limits

From repository root:

```bash
python -m venv .venv
.venv/bin/pip install -e './apps/api[dev]'
.venv/bin/ruff check apps/api/app apps/api/tests evals/run_eval.py
.venv/bin/pytest apps/api/tests -q
```

From `apps/web`:

```bash
npm ci
npm test
npm run build
```

Recorded: 111 backend tests passed, one existing DSN-gated integration test skipped; 10 frontend
component tests passed; TypeScript/Vite build passed. Added coverage includes tenant filtering,
empty/error states, metric arithmetic, overlap validation, Grok interrupted streams, verified
Supabase membership versus spoofed metadata, and payment response mismatches. Deprecation
warnings from FastAPI/Starlette and short test JWT keys remain; they are not live secrets.
Local frontend checks used Node 24.19.0. CI and Vercel are configured for Node 22 to meet the
installed Supabase SDK's Node >=22 requirement; the remote Node 22 run remains to be observed.

Not verified: live Grok, actual merchant sandbox, Postgres RLS/foreign-key compatibility, visual
browser review, persistent production activity, deployment to the target Vercel project, and
customer workload/latency. Those are explicit release gates, not covered by mocked tests.

## Production implementation prompt for the next milestone

Implement M2 for Lineora in mnxtr/M_I_OS. Preserve current operational metric contracts. First
inspect migrations, connected schema, grants and membership policies. Propose and implement an
additive mapping between organization, tenant and facility; do not assume IDs are interchangeable.
Use verified Supabase identity, server-managed roles and a restricted Postgres runtime role.
Add facility onboarding, canonical line/shift records and idempotent production imports. Persist
server-side activity with tenant/facility scope. Move document objects and processing to durable
services. Add cross-tenant/revocation tests against real Postgres and import correction tests.
Keep all credentials server-side; return honest loading, empty, unknown and error UI states.
Run automated and browser checks, document migration/rollback procedures, push the scoped
changes, and report the exact commit/deployment plus any remaining release blockers.
