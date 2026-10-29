# Shared Contract Instructions

These rules apply to packages/shared.

This package contains small stable TypeScript contracts. It is not a place for application logic, database clients, or UI components.

- Keep types aligned with actual FastAPI and Supabase response contracts.
- Prefer discriminated unions for status, event, error, and citation payloads.
- Do not duplicate secrets, environment values, or authorization logic here.
- Avoid framework-specific imports.
- Update API consumers and tests with every contract change.
- Prefer backwards-compatible fields; document breaking changes in an ADR.
- Keep dependencies light so Vercel and local development stay fast.