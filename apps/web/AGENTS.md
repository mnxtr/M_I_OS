<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in node_modules/next/dist/docs/ (resolved from this file's directory; in monorepos the next package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by next dev — verify at node_modules/next/dist/server/lib/generate-agent-files.js. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# MIOS Web Application Instructions

These rules apply to the whole apps/web application. More specific files under app, components, lib, and tests refine them.

## Application role

The web application is the authenticated factory workspace and public product surface. Keep it useful on low-bandwidth connections and clear about data freshness, source evidence, and permissions.

## Architecture

- Follow the Next.js App Router structure already in this application.
- Keep Vercel focused on UI and short orchestration.
- Use FastAPI directly for long-running AI, OCR, ingestion, and streaming work.
- Use Supabase Auth, Postgres, and Storage through the established helpers.
- Keep the public GitHub Pages build separate from the authenticated application.

## Security

- Never expose server keys, admin clients, private Storage paths, or privileged prompts in browser code.
- Treat route parameters, local storage, hidden fields, and client metadata as untrusted.
- Preserve tenant and role checks at the server boundary.
- Render model output safely and scrub sensitive values from telemetry.

## Product quality

- Preserve English/Bangla key parity.
- Show loading, empty, error, unauthorized, processing, and stale states.
- Make citations and source context inspectable.
- Keep the primary workflow usable without JavaScript where the App Router permits it.
- Prefer existing design tokens and UI primitives over new dependencies.

## Verification

For a web change, use the narrowest relevant checks: typecheck, lint, unit tests, and build. For auth, tenant, upload, streaming, or payment changes, add or update a focused regression test and verify the behavior on a preview or staging environment.

