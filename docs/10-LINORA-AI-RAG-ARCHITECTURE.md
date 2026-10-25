# Linora Intelligence Core — Canonical AI/RAG Architecture

**Status:** Initial end-to-end integration implemented on \`feat/linora-unified-ai-rag-2026-10-25\`.
Do **not** release to production until FastAPI is reachable, credentials are provisioned securely, and tenant/evaluation gates pass.
This extends the existing \`docs/03-RAG-DESIGN.md\` rather than creating another independent retrieval stack.

## The decision

**One retriever and citation authority: \`apps/api\` (FastAPI).**
\`apps/web\` is an authenticated server-side streaming proxy and renderer, **not a second RAG engine**.

Before this change, \`apps/web/app/api/chat/stream/route.ts\` searched only up to the first 200 tenant chunks via lexicographic substring matching and directly streamed Groq, while FastAPI used pgvector + tsvector. Different results and citation behavior made quality, costs and security difficult to evaluate. The new route delegates to the canonical FastAPI RAG endpoint.

\`\`\`mermaid
flowchart TD
  USER[Factory user: English / বাংলা / Banglish] --> WEB[Next.js Ask UI]
  WEB --> AUTH[Supabase SSR verified session]
  AUTH --> PROXY[Next.js /api/chat/stream: JWT-only SSE proxy]
  PROXY --> API[FastAPI /v1/chat/stream: independently validates JWT + profile]
  API --> SCOPE[Verified tenant_id and quota]
  SCOPE --> Q[Query understanding / Banglish expansion]
  Q --> EMB[Multilingual embedding provider]
  Q --> TXT[Postgres tsvector simple]
  EMB --> VECTOR[pgvector cosine candidate lists]
  TXT --> FUSE[Reciprocal-rank fusion]
  VECTOR --> FUSE
  FUSE --> FILTER[tenant_id + ready document filters; RLS defense-in-depth]
  FILTER --> CONTEXT[Bounded evidence excerpts and source IDs]
  CONTEXT --> DECIDE{Any evidence?}
  DECIDE -->|No| ABSTAIN[Grounded no-evidence response]
  DECIDE -->|Yes| LLM[LLM synthesis or extractive fallback]
  LLM --> API_SSE[SSE: citations, tokens, done]
  ABSTAIN --> API_SSE
  API_SSE --> PROXY
  PROXY --> WEB
\`\`\`

### Data ingestion architecture (already partially implemented)

1. The web client requests an authorized signed upload URL; the server constructs a tenant-prefixed Storage path.
2. Files are written to the **private** Supabase \`documents\` bucket (15 MiB current pilot cap).
3. Authorized registration creates a processing document; document parsing and embedding are delegated to \`apps/api\` (or its optional worker).
4. PDFs, DOCX and plain text produce page-based chunks. Excel/CSV are parsed into structured \`table_sources\` and \`table_rows\` rather than passed wholesale to an LLM. Scanned files can take an OCR path when the worker supports it.
5. A ready document becomes searchable through \`chunks\` with tenant-scoped metadata, tsvector and pgvector. Failed/processing documents are not returned by the new retrieval SQL.

The browser never receives a database service-role credential, provider key, or vector index administrative permission.

### Trust and tenancy invariants

- Next.js verifies the session with Supabase \`getClaims()\` and forwards **only** the signed access token to FastAPI. A caller's \`tenant_id\` JSON property or custom header is never treated as authorization.
- FastAPI independently validates the token, resolves the authoritative profile row and checks that any tenant claim agrees with that row. The server-derived tenant ID is passed to \`hybrid_search\` as a **required keyword-only argument**.
- **Both** dense and keyword SQL queries explicitly restrict \`c.tenant_id\`, \`d.tenant_id\`, and \`d.status='ready'\`, even if the DB role can bypass RLS. Existing Supabase RLS remains defense-in-depth.
- Empty retrieval results bypass synthesis and produce a no-evidence message in English/Bangla rather than a plausible-sounding answer.
- Source passages are **untrusted data**, even when ingested from a factory file. A document cannot override AI system instructions or authorization.
- Citation chips and links are formed from the retrieved document rows, not arbitrary model-created URLs. Citation text inside a generated answer should still be validated before customer release (see gates).
- API errors do not propagate stack traces to browser users, and SSE relay is marked private/no-store.

### API contract

Request:

\`\`\`json
POST /api/chat/stream
{ "question": "Line 7 downtime er reason ki?", "top_k": 8 }
\`\`\`

Next.js proxies it to \`POST /v1/chat/stream\` with \`Authorization: Bearer <Supabase access token>\`. Accepted \`top_k\` is 1–20; questions are 1–4000 trimmed characters.

Server-sent frames (existing UI-compatible format):

\`\`\`text
data: {"type":"citations","citations":[{"document_id":"...","document_name":"maintenance-log.pdf","page":3,"chunk_index":1,"snippet":"..."}]}

data: {"type":"token","value":"According to the maintenance log..."}

data: {"type":"done"}
\`\`\`

The client renders citations as clickable source-document references. There is **no** free-form client-supplied SQL, tenant selector, or Groq request in the chat route.

### Language support

\`expand_query\` recognizes English, Bangla script, and common transliterated Banglish factory terms and returns deduplicated query variants. Each variant produces independent dense and lexical rankings, merged through reciprocal-rank fusion. Answer language tracks the user's language. This is **not yet** a verified multilingual benchmark: Bangla OCR, embedding quality and specialist factory aliases require staging measurements.

### Provider choices and cost guardrails

FastAPI currently supports OpenAI embeddings/LLM or a deterministic local hash/extractive fallback. The hash mode is for offline tests **only** and is not suitable for live multilingual search. No paid model API key should be automatically generated or copied into the browser.
- Production requires compatible embedding dimensions/model for the **existing** pgvector index; changing the embedding provider needs an explicit versioned reindex.
- Use bounded top-K (1–20), existing per-tenant chat quotas, embedding batching and server-side provider credentials.
- Track request latency, retrieved source counts, prompt/context size, model provider, no-evidence ratio and tenant-safe feedback *without logging document contents or secrets*.
- Only enable summarization when retrieval evidence exists; never invent a production, compliance or quality figure.

### Production rollout blockers

1. Confirm FastAPI backend actually runs on a managed service with a stable TLS URL, secure \`DATABASE_URL\`, non-bypass database role and correct JWT verification. Provide \`API_INTERNAL_URL\` or \`NEXT_PUBLIC_API_URL\` to the Vercel server environment. The new Next.js route **returns 503** when none is configured.
2. Configure server-only required API credentials (and \`OPENAI_API_KEY\`/embedding provider where justified). The current \`apps/api/pyproject.toml\` does not list optional LLM SDK packages; verify installation in the backend image if enabling providers.
3. Ensure the embedding dimension matches the live DB vector column; production must not silently mix local hashed embeddings with OpenAI embeddings. Plan reindex if model/dimension differs.
4. Verify two independently authenticated tenants cannot view one another's documents through the web, FastAPI, signed Storage URLs or direct Postgres grants. Test both privileged and nonprivileged API DB roles.
5. Run real file upload -> processing -> citation round-trip with document ownership and failure cases.
6. Configure a **dedicated staging DB** and read-only evaluation user, a reviewed multilingual golden set, a read-only fail-closed CI evaluation job, Hit@8/MRR/citation precision, faithfulness/abstention and p95 latency checks.
7. Validate citations actually support individual answer claims, that streamed LLM errors are represented correctly, and that prompt-injection instructions inside documents cannot cause system/data exposure.
8. The Next.js analytics and compliance pipelines still contain separate AI approaches; rationalizing them under the same tenant-scoped evidence policy is a **future** phase, not part of this first chat vertical slice.

### Test coverage added in this branch

- Web gateway rejects unauthenticated or invalid bodies, refuses missing backend config, forwards signed JWT and raw SSE without database/LLM access.
- API hybrid retrieval requires a server-verified tenant UUID; both query modalities are checked for explicit tenant and ready-document predicates.
- Empty-context questions cannot call an LLM and produce a Bangla/English no-evidence answer.
- Existing reciprocal-rank, pgvector parameter binding and query-expansion tests are updated to call the verified-tenant API.
- Shared Linora copyright footer is present across public, auth, tenant and auditor shells.

**No live customer documents, embeddings, tenant credentials or database schema are changed by this PR.**
