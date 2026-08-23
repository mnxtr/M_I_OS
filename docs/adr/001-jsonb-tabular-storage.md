# ADR-001: JSONB row storage for ingested spreadsheets

**Status:** Accepted (Phase 2)
**Date:** 2026-08-24

## Context

Excel/CSV production sheets are the primary structured data source in target factories.
We need NL→SQL analytics over them while preserving strict multi-tenant isolation.
Options considered:

1. **Real Postgres tables per tenant** (`data_<tenant>_<sheet>`)
   - ✅ native SQL performance
   - ❌ dynamic DDL from request paths, RLS/grants complexity, catalog bloat,
     migration pain on schema drift, no cross-tenant ops tooling safety
2. **Single `table_rows` table with JSONB `data` column + tenant RLS**
   - ✅ one table, RLS applies uniformly, schema lives in `table_sources.columns`
   - ✅ queries run through a bounded wrapper built server-side
   - ❌ JSONB overhead vs native columns
3. **External OLAP store (DuckDB/ClickHouse)**
   - ✅ analytics-grade performance
   - ❌ second datastore to operate in Phase 2; sync + tenancy complexity

## Decision

Option 2 — JSONB rows with a per-table inferred schema stored in `table_sources`.
Generated SQL targets a bounded wrapper:

```sql
SELECT * FROM (<generated select over alias t>) AS mios_bounded LIMIT 1000
```

where the LLM is shown only the virtual DDL + 5 sample rows, and the guardrail layer
(`services/sqlguard.py`) rejects anything that is not a single SELECT/WITH statement,
with a keyword blocklist and comment stripping. Row materialization into the query is
built server-side per tenant; tenant scoping never depends on generated SQL text.

## Consequences

- Fine for ≤50k rows/table (config `analytics_max_rows`); revisit when a tenant
  exceeds ~1M rows or sub-second dashboards are demanded.
- Type inference is advisory (text fallback); numeric coercion happens at parse time
  (`"1,400"` → `1400`), so aggregates behave correctly for common BD export formats.
- The wrapper pattern guarantees hard result caps regardless of model output.

## Revisit triggers

- Any table >500k rows sustained → evaluate DuckDB-per-tenant file storage.
- Cross-table joins demanded frequently → add multi-table context builder first,
  keep same guardrails.
