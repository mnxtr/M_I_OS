# 05 — Bangladesh Go-To-Market Plan

## 1. Market landscape

**Why Bangladesh, why now:**
- ~3,500 RMG export factories + thousands of domestic/ancillary units; RMG exports ≈ $47B (2nd largest globally); plus textiles, pharma (~300 licensed manufacturers), food processing, leather, light engineering
- **LDC graduation (2026)** → loss of duty-free access gradually → margin pressure → efficiency tech becomes survival spending
- **EU regulations incoming** (CSDDD, EUDR-style traceability, Digital Product Passport) → buyers will demand data their suppliers literally do not have systems to produce. MIOS is the fastest path.
- Digitization gap: top-tier suppliers run SAP/Odoo; the mid-market runs on Excel + paper. That mid-market is the beachhead — too big for ERP migrations, too pressured to stay manual.

**Buyer-side forcing function:** H&M, Zara/Inditex, Primark, Lidl etc. mandate audit regimes (BSCI/amfori, SEDEX-SMETA, WRAP, RSC after Accord). Failed audits = lost orders = existential. Compliance is the wedge because it has a **hard deadline** attached.

## 2. Segmentation & ICP

| Segment | Profile | Fit | Motion |
|---|---|---|---|
| **ICP: Mid-market RMG** | 800–5,000 workers, Gazipur/Savar/Narayanganj/Chattogram EPZ, EU/US buyers, no full ERP or Odoo-level only | ★★★★★ | Direct sales + association channel |
| Large groups (5–30 factories) | e.g., group HQs in Dhaka/Gulshan | ★★★★ | Enterprise, on-prem tier, long cycle, high ACV — start P2/P3 |
| Pharma | DGDA compliance, validation docs | ★★★ | Phase 4 second sector |
| Food & beverage / leather | BSTI, export cert pain | ★★ | Later |

## 3. Pricing (USD-anchored, BDT-billed)

| Tier | Price | Includes |
|---|---|---|
| **Starter** | $99/mo (≈12k BDT) | 1 factory, 10 users, 2,000 pages/mo ingestion, chat+search |
| **Growth** | $299/mo/factory | Unlimited-ish ingestion (fair use), Compliance Copilot, text-to-SQL analytics, auditor guest access |
| **Enterprise** | $800+/mo/factory or group deals $15–60k/yr | Integrations, SSO, VPC/on-prem, API, SLA, Bangla support desk |
| Pilot offer | 50% × 3 months | Design-partner terms P0–P2 |

Notes:
- Annual prepay = 2 months free (factories budget annually; improves cash + churn)
- Invoicing reality: many BD factories pay via bank transfer/FDR against proforma invoice; support bKash/Nagad for smaller units. Stripe secondary.
- Anchor ROI: one failed SMETA audit can cost an order worth $100k+. At $299/mo the math sells itself — put it on the one-pager.

## 4. Channel strategy

1. **Direct founder-led sales (P0–P2):** warm intros via BGMEA/BKMEA networks; target factories with audits scheduled 8–12 weeks out ("let us get you ready")
2. **Association partnerships:** BGMEA/BKMEA innovation programs, SME-focused initiatives; co-host "AI for factory compliance" seminars at trade expos (DITF, 4P Machinery expo)
3. **Compliance consultancies as resellers:** auditing/consulting firms already sell audit-prep services — give them white-label MIOS + revenue share
4. **ERP implementer channel (P3):** local Odoo/SAP partners bundle MIOS as the AI layer
5. **Buyer-side pull (P3+):** get one major buyer's sustainability team to recommend/reimburse MIOS for suppliers — the dream motion

## 5. Localization requirements

- Product UI: full Bangla toggle; number/date formats; Bangla calendar awareness for reporting
- AI quality: code-mixed Banglish queries, transliterated Bangla (how people actually type), Bangla OCR
- Support: WhatsApp-first support channel (that's where factory managers live), Bangla phone support hours aligned to factory shifts
- Sales collateral in both languages; contracts bilingual

## 6. Regulatory & trust checklist

- [ ] Bangladesh company incorporation + trade license
- [ ] Data-protection review (BD's draft data protection law trajectory + India/EU spillover obligations from buyers' DPAs)
- [ ] DPA templates for factory clients and their buyer-mandated disclosures
- [ ] On-prem kit for sensitive groups (data never leaves premises)
- [ ] Audit-log export feature (auditors & buyers demand traceability — turn it into a feature)
- [ ] Local hosting option evaluation (Bangladeshi DC providers) if residency objections persist

## 7. Launch milestones

| When | Milestone |
|---|---|
| M4 | First factory live (design partner), internal case-study data collection starts |
| M8 | Public case study: "Audit prep cut from 3 weeks to 4 days" + press via startup media (The Daily Star Tech, Dhaka Tribune, TechShoto) |
| M10–12 | GA launch event co-hosted with an industry association; 2 channel partnerships signed |
| M14 | Buyer-recommendation pilot with ≥1 EU buyer sustainability team |
| M18 | Regional expansion decision gate |

## 8. Competition

| Competitor type | Examples | Our edge |
|---|---|---|
| Global doc-AI / GPT wrappers | ChatGPT Enterprise, Notion AI | Factory-specific schemas, Bangla OCR, compliance workflows, on-prem, per-factory pricing |
| ERP vendors' AI add-ons | SAP/Odoo copilots | They only see their own silo; MIOS reads everything incl. paper scans; no migration |
| Local software houses | Custom builds | We're productized, multi-tenant, cheaper, faster; they're project shops |
| Status quo | Excel + binders | The real competitor — beat it with onboarding ease and hard-decimal ROI proof |
