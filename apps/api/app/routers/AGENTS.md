# API Router Instructions

These rules apply to apps/api/app/routers.

## Route design

- Keep routes thin: authenticate, validate, call a service, shape a response.
- Keep OCR, embeddings, complex SQL generation, payment reconciliation, and multi-step business logic in services.
- Use explicit HTTP methods and status codes.
- Keep response schemas stable and typed.
- Version an intentional breaking change.

## Authorization

- Resolve tenant context server-side for every tenant route.
- Never accept a client tenant_id as proof of access.
- Check ownership for IDs in URL and body.
- Guest links are narrower capabilities, not general sessions.
- Protect billing, invitations, connector secrets, audit logs, and document downloads strictly.

## Streaming

- Keep SSE event names and payloads stable.
- Emit complete frames and support disconnects.
- Do not proxy long-running AI work through Vercel when the browser can call FastAPI directly.
- Send citations and status as structured events.

## Analytics and integrations

- SQL uses an allowlisted schema and read-only role.
- Reject DDL, DML, multi-statement, unbounded, cross-tenant, and slow queries.
- Return abstention or actionable errors when evidence is missing.
- Verify payment signatures and callbacks server-side; make callbacks idempotent.
- Never activate a paid plan from a client assertion or unchecked status field.