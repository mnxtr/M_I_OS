# Next.js App Router Instructions

These rules apply to pages, layouts, route handlers, and server actions under apps/web/app.

## Server and client boundaries

- Default to Server Components for access-controlled composition and data loading.
- Add use client only for interactive state, browser APIs, or client-only libraries.
- Keep secrets and admin Supabase clients in server-only modules.
- Never import server-only code into client components.
- Route handlers validate claims, enforce ownership, and return safe shapes.

## Data paths

- Use direct Supabase reads where RLS is the intended boundary.
- Use FastAPI for RAG, OCR, long-running ingestion, analytics streaming, and worker-owned behavior.
- Do not send long-running chat or ingestion through a Vercel function.
- Use signed Storage URLs; do not route large file bytes through Vercel.
- Show loading, error, empty, unauthorized, and stale states.

## Product behavior

- Show what data was used, when it was processed, and what to do when evidence is missing.
- Preserve links to documents, pages, rows, or records.
- Keep Bangla and English behavior aligned. New text belongs in both dictionaries.
- Do not show prompts, stack traces, privileged SQL, or sensitive tenant metadata.

## Accessibility and performance

- Use semantic HTML, labels, keyboard access, visible focus, and status announcements.
- Keep tables usable on mobile and low-bandwidth connections.
- Use optimistic updates only when rollback and failure states are clear.