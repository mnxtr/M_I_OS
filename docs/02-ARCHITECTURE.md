# 02 — System Architecture (Multi-tenant SaaS)

## 1. High-level view

```mermaid
flowchart LR
    subgraph Client
        PWA[PWA / Next.js]
        Mob[Mobile Web]
    end

    subgraph Edge["Cloud (ap-south-1 Mumbai or ap-southeast-1 Singapore)"]
        GW[API Gateway / ALB]
        WSGW[WebSocket Gateway]

        subgraph Core["Core Services (FastAPI)"]
            AUTH[Auth & Tenancy]
            ING[Ingestion API]
            CHAT[Chat/Query Orchestrator]
            ANL[Analytics (text-to-SQL)]
            BILL[Billing & Plans]
        end

        subgraph Workers["Async Workers (Celery + Redis)"]
            PARSE[Parse/OCR Workers]
            EMB[Embedding Workers]
            SYNC[Connector Sync Workers]
        end

        LLM[LLM Router<br/>OpenAI / Anthropic / Gemini<br/>+ self-hosted vLLM option]
    end

    subgraph Data
        PG[(PostgreSQL 16<br/>tenants, users, metadata)]
        VEC[(pgvector → Qdrant at scale<br/>embeddings per tenant namespace)]
        TS[(TimescaleDB<br/>production/sensor time-series)]
        OBJ[(MinIO / S3<br/>raw documents)]
        CACHE[Redis]
    end

    PWA --> GW --> Core
    PWA -.->|streaming answers| WSGW --> CHAT
    ING --> PARSE --> EMB --> VEC
    SYNC --> TS
    CHAT --> LLM
    CHAT --> VEC & PG & TS
```

## 2. Tech stack decisions

| Layer | Choice | Rationale |
|---|---|---|
| Backend | Python 3.12 + FastAPI | AI ecosystem (LangChain/LlamaIndex optional, prefer thin custom), async, typed |
| Async jobs | Celery + Redis | Battle-tested; OCR/embedding pipelines are bursty |
| Primary DB | PostgreSQL 16 + Row-Level Security | Multi-tenant isolation enforced at DB layer, not just app code |
| Vectors | pgvector (start) → Qdrant (scale) | One database fewer to operate early; migrate when >10M chunks |
| Time-series | TimescaleDB extension | Production metrics/sensor data in same Postgres = simpler ops |
| Object storage | S3-compatible (MinIO local dev, S3 prod) | Raw docs retained for citations & re-indexing |
| Frontend | Next.js 15 (React 19, TypeScript) | PWA support for offline-tolerant UX |
| LLM serving | API providers first; vLLM + open-weights (Qwen2.5-72B / Llama-3.3-70B class) for enterprise on-prem tier | Cost control + data-sovereignty sales argument |
| Embeddings | Multilingual model (e.g., `bge-m3` or OpenAI `text-embedding-3-large`) — must handle Bangla | Bangla retrieval is a differentiator; test on Bangla eval set from day 1 |
| OCR | Tesseract (Bangla+eng) baseline → hosted doc-AI (Azure Document Intelligence / Google DocAI) for scanned audit reports | Scanned PDFs dominate compliance docs in BD factories |
| Observability | Langfuse (LLM traces), Sentry, Grafana/Prometheus | RAG quality debugging is a core ops function |
| Infra | Docker Compose → ECS/EKS later; Terraform | Keep Phase 1 ops burden minimal |

## 3. Multi-tenancy model

**Pattern: shared database, shared schema, `tenant_id` everywhere + Postgres RLS.**

```sql
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON documents
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

- Every request carries a JWT with `tenant_id`; the API sets `app.tenant_id` per transaction.
- Vector store: single collection, **payload-filtered by tenant**, OR per-tenant namespaces (pgvector: partition key column; Qdrant: native tenant collections). Decision record: ADR-002.
- Large enterprise groups (e.g., a group with 12 factories) get **sub-orgs**: `tenant → factory` scoping. A user can query "all factories" or scope to one.

## 4. Request flow — a chat question

1. `POST /v1/chat` → orchestrator loads tenant context, user role (role-scoped retrieval: an operator cannot retrieve salary data even if indexed).
2. Query understanding: classify intent → {doc_lookup, analytics, hybrid}; rewrite query; detect language (bn/en); expand with factory glossary ("sewing line 7" ↔ "L07", style codes).
3. Retrieval:
   - Dense search (top-k=40) + BM25 keyword (top-k=40) over tenant-filtered index.
   - If analytics intent → generate SQL via constrained schema-aware prompt; run read-only against TimescaleDB with row limits and EXPLAIN guard.
4. Rerank (cross-encoder or Cohere Rerank) → top 8 chunks.
5. Generate with citations (`[doc:audit_2024.pdf p.14]`, `[row:production_2025-08-19 line=7]`). Stream tokens over WebSocket.
6. Log full trace to Langfuse; store answer + feedback flags for eval set growth.

## 5. Security & compliance posture

- TLS everywhere; AES-256 at rest; per-tenant encryption keys for object storage (envelope encryption).
- RBAC roles: `owner, admin, compliance_manager, production_manager, operator, auditor_guest`.
- Audit log of every retrieval (who asked what, which docs surfaced) — auditors love this; it's also a sales feature.
- Data residency: cloud in Singapore/Mumbai regions; **on-prem deployment kit** (Docker Compose/K8s helm chart + air-gapped model bundle) for enterprises.
- Buyer-sensitive commercial data (prices, costs) can be tagged `confidential` and excluded from auditor_guest scope by default.

## 6. Scaling path

| Stage | Tenants | Infra shape |
|---|---|---|
| MVP–Pilot | 1–10 | Single docker-compose node / small ECS; pgvector |
| GA | 10–100 | Split services; managed Postgres (Aurora/RDS); Celery autoscale; Qdrant cluster |
| Scale | 100–500+ | K8s; per-region deployments; self-hosted inference pool for cost; connector marketplace |
