# 01 — Vision & Product Definition

## 1. Vision

Every factory, regardless of size, deserves an operations brain. MIOS is the AI-native Manufacturing OS: a system of intelligence layered **on top of** the systems factories already have (paper, Excel, WhatsApp, legacy ERP), not a replacement for them.

**North star metric:** hours of expert time returned to each factory per week, measured via query volume and audit-prep cycle compression.

## 2. Why RAG for manufacturing

Manufacturing data is uniquely fragmented:

| Data type | Typical home today | Structured? |
|---|---|---|
| SOPs, work instructions | PDFs in email / binders on floor | No |
| Compliance & audit reports (BSCI, SMETA, CAPs) | PDFs, scanned images | No |
| Machine manuals | Paper / PDF, often only in Chinese/German/English | No |
| Production reports | Excel exports per line/day | Semi |
| QC / defect logs | Excel or paper check sheets | Semi |
| ERP records (orders, BOM, inventory) | Odoo / SAP B1 / LeadSoft / custom | Yes |
| Sensor/machine data | PLCs, rarely logged centrally | Yes (raw) |

Pure vector-RAG handles the unstructured 60%; pure BI/text-to-SQL handles structured 40%. **MIOS's core technical bet is hybrid retrieval**: one chat interface that reasons across both, with citations down to the page or row.

## 3. Target users (personas)

1. **Compliance Manager "Nusrat"** (RMG, Gazipur) — dreads buyer audits; needs instant retrieval of past corrective actions, fire-safety docs, worker training records. *Primary wedge persona.*
2. **Production Manager "Rafiq"** — wants "why was Line 7 at 62% efficiency last Tuesday?" answered without waiting for the planning office.
3. **Factory Director / Owner "Kamal"** — needs weekly plain-language summaries: risk flags, cost leaks, order-status roll-ups.
4. **Buyer/Auditor (read-only guest)** — scoped access to evidence documents during audits. Trust driver.

## 4. Product modules (release mapping)

| Module | Value | Release |
|---|---|---|
| **M0 Knowledge Core** | Upload PDF/XLSX/images → OCR (Bangla+English) → chat with citations | MVP |
| **M1 Compliance Copilot** | Audit checklist generation, gap detection vs. buyer codes, CAP drafting, evidence binder export | Pilot |
| **M2 Production Analytics (text-to-SQL)** | NL queries over production/QC tables; OEE, efficiency, WIP dashboards auto-generated | Pilot |
| **M3 Quality Intelligence** | Defect Pareto by style/line/operator; retrieve similar past defects + resolutions | GA |
| **M4 Integrations** | Excel/CSV sync folders, Odoo connector, SAP Business One, email ingestion | GA |
| **M5 Machine Telemetry** | OPC-UA/MQTT ingestion → downtime correlation with docs ("machine X jamming → manual says...") | v2 |
| **M6 Traceability / DPP** | Lot genealogy graph; EU Digital Product Passport export packs | v2 |

## 5. Differentiators

- **Bilingual-first (Bangla + English)** including Bangla OCR — no global vendor does this well
- **Offline-tolerant client** — progressive web app with cached knowledge packs for load-shedding/connectivity gaps
- **Citations always** — every answer traceable to document page, DB row, or sensor window
- **Deploy-anywhere privacy tier** — cloud SaaS default; VPC/on-prem option for large groups worried about buyer-sensitive pricing data
- **ROI ledger** — every session tracks estimated time saved; quarterly ROI report auto-generated per customer (churn defense)

## 6. Non-goals (v1)

- Replacing ERP/MES transactional systems
- Real-time SCADA control (we read, never write, to machines)
- Payroll/HR compliance filing
- Generic chatbot whitelabeling
