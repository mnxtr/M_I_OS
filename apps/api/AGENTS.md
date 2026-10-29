# FastAPI Backend Instructions

These rules apply to apps/api.

## Role

The API owns authenticated factory operations, RAG orchestration, document processing, constrained analytics, billing integrations, and worker entry points.

## Request boundary

- Verify Supabase JWTs at the API boundary.
- Derive tenant and factory from trusted claims and server-side membership data.
- Reject missing, inactive, or mismatched context.
- Validate request bodies with typed schemas.
- Keep authorization in dependencies or service checks, not only in route handlers.
- Return stable safe error shapes. Never return stack traces, secrets, provider prompts, or internal SQL.

## Data access

- Use the shared Postgres/Supabase schema as the source of truth.
- Keep migrations explicit. Do not use startup create_all, ad hoc schema mutation, or per-connection extension creation in production.
- Apply tenant filters in application queries even when RLS also protects the table.
- Isolate service-role access to server-side paths that require it.
- Keep analytics queries read-only, bounded, and cancellable.

## Operations and cost

- Keep synchronous requests short.
- Move OCR, parsing, embedding, and large imports to a worker path when work is not bounded.
- Add idempotency for document processing, payment callbacks, and retryable connectors.
- Record provider, model, token or page count, duration, and failure reason where practical.
- Make offline behavior explicit and never confuse it with production quality.

## Verification

Auth, tenant, Storage, SQL, and privileged-function changes require negative tests.

RAG and ingestion changes must verify source registration, status transitions, tenant-scoped retrieval, citation preservation, malformed input, size limits, timeouts, retries, and cost limits.

Use the more specific rules under app/routers, app/services, and tests.