# Intelligence and Service Layer Instructions

These rules apply to apps/api/app/services.

## RAG contract

Every answer preserves tenant and factory scope, source identity, page or row location, processing status, relevant model metadata, and an explicit confidence or abstention state.

The model synthesizes factory evidence. It is not the source of truth.

## Ingestion

- Keep raw files separate from parsed text and derived metadata.
- Make processing idempotent with stable document or content identifiers.
- Preserve original files and parser errors for human inspection.
- Treat spreadsheets as structured data first.
- Preserve Bangla, Banglish, and English where useful; do not silently overwrite originals.
- Reject unsupported or oversized inputs with a useful status.

## Retrieval and generation

- Apply tenant and confidentiality filters before ranking or prompt assembly.
- Prefer hybrid retrieval and deterministic ranking until evaluation justifies more complexity.
- Keep prompts, routing rules, SQL guards, and citation formatting versioned.
- Use the cheapest model that meets the measured quality bar.
- Cache only when tenant scope, source freshness, and provenance remain correct.
- When evidence is weak, say what is missing and suggest the next data source.

## Provider and cost rules

- Keep LLM and embedding providers behind small interfaces.
- Do not make a new provider a hard dependency for local development.
- Track approximate token, page, and embedding cost by tenant where possible.
- Bound retries and prevent duplicate embeddings.
- Do not send private factory data to a provider unless deployment and customer terms permit it.

## Verification

Retrieval, chunking, query-understanding, SQL-generation, and prompt changes must run the relevant golden-set evaluation or explain why it cannot. Record metric changes and regressions.