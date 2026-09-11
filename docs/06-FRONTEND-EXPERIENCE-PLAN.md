# 06 — Frontend Experience Plan

**Last updated:** 2026-09-02  
**Status:** First frontend foundation pass implemented; pilot workflow integration next  
**Primary product wedge:** Compliance readiness for Bangladesh RMG factories

## 1. Product context

MIOS is not a general-purpose chatbot. It is an evidence-first manufacturing intelligence
workspace layered over the files and systems factories already use: SOPs, buyer audit reports,
corrective-action plans, production sheets, quality logs, and operational databases.

The frontend must make three promises visible in every important workflow:

1. **The answer is grounded.** Users can see which document page or data row supports a claim.
2. **The system understands factory work.** The experience is organized around audit readiness,
   production performance, quality, and evidence—not generic AI features.
3. **Humans remain accountable.** MIOS can assess and draft, but a responsible factory user can
   review, override, and export the final result.

### Primary user

**Nusrat, Compliance Manager** at a mid-market RMG factory in Gazipur, Savar,
Narayanganj, or Chattogram. She needs to prepare evidence before a buyer audit, find missing
records quickly, and coordinate corrective actions without searching through binders and shared
folders.

### Secondary users

- **Rafiq, Production Manager:** investigates output, efficiency, downtime, and recurring issues.
- **Kamal, Factory Director:** needs a compact risk and ROI summary rather than raw system detail.
- **Buyer or auditor guest:** needs read-only, scoped, traceable evidence access.

### North-star experience outcome

A compliance manager should be able to sign in, upload the factory's existing evidence, run an
audit-readiness assessment, review every AI verdict and citation, override incorrect statuses,
draft corrective actions, and export an evidence binder without training or implementation help.

## 2. Current product reality

The backend is ahead of the previous frontend presentation. The repository already contains:

- JWT authentication and tenant isolation;
- PDF, document, spreadsheet, and OCR ingestion paths;
- hybrid RAG chat with SSE streaming and page-level citations;
- guarded, read-only natural-language analytics over uploaded sheets;
- compliance templates, evidence assessment, manual overrides, CAP drafting, and binder export;
- tenant plans, quotas, and estimated expert-time savings;
- English and Bangla UI foundations.

The previous UI exposed most of these capabilities inside one dense workspace. It was functional,
but it did not communicate the compliance wedge, did not provide an operational overview, had weak
mobile behavior, and made the relationship between sources, answers, analysis, and evidence harder
to understand than necessary.

## 3. Experience architecture

The pilot information architecture uses one authenticated workspace with five clear views:

| View | User question | Primary action | Backend contract |
|---|---|---|---|
| **Overview** | What needs attention now? | Start an audit, ask MIOS, or add evidence | Usage, documents, tables |
| **Ask MIOS** | What do our factory sources say? | Ask a bilingual question and inspect citations | Chat SSE |
| **Compliance** | Are we ready for the next audit? | Assess evidence, override, draft CAP, export binder | Compliance API |
| **Analytics** | What is happening in production data? | Run a guarded natural-language query | Analytics API |
| **Knowledge base** | What evidence is connected? | Upload and monitor source processing | Documents API |

This structure keeps the compliance wedge prominent while preserving a shared intelligence layer
for production and document questions. It does not create separate products for each module.

## 4. Design principles

### Evidence stays close to the decision

Citations are not hidden in a generic disclosure. Chat responses show their source cards; audit
requirements show supporting evidence alongside the verdict; analytics exposes the generated
read-only SQL as inspectable detail.

### Operational density without dashboard noise

The interface uses compact rows, restrained status colors, and a small set of metrics. Decorative
charts are avoided unless real time-series data exists and the chart changes a decision.

### Bangla is a complete path

New pilot-facing strings must ship in English and Bangla together. User queries may be English,
Bangla script, Banglish, or code-mixed. Dates, number formatting, long translated labels, and
mobile layouts must be tested in both languages.

### Human review is explicit

AI-generated compliance verdicts and corrective actions must be visibly distinguishable from
manual review. A manual override must persist and must not be silently replaced by a later run.

### Layer on existing work

The UI should make PDF, Word, Excel, and CSV uploads feel first-class. ERP replacement, machine
control, and new transactional workflows remain out of scope for the pilot.

### Degrade honestly

Loading, empty, unavailable, processing, partial, and failure states must explain what is happening
and the next safe action. The UI must never imply that an assessment is complete while ingestion or
retrieval is still pending.

## 5. Frontend technical direction

### Existing stack

- Vite 8 single-page application
- React 19
- TypeScript strict mode
- Global CSS design tokens and responsive component classes
- Browser-side API client for the FastAPI `/v1` contracts
- SSE for chat and compliance assessment progress

### Component boundaries

The workspace should remain feature-oriented:

```text
src/app/workspace/
├── page.tsx                 # Auth gate, shared data, navigation, orchestration
├── DashboardOverview.tsx    # Operational summary and priority actions
├── ChatPanel.tsx            # Cited conversation and source context
├── CompliancePanel.tsx      # Audit assessments and requirement review
├── AnalyticsPanel.tsx       # Table catalog, query, result, SQL evidence
└── KnowledgePanel.tsx       # Upload and source processing states
```

As modules grow, API-specific state should move into focused hooks such as
`useWorkspaceSources`, `useComplianceAssessment`, and `useChatStream`. Do not add a global state
library until cross-route state or cache invalidation becomes a demonstrated problem.

### Data rules

- Start independent requests together with `Promise.allSettled` so one unavailable module does not
  blank the whole workspace.
- Store only the current access token and language choice locally. Do not persist sensitive answers,
  citations, or factory records in browser storage.
- Treat every mutation as tenant-scoped on the server; frontend route hiding is not authorization.
- Preserve SSE partial text while attaching citation metadata to the same assistant response.
- Refresh usage after metered chat or analytics actions.

### Design system foundation

The implemented token set defines:

- neutral operational canvas and high-contrast ink;
- factory green as the primary action and ready-state color;
- blue for informational states, amber for processing, and red for failures or gaps;
- 8/12/18 px radii for controls, panels, and high-level feature surfaces;
- compact status badges, source rows, evidence cards, and accessible focus rings;
- responsive breakpoints for desktop, compact laptop/tablet, and mobile.

Before adding a new component style, check whether it can be composed from the existing button,
field, section-card, status-badge, source-row, citation-card, or empty-state patterns.

## 6. Delivery plan

### Phase F0 — Frontend foundation (implemented in this pass)

**Goal:** Make the existing product legible and usable as one coherent manufacturing workspace.

- [x] Responsive authenticated shell with persistent module navigation
- [x] Command-center overview grounded in document, table, quota, and ROI data
- [x] Dedicated source library with upload, drag-and-drop, processing, failure, and empty states
- [x] Evidence-grounded chat layout with suggested bilingual prompts
- [x] Correctly attach streamed citations to the assistant response
- [x] Dedicated analytics workbench with table context, result table, and inspectable SQL
- [x] Compliance assessment hierarchy: assessment → requirement → evidence → CAP
- [x] Fix stale assessment selection when starting automated evidence assessment
- [x] Responsive authentication experience and bilingual form labels
- [x] Global design tokens, keyboard focus states, and reduced-motion behavior

**Verification gate:** production build succeeds; routes render without framework errors; core
controls remain usable at desktop and mobile widths.

### Phase F1 — Pilot-ready compliance journey (next)

**Goal:** Complete the primary end-to-end workflow against a live local API and realistic seed data.

- Add first-run onboarding that asks for factory name, audit framework, audit date, and initial
  evidence set.
- Add upload progress, accepted file validation, retry, and clearer OCR/indexing stages.
- Poll processing documents until ready; stop polling when the tab is hidden.
- Add assessment progress at requirement level with completed/total counts.
- Add filters for category, status, missing evidence, and manual overrides.
- Add editable CAP text with explicit save state and unsaved-change protection.
- Add evidence preview/deep link contract for cited document pages.
- Add a pre-export binder summary: included files, unresolved gaps, and confidential exclusions.
- Add an owner-visible audit activity trail for assessment runs, overrides, and exports.
- Add pilot seed data representing one RMG factory and one realistic buyer audit.

**Acceptance criteria:** a seeded factory can complete upload → assessment → review → override → CAP
→ binder export without leaving the workspace or using API tooling.

### Phase F2 — Trust, roles, and tenant administration

**Goal:** Make the workspace safe and understandable for a multi-user pilot.

- Role-aware navigation and action visibility for owner, admin, compliance manager, production
  manager, operator, and auditor guest.
- User invitation and role-management UI.
- Scoped auditor guest invitation, expiry, factory selection, and confidential-source exclusions.
- Audit-log viewer with actor, action, target, timestamp, and export.
- Session-expiry recovery that preserves unsent form input.
- OTP-first sign-in experience when backend decision D-5 is implemented.
- Error boundaries and module-level retry so one failed service does not collapse the shell.

**Acceptance criteria:** every pilot role has a documented allowed/denied action matrix covered by
API tests and browser smoke tests.

### Phase F3 — Production and quality intelligence

**Goal:** Turn uploaded operational sheets into repeatable management workflows.

- Saved analytics questions and recent-query history.
- Explicit table/sheet selection when multiple data sources contain similar columns.
- Result visualization selection driven by returned data shape, not guessed chart types.
- Shareable, tenant-scoped analysis snapshots with source and query provenance.
- Quality Intelligence: defect Pareto, line/style filters, similar prior defects, and resolution
  evidence.
- Weekly director digest with risk flags, exceptions, and links into the supporting analysis.
- Export for CSV and image-ready management summaries.

**Acceptance criteria:** production managers can answer the agreed pilot question set, verify source
tables, and reproduce every result.

### Phase F4 — Offline tolerance and integrations

**Goal:** Keep core knowledge usable during unstable connectivity and shorten time-to-value.

- Installable PWA shell and explicit online/offline state.
- Cached, encrypted knowledge packs for approved sources and roles.
- Queued uploads and user-visible sync conflict handling.
- Connector management for email-in, folder sync, Odoo, and later SAP Business One.
- Connector health, last sync, imported record count, and reconnect actions.
- Factory glossary management for line codes, departments, style codes, and Banglish terms.

**Acceptance criteria:** approved cached sources remain searchable during a controlled network loss,
and queued work reconciles without duplicate ingestion when connectivity returns.

### Phase F5 — Commercial and enterprise readiness

**Goal:** Support self-serve conversion and larger factory groups.

- Trial, plan, quota, and fair-use communication without interrupting critical audit review.
- bKash checkout and bank-transfer invoice status.
- Group and factory switcher with clearly visible query scope.
- SSO entry points, local/on-prem deployment status, and data-residency explanation.
- Cost-cap and usage controls for owners.
- Support entry points aligned to Bangladesh factory hours and WhatsApp-first operations.

## 7. Cross-cutting quality plan

### Accessibility

- Meet WCAG 2.2 AA contrast for text, status, and focus states.
- All functionality must be keyboard reachable; do not rely on row click alone.
- Use labels for every field, `aria-live` only for meaningful streamed/progress updates, and
  accessible names for icon-only controls if icons are introduced.
- Status must be expressed in text as well as color.
- Test at 200% zoom and with reduced motion enabled.

### Localization

- Keep English and Bangla dictionary keys type-locked.
- Test long Bangla labels at 360 px viewport width.
- Use locale-aware date and number formatting; retain source filenames exactly as uploaded.
- Define which compliance template content is translated versus shown in its authoritative source
  language.

### Performance

- Target <120 KB first-load JavaScript for the pilot workspace before heavy visualization modules.
- Dynamically load future charting, document preview, and export tools only when opened.
- Virtualize requirement or source lists only when real pilot data demonstrates the need.
- Avoid repeated polling and cancel obsolete SSE/fetch work on view or tenant changes.

### Security and privacy

- Keep authorization and tenant checks server-side for every API.
- Never render or log tokens, raw confidential records, or full source content in client telemetry.
- Sanitize any future rich-text/Markdown rendering; current plain-text rendering is safer.
- Document the token-storage migration path from local storage to secure server-managed sessions.
- Protect document preview and binder download URLs with the same tenant and role checks as metadata.

### Testing

1. **Unit:** status mapping, usage math, SSE frame handling, localization completeness.
2. **Component:** empty/error/loading/ready states for each workspace view.
3. **API contract:** generated TypeScript types or schema checks against FastAPI OpenAPI.
4. **Browser smoke:** sign in → upload → wait for ready → ask → inspect citation → create assessment
   → assess → override → draft CAP → export binder.
5. **Visual regression:** desktop and mobile snapshots for English and Bangla.
6. **Accessibility:** automated checks plus keyboard and screen-reader spot checks on the pilot path.

## 8. Immediate implementation backlog

| Priority | Work item | Why now | Done when |
|---|---|---|---|
| P0 | Live API end-to-end seed | Proves the UI against real contracts | Full compliance path passes locally |
| P0 | Document processing refresh | Upload currently requires manual/context refresh | Source status reaches ready automatically |
| P0 | Editable CAP save | Drafting without review/save is incomplete | User can edit, save, and return safely |
| P0 | Citation page preview contract | Trust depends on checking the evidence | Citation opens the correct protected page |
| P0 | Error/loading state pass | Pilot networks and OCR will fail sometimes | Every request has actionable recovery |
| P1 | Compliance filters and progress | Large templates need triage | User can isolate gaps and missing evidence |
| P1 | Role-aware UI and audit log | Required for a multi-user factory pilot | Role matrix and log view are verified |
| P1 | English/Bangla responsive QA | Localization is a differentiator | Pilot path passes both languages at 360 px |
| P1 | Browser smoke automation | Prevents regressions in the wedge flow | CI covers the full seeded happy path |
| P2 | Saved analytics and result charts | Improves repeat use after pilot proof | Saved questions reproduce sourced results |
| P2 | PWA/offline knowledge pack | Important under load-shedding | Controlled offline acceptance test passes |

## 9. Decisions still needed

These choices need product or pilot evidence before implementation expands:

1. Which buyer audit framework should be the default pilot template?
2. Should document citations open an internal preview first or the original file first?
3. Which fields may an auditor guest see by default, and which are always confidential?
4. Which three production questions are mandatory for the first design partner?
5. What is the maximum acceptable source-processing time shown to pilot users?
6. Which parts of a compliance requirement must be authoritatively translated into Bangla?
7. Should the pilot use the current password flow or wait for OTP-first authentication?

## 10. Phase F1 definition of done

The frontend becomes pilot-ready when all of the following are true:

- one realistic factory seed tenant is available;
- the full compliance journey passes against PostgreSQL, pgvector, object storage, and the API;
- every generated answer and verdict exposes usable evidence;
- manual overrides survive repeat assessment runs;
- binder export clearly reports included and unresolved items;
- English and Bangla flows work at desktop and mobile sizes;
- keyboard navigation and WCAG AA automated checks pass;
- no high-severity frontend security finding remains;
- the browser smoke flow runs in CI;
- a compliance manager can complete the pilot task without developer assistance.
