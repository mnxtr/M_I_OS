# Frontend Library Instructions

These rules apply to apps/web/lib.

## Boundaries

- Keep API clients, Supabase clients, auth helpers, citation builders, formatting, and i18n separate.
- Keep browser-safe and server-only modules separate.
- Never import the Supabase secret key or admin client into a browser bundle.
- Validate external responses before using them in UI state.
- Preserve error status and request context for recovery actions.

## Auth and tenancy

- Read tenant and role context from trusted claims or authorized server responses.
- Never derive authorization from local storage, URLs, hidden fields, or user-editable metadata.
- Refresh the session after onboarding or membership changes.

## AI and citations

- SSE parsing handles split frames, aborts, malformed events, and provider errors.
- Citation identifiers remain stable and linkable to source records.
- Never convert abstention or provider failure into an empty successful answer.

## i18n

- Preserve compile-time key parity between English and Bangla dictionaries.
- Keep formatting, interpolation, and fallback behavior deterministic.
- Add tests when translation keys or language fallback changes.