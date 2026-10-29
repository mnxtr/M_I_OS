# MIOS Engineering Instructions

These rules apply to the whole repository. The nearest more specific AGENTS.md adds rules for its directory.

## Mission

MIOS (Linora) turns factory documents, spreadsheets, production records, quality data, and machine events into cited operational decisions for Bangladesh manufacturers.

Prioritize one reliable vertical slice:

1. A tenant user signs in and is scoped to a factory.
2. An authorized source is uploaded or registered.
3. The source becomes searchable or queryable.
4. The answer includes evidence, or clearly states that evidence is missing.

## Repository map

- `apps/web`: Next.js web application, server components, route handlers, and browser client.
- `apps/api`: FastAPI API, ingestion, RAG, analytics, and worker entry point.
- `packages/shared`: small TypeScript contracts shared by applications.
- `evals`: retrieval and answer quality evaluation.
- `infra`: local development services.
- `docs`: product, architecture, rollout, and decision records.

## Work method

1. Read the nearest AGENTS.md, relevant code, and the applicable document in docs.
2. State the smallest change that proves the requested behavior.
3. Keep one concern per change. Avoid unrelated refactors and new infrastructure.
4. Preserve existing API, database, and UI contracts unless intentionally changing them.
5. Record system-boundary decisions in docs/adr.
6. Document migrations, environment variables, rollback, and verification.
7. Report changed files, commands run, results, and limitations.

## Limited-resource rules

- Start with the existing Next.js, FastAPI, Supabase/Postgres, pgvector, and Docker Compose stack.
- Do not add Redis, Celery, Qdrant, TimescaleDB, a new model provider, or a new service until a measured bottleneck requires it.
- Use provider APIs plus deterministic or extractive local fallbacks during development.
- Bound file size, row count, token count, query time, retries, and model spend.
- Prefer one database and one worker process for a pilot.
- Do not build a full MES or ERP. Integrate with the records factories already use.

## Architecture guardrails

- The browser uses Supabase Auth and only publishable client configuration.
- FastAPI verifies Supabase JWTs and performs tenant-scoped work.
- tenant_id comes from trusted claims or server-side membership lookup. Never trust a client-supplied tenant ID.
- PostgreSQL RLS and Storage policies remain part of the security boundary.
- RAG preserves source, page or row location, processing status, and tenant scope.
- Natural-language SQL is read-only, schema-constrained, time-limited, and row-limited.
- Long-running AI, OCR, and ingestion work must not depend on a short-lived Vercel request.
- vercel.json must stay schema-valid. Vercel Root Directory belongs in project settings, not a rootDirectory JSON property.

## Security

- Never commit secrets, private keys, customer documents, or real factory data.
- Never put server keys in NEXT_PUBLIC_* variables.
- Treat factory documents, prices, production records, worker information, and buyer data as confidential.
- Do not weaken RLS, Storage policies, grants, or authentication to make a demo work.
- Test authorization with two tenants before calling a tenant-facing path complete.
- Do not claim security, deployment, or evaluation success without direct evidence.

## Delivery order

For broad work, use this order:

1. Shared contract or data shape
2. Backend authorization and persistence
3. Ingestion or intelligence behavior
4. Frontend workflow
5. Evaluation and observability
6. Deployment and pilot documentation

A feature is complete only when its failure path, tenant boundary, cost envelope, and evidence trail are addressed.