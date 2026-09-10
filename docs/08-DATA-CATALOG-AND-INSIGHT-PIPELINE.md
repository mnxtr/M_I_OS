# MIOS data catalog and knowledge-insight pipeline

## Live source-of-truth map

The operational dashboard reads tenant-scoped data from the following current tables. It deliberately does not use the legacy `mios_*` tables.

| Domain | Tables | Primary data shapes | Dashboard / pipeline use |
| --- | --- | --- | --- |
| Knowledgebase | `documents`, `chunks`, `knowledge_insights` | document metadata, unstructured text, JSON metadata, LLM summaries/topics | Knowledge health, AI coverage, document types, topics and model mix |
| Uploaded tables | `table_sources`, `table_rows` | schema-as-JSON plus typed JSON rows | Production, quality and analytics metrics |
| Compliance | `assessments`, `assessment_items`, `checklist_templates` | workflow status, due dates, item outcomes | Compliance readiness and gaps |
| Tenant and usage | `tenants`, `monthly_usage`, `profiles`, `user_profiles`, `organization_members` | UUID identities, plan/status values, numeric usage counters | Tenant isolation, plan context and time-saved metric |
| Factory digital twin | `organizations`, `factories`, `production_lines`, `machines`, `production_orders`, `production_records`, `downtime_events`, `maintenance_events`, `quality_inspections` | master data, time-series measures, events and inspection results | Future normalized factory reporting |
| Commercial and support | `payments`, `guest_tokens`, `contact_messages`, `newsletter_subscribers`, `audit_logs` | money, access tokens, text messages and audit events | Billing, access and support workflows |
| Transitional / unrelated data | `mios_*`, `teams`, `players`, `matches`, `innings`, `innings_players`, `ball_events`, `score_snapshots`, `club_memberships` | legacy MIOS records and cricket-domain data | Not used by the MIOS operational dashboard |

## Supported data types

| Type family | Examples in MIOS | Handling rule |
| --- | --- | --- |
| Identity | UUID tenant, document, table and user IDs | Always carry `tenant_id`; never infer tenancy from a client value |
| Controlled values | document status/type, department, plan, assessment status | Validate in the app and expose as dashboard filters/breakdowns |
| Time | upload, processing, event, due and production dates | Store timestamps with timezone; preserve source dates in tabular rows |
| Measures | units planned/produced/rejected, downtime minutes, page and usage counts | Normalize numeric spreadsheet fields during ingestion; aggregate only after tenant filtering |
| Unstructured knowledge | PDF, DOCX, TXT, Markdown, OCR text | Keep parser/OCR text in `chunks` as canonical evidence |
| Semi-structured tables | spreadsheet column definitions and row objects | Keep `columns` and `data` as JSONB; infer text/numeric/boolean types at import |
| LLM-derived knowledge | summary, topics, language, model, modality and coverage | Persist separately in `knowledge_insights`; it enriches evidence but never replaces it |
| Binary source material | objects in the private `documents` bucket | Access only through signed URLs or authorized download routes |

## Knowledge-insight pipeline

```text
Private upload → parser / table reader / OCR → Groq document analysis
              → canonical chunks + table rows → knowledge_insights
              → tenant-RLS dashboard summary → topic/type/model bar charts
```

`knowledge_insights` has one row per document. The document processor writes its LLM summary, topics, detected language, model, modality, chunk count and source-row count. Reprocessing first removes the old chunks, table rows and insight, so the dashboard cannot retain a stale analysis. The table is protected by a tenant select policy; only server-side service credentials write it.

## Implemented data-quality improvements

- Production aliases now map `produced_units`, `planned_units`, `rejected_units`, and `downtime_minutes` to the dashboard metric model.
- The dashboard renders comparative bars when there are fewer than eight time observations, avoiding a visually overstated trend line.
- A repeatable `backfill:knowledge-insights` script analyzes existing ready documents so legacy knowledge is included without re-uploading it.
- Demo seeding writes the same insight records as the production ingestion path.

## Recommended next steps

1. Add `pgvector` embeddings plus hybrid lexical/vector retrieval for semantic search at larger knowledgebase sizes.
2. Move ingestion to a durable job queue with retries, status events and per-file model-cost tracking.
3. Introduce a schema registry for recurring spreadsheet templates so `table_rows.data` can graduate to normalized production/quality event tables where appropriate.
4. Normalize topic labels (synonyms, taxonomy and confidence) before using them for alerts or KPI targets.
5. Materialize tenant dashboard rollups when production tables become large; keep the current direct aggregation for the small-data phase.
6. Separate or archive the unrelated cricket and transitional `mios_*` tables to reduce operational-schema ambiguity.
