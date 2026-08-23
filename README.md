# MIOS — Manufacturing OS Intelligence

**RAG-based AI intelligence layer for manufacturing databases. Multi-tenant SaaS. Built first for Bangladesh's factories.**

> "Ask your factory anything." — MIOS turns a factory's scattered documents, spreadsheets, ERP records, and machine logs into a single intelligent knowledge system with cited, bilingual (Bangla/English) answers.

---

## What it is

Factories run on paper, Excel files, WhatsApp threads, and disconnected ERPs. MIOS ingests all of it — SOPs, compliance audit reports, production sheets, QC records, machine manuals, sensor logs — and provides:

1. **Knowledge Core (RAG)** — natural-language Q&A over every document and record, with citations
2. **Production Intelligence** — text-to-SQL analytics: OEE, downtime, efficiency by line/order/operator
3. **Compliance Copilot** — audit prep for BSCI / SEDEX-SMETA / WRAP / RSC / buyer codes; instant CAP drafting
4. **Quality Intelligence** — defect pattern analysis and root-cause retrieval
5. **Traceability (v2)** — lot genealogy, EU Digital Product Passport-ready exports

## Repository layout

```
M_I_OS/
├── docs/
│   ├── 01-VISION-AND-PRODUCT.md    # Product definition, personas, modules
│   ├── 02-ARCHITECTURE.md          # SaaS multi-tenant system architecture
│   ├── 03-RAG-DESIGN.md            # Ingestion → chunking → retrieval pipeline
│   ├── 04-DEVELOPMENT-PLAN.md      # 18-month phased roadmap, team, budget
│   └── 05-BANGLADESH-GTM.md        # Market entry, pricing, partnerships
├── apps/
│   ├── api/                        # FastAPI backend + RAG services (Phase 1)
│   └── web/                        # Next.js frontend (Phase 1)
├── packages/
│   └── shared/                     # Shared types/schemas
├── infra/
│   └── docker-compose.yml          # Local dev stack (Postgres+pgvector, Redis)
└── docs/adr/                       # Architecture decision records
```

## Quick start (dev stack)

```bash
docker compose -f infra/docker-compose.yml up -d   # Postgres+pgvector, Redis, MinIO
```

Application code lands in Phase 1 of the roadmap (`docs/04-DEVELOPMENT-PLAN.md`).

## The one-page pitch

| | |
|---|---|
| **Problem** | 3,500+ RMG factories in Bangladesh (plus pharma, food, leather) lose margin to audit failures, downtime they can't diagnose, and data locked in PDFs and Excel. Buyer compliance is existential; digitization is <20% outside top-tier suppliers. |
| **Solution** | An AI operations brain that reads everything the factory already produces — no rip-and-replace ERP migration required. |
| **Wedge** | Compliance Copilot: audit preparation goes from weeks of binder-hunting to minutes of chat. Highest pain, fastest ROI story. |
| **Business model** | Per-factory SaaS subscription (USD-anchored, BDT-billed), enterprise on-prem option for large groups. |
| **Beachhead** | Mid-size RMG factories (800–5,000 workers) in Gazipur/Savar/Narayanganj supplying EU/US buyers. |
