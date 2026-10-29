# Frontend Component Instructions

These rules apply to reusable components under apps/web/components.

## Boundaries

- Keep components focused on one user task or visual responsibility.
- Prefer typed props and explicit state transitions.
- Keep data fetching and authorization in pages, server actions, or focused client hooks.
- Reuse existing primitives and design tokens before adding a library.
- Avoid global state unless it truly spans routes.

## Factory UX

- Show factory, date range, unit, status, and source context near metrics.
- Use labels a production manager understands.
- Include empty, loading, error, and permission states.
- Make citations inspectable without blocking the main workflow.
- Design for English, Bangla, and code-mixed labels where supported.

## Safety

- Render model output as text or through a strict safe Markdown allowlist.
- Never use raw HTML injection for LLM output.
- Scrub tenant names, document titles, and source snippets from telemetry.
- Never hide a failed save or upload behind a successful-looking UI.