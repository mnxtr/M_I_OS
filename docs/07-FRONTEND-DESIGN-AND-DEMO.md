# 07 — Frontend Design & Demo-Readiness Plan

**Status:** Proposed · **Created:** 2026-09-04 · **Owner:** web workstream
**Extends:** `06-FRONTEND-PLAN.md` §6 (Design system) and §8 (Screens)
**Amends:** `06-FRONTEND-PLAN.md` §18 (Execution plan) — reorders sprints to unblock a demo from ADR-003
**Does not alter:** F-1…F-6, auth, RLS, or the Supabase target architecture

---

## 0. Decisions locked

| # | Decision |
|---|---|
| G-1 | Build on 06-PLAN's Next.js 16 shell (Sprint 0 scaffold), **not** the legacy Vite SPA |
| G-2 | All screens are built against a swappable `DataSource` interface; `DemoDataSource` ships first |
| G-3 | Demo mode is a **runtime flag** (`NEXT_PUBLIC_DATA_SOURCE=demo\|live`), not a separate build target — one codebase, one deploy, so the demo cannot rot |
| G-4 | Primary audience is **public/GitHub showcase**: zero-setup, no signup wall, indexable, README-first |
| G-5 | Auth (06-PLAN Sprint 1) is deferred *behind* the demo track. ADR-003 is written in parallel as a doc |
| G-6 | Demo data is always visibly labelled as demo data |

**Cost of G-5, stated honestly:** 06-PLAN §18 deliberately front-loads auth as "highest risk — do it second, not last." Deferring it delays discovery of Supabase auth/RLS integration risk. Mitigations: (a) the `DataSource` interface is shaped to the real API contract so the live adapter is a fill-in, not a redesign; (b) ADR-003 is a *decision document* requiring no code — it proceeds concurrently; (c) 06-PLAN's RLS negative-test suite stays a Sprint-1 gate, unchanged.

---

## Context: why this plan exists

`docs/06-FRONTEND-PLAN.md` (924 lines) already specifies the platform rebuild thoroughly. This plan does **not** duplicate it. It fills two gaps that block the stated goal of a demo-ready project:

1. **06-PLAN is ~90% platform, ~10% design.** §6 is ~50 lines of 924 — colour tokens, a shadcn install list, and Bangla typography notes. There is no visual hierarchy, layout grid, component anatomy, motion spec, state catalogue, or data-viz design.
2. **06-PLAN cannot produce a demo.** Verified blockers:

| Claim | Status |
|---|---|
| B-1: No CORS middleware in FastAPI | **Confirmed** — zero matches in `apps/api/app/` |
| ADR-003/004/005 required before Sprint 1 | **Not written** — only `001-jsonb-tabular-storage.md` exists |
| No production tenants | Confirmed (`04-DEVELOPMENT-PLAN.md` §0) |
| `compliance_seed.py` exists for seeding | Confirmed |

Consequences: the plan is formally blocked on ADR-003 (a founder/GTM decision whose option (b) would invalidate F-2); §13's A-1…A-10 backend changes block web delivery; B-1 means the current SPA cannot reach the API cross-origin *today*; the flagship `/ask` screen lands in Sprint 3 (~4 weeks); and every screen requires Postgres + pgvector + Redis + MinIO + an OpenAI key, so no one can be handed a URL.

---

## Part A — Design audit

Concrete findings from the current 987-line Vite SPA. Each is evidenced, and each recurs in the rebuild if not specified away.

### A.1 Accessibility defects

| # | Finding | Evidence | Severity |
|---|---|---|---|
| D-1 | **Primary button fails WCAG AA.** White text on `--accent: #4f8cff` ≈ **3.0:1**, below the 4.5:1 floor. The single most important control in the product. | `globals.css:65-73` | **High** |
| D-2 | **Placeholder-as-label everywhere.** No `<label>` on any input; placeholder vanishes on input. Fails WCAG 3.3.2. | `AuthPage.tsx:75-106`, composer `WorkspacePage.tsx:378` | **High** |
| D-3 | **Tabs are buttons faking tabs.** No `role="tablist"`, no `aria-selected`; active state conveyed by **colour only** — fails WCAG 1.4.1. Duplicated in two files. | `AuthPage.tsx:119`, `WorkspacePage.tsx:396` | **High** |
| D-4 | **Streaming answer has no live region.** Tokens append with no `aria-live`; screen-reader users get silence or spam. | `WorkspacePage.tsx:100-108` | **High** |
| D-5 | **No `:focus-visible` anywhere.** `.btn` has `:hover` only; `.input:focus` changes a 1px border colour — effectively invisible. Keyboard users are lost. | `globals.css:59-77` | **High** |
| D-6 | Chat turn role conveyed by background colour + asymmetric margin only. No label, no semantics. | `WorkspacePage.tsx:340-352` | Medium |
| D-7 | Usage progress bar is a bare 70×5px `<span>` — no `role="progressbar"`, no accessible value. | `WorkspacePage.tsx:417-435` | Medium |
| D-8 | Result tables have no `<caption>`, no `scope` on `<th>`. | `WorkspacePage.tsx:290-324` | Medium |

### A.2 Product-promise mismatches

| # | Finding | Why it matters |
|---|---|---|
| D-9 | **Citations are visually recessive** — hidden behind a `muted` 13px `<summary>`. README's stated core promise is "citations always"; the UI buries the differentiator. | Directly undercuts the pitch |
| D-10 | **ROI signal hidden in a `title=` tooltip.** `estimated_minutes_saved` is a stated product principle, reachable only by hover — invisible on touch, invisible in screenshots. | Kills the value narrative |
| D-11 | **Silent failure swallowing.** Three `.catch(() => {})` in one effect. With CORS absent (B-1), the API *always* fails — so the app renders an empty workspace with **zero indication anything is wrong**. | Worst demo bug in the codebase |
| D-12 | `rows.slice(0, 20)` truncates results with no "showing 20 of N". Misleading. | Trust |
| D-13 | 6 statuses in `ITEM_STATUSES`, only 3 visual treatments; `badgeClass()` returns `""` for `unknown`/`not_applicable` — they render identically. | Compliance legibility |

### A.3 Systemic design-craft gaps

| # | Finding | Evidence |
|---|---|---|
| D-14 | **No spacing system.** ~60+ inline style objects using arbitrary values (8, 10, 12, 14, 16, 18, 48). No grid. | all three components |
| D-15 | **No typography scale.** Sizes 28/22/16/14/13/12px assigned ad hoc inline. | throughout |
| D-16 | **No line-height set.** 06-PLAN §6.3 correctly notes Bengali conjuncts need ~1.65 leading — Bangla text currently clips `ঁ`/`ূ`. | `globals.css:17-27` |
| D-17 | **Bangla font is never loaded.** `"Noto Sans Bengali"` is named in the stack but there is no `@font-face`/`next/font` — it silently falls back to system metrics on most machines. Core failure for a bilingual product. | `globals.css:19-24` |
| D-18 | **Zero responsive design.** `gridTemplateColumns: "340px 1fr"` fixed; no media query in the entire stylesheet. Breaks below ~700px. | `WorkspacePage.tsx:167` |
| D-19 | **Inline styles preclude states.** Cannot express `:hover`/`:focus-visible`/`:active` inline; `activeTab` object is copy-pasted across two files. | `AuthPage.tsx:119`, `WorkspacePage.tsx:396` |
| D-20 | **No loading states.** `Thinking…` is a bare `<p>`; document list pops in from empty. No skeletons. | `WorkspacePage.tsx:371` |
| D-21 | **One shared `error` string** for upload + chat + analytics; no retry affordance anywhere. | `WorkspacePage.tsx:39` |
| D-22 | Fixed `minHeight: 70vh` + inner `overflowY: auto` overflows on short viewports. | `WorkspacePage.tsx:208` |

---

## Part B — Design system specification

Fills 06-PLAN §6.

### B.1 Colour — corrected ramp

Keep the palette's character; fix the contrast maths. **Constraint:** any fill carrying white text must reach ≥4.5:1 (measured luminance ≤ ~0.18).

Two verified anchors to build from:

- `#4f8cff` on `#0f1115` ≈ **6.3:1** → excellent for *text, borders, focus rings, icons* on dark. Keep as `accent-500`.
- White on `#4f8cff` ≈ **3.0:1** → **never** use as a white-text fill. Existing `--accent-dark: #3a6fd8` ≈ 4.4:1 also misses.

Deliverable: a 400/500/600/700 accent ramp where `accent-600` is darkened until white text clears 4.5:1 (~L ≤ 0.18), used for all filled CTAs. Same treatment for `danger` (currently ~4.5:1 borderline) and `ok`. Every token pair recorded in a contrast table checked in CI via a token-level assertion, so a palette tweak cannot silently regress D-1.

Also add: `--color-warn` (currently a bare `#e2b93b` literal in two places), and distinct treatments for all 6 compliance statuses (fixes D-13) using shape/icon + colour, never colour alone (WCAG 1.4.1).

### B.2 Spacing, radius, elevation

4px baseline grid, `space-1`…`space-12`. Radius: `sm` 6 / `panel` 10 (ports existing) / `full`. Elevation via border + subtle inner highlight — no drop shadows on a near-black surface (they read as mud).

### B.3 Typography scale

`display / h1 / h2 / h3 / body / body-sm / caption / mono`, each with an explicit `line-height`. Two hard rules from A.3:

- Minimum body size **14px**, and 16px for anything a supervisor reads on the floor. `.muted` at 13px currently carries critical info (document status, evidence snippets) — promote it.
- **`leading-relaxed` (~1.65) floor on all Bangla-capable text** (fixes D-16).

### B.4 Font loading (fixes D-17)

`next/font` self-hosting Inter (latin) + Noto Sans Bengali (bengali subset only), exposed as `--font-inter` / `--font-noto-bengali`, both in one `--font-sans` stack so mixed-script strings ("Line ৭ er output") do not switch fonts mid-sentence. `<html lang>` set server-side from the cookie per 06-PLAN §6.3.

### B.5 State catalogue — the missing layer

Every data surface gets four specified states, not three: **loading / empty / error / partial**.

| State | Spec |
|---|---|
| Loading | Skeletons matched to final layout dimensions (no layout shift). Never a bare spinner for content. |
| Empty | Icon + one-line explanation + **primary action**. Reuse existing copy (`noDocsYet`, `analyticsHint`) — it already names the right artifacts. |
| Error | Cause + consequence + **retry button**. Scoped per-surface, not one global string (fixes D-21). Kills the silent-catch pattern (D-11). |
| Partial | "Showing 20 of 1,204" + a way to see more (fixes D-12). |

### B.6 Focus & interaction (fixes D-5)

Single `--ring` token, 2px offset ring on `:focus-visible` for every interactive element. Visible hover, active, disabled, and loading states on all controls. Real `<Tabs>` primitive with `role="tablist"`/`aria-selected` replaces the faked ones (fixes D-3). All inputs get real `<label>` (fixes D-2).

### B.7 Motion

Tokens only: `duration-fast` 120ms / `base` 200ms / `slow` 320ms; one standard easing. Applies to disclosure, drawer, toast, tab underline, streaming caret. **`prefers-reduced-motion` disables all of it** — including the streaming caret animation and the tour.

### B.8 Responsive (fixes D-18)

Breakpoints sm/md/lg/xl. Sidebar → `Sheet` below `md`. Chat becomes single-column with the citation drawer as a bottom sheet. 44×44px minimum touch targets. Replace `70vh` with flex-based fill (fixes D-22).

### B.9 Component inventory

06-PLAN §6.2's shadcn list, plus these product-specific compositions it does not name:

`CitationChip` · `CitationDrawer` · `StreamingAnswer` (live region, caret, abort) · `ProvenanceFooter` (provider badge) · `StatusBadge` (6 states) · `LockedStatusPicker` (`manually_set`) · `UploadDropzone` (real progress) · `SqlDisclosure` · `ResultTable` (virtualized, sortable, CSV) · `AutoAssessProgress` · `RoiMeter` (promotes D-10 out of the tooltip) · `EmptyState` · `ErrorState` · `SkeletonTable` · `DemoBadge` · `TourCoachmark`

Verified in a dev-only `/design` gallery route rendering every component × every state × en/bn. **Deliberately not Storybook** — a route gallery is a fraction of the setup cost and is exercised by the same build.

---

## Part C — Demo architecture

### C.1 The seam

```
components/  →  lib/data/index.ts  →  DemoDataSource   (fixtures, zero network)
                (DataSource iface)  →  LiveDataSource   (Supabase + FastAPI)
```

One interface mirroring the real API contract (`packages/shared` types lifted from `lib/api.ts` per 06-PLAN §1.3). Selected by `NEXT_PUBLIC_DATA_SOURCE`. In demo mode `proxy.ts` short-circuits to allow-all; RSC reads resolve from in-memory fixtures, so **no static export is needed** and Vercel hosts it free on the normal pipeline.

### C.2 Simulated streaming — the critical detail

`/ask` is the product. It must stream with citations and **no LLM**.

`DemoDataSource.chat.stream()` is an async generator emitting the *identical* SSE frame contract (`{type:'citations'}` then `{type:'token'}`), consumed by the **same** `sseFrames` reader from 06-PLAN §7.1. The UI component cannot tell the difference — which is exactly why the demo path will not diverge and rot.

Timing: first token < 400ms; 18–28ms per token with jitter. Abort via `AbortController` works identically.

### C.3 Fixtures — where portfolio credibility is won

A believable Bangladeshi RMG factory. Reuse `Meghna Apparels Ltd` (already in the i18n placeholder) for consistency.

| Fixture | Content |
|---|---|
| Documents (~14) | Needle-change SOP, fire-drill records, BSCI/SMETA audit reports, buyer CoC, production sheets, QC defect logs, MSDS, training records. Statuses mixed — including **one `failed` with a plausible OCR error**, so honest error design is visible |
| Tables (2–3) | `line, date, order_no, output_qty, target_qty, defects, downtime_min` |
| Assessments (2) | One mid-progress with mixed statuses **including a `manually_set` locked item**; one complete with a binder |
| Q&A pairs (~12) | Pre-authored answers whose citations point at **real fixture page numbers**, so the `?page=&chunk=` deep link genuinely resolves |
| Usage/ROI | Plausible plan, quota, and minutes-saved ledger |

Every fixture authored in **both en and bn**.

### C.4 Free-text handling, honestly

Visitors will type anything. The demo adapter fuzzy-matches against the authored intents (keyword scoring, incl. Bangla + Banglish variants). No match → a graceful "this demo answers a fixed set of questions" with suggestion chips. Suggested prompts are the **primary** affordance, so most visitors land on a scripted path by default. `DemoBadge` is persistent and non-intrusive (G-6) — we do not imply a live model.

---

## Part D — Portfolio-specific requirements

Most GitHub visitors never click a demo link, so README assets outrank the app itself.

| # | Item | Spec |
|---|---|---|
| P-1 | **README assets** | 4–6 optimized WebP/GIF loops + a hero shot, captured by a **Playwright script at fixed 1440×900 against deterministic fixtures** — reproducible, regenerable, no hand-editing |
| P-2 | **Landing `/`** | 30-second comprehension: headline, value prop, a looping cited-answer proof, one CTA. Static, SEO, bn/en |
| P-3 | **One-click entry** | `/demo` seeds and lands on `/ask`. **No signup wall.** `/login` stays reachable for the live build but is off the demo path |
| P-4 | **Self-guided tour** | 4–6 dismissible coachmarks (`?tour=1`, localStorage): upload → ask → citation → analytics → compliance → binder. Respects `prefers-reduced-motion` |
| P-5 | **Shareable deep links** | `/ask`, `/knowledge/[id]?page=12`, `/compliance/[id]`. Kills HashRouter (06-PLAN §1.1) |
| P-6 | **Indexable** | Demo is `index,follow` — the inverse of the `/guest/[token]` `noindex` rule, which stays |
| P-7 | **OG/social cards** | Real preview images so links unfurl properly |
| P-8 | **README correction** | It currently claims Next.js and port 3000 while the app is a Vite SPA. Fix as part of this track, not later |

---

## Part E — Accessibility & performance gates

**Accessibility** — WCAG 2.1 AA, enforced not aspirational:

- `@axe-core/playwright`, **zero serious/critical** on `/`, `/ask`, `/knowledge`, `/knowledge/[id]`, `/analytics`, `/compliance/[id]`, `/design`
- Keyboard-only walkthrough of the full demo path as a Playwright test
- Token-level contrast assertion in CI (prevents D-1 regressing)
- Live-region test asserting streaming announces without spamming (D-4)

**Performance** — adopts 06-PLAN §16 budgets, with portfolio emphasis:

| Metric | Budget | Where |
|---|---|---|
| LCP | < 2.0s on Fast 3G | `/` — the portfolio front door |
| First token | < 400ms | `/ask` demo mode |
| Route JS (gzip) | < 180 KB | Lighthouse CI |
| Tables | virtualize > 100 rows | knowledge, analytics |

Levers: RSC for lists, `next/dynamic` for the PDF viewer and result table, Bengali subset only, no client data library on first paint.

---

## Part F — Sequencing

Three weeks, one full-time frontend engineer. Each gate verified **on a Vercel preview URL**, not localhost.

| Sprint | Scope | Gate |
|---|---|---|
| **D0** — Foundation & design system | Root workspaces · Next.js 16 scaffold · Tailwind v4 `@theme` with **corrected ramp** · `next/font` both scripts · shadcn init · primitives + state catalogue (B.5) · focus system (B.6) · motion tokens · app shell (sidebar, header, lang, `RoiMeter`) · `/design` gallery | Gallery renders every component × state × en/bn; axe clean; contrast assertion green; `tsc --noEmit` + `next build` green |
| **D1** — Demo layer & core screens | `DataSource` iface · `DemoDataSource` + fixtures (C.3) · simulated SSE (C.2) · `/ask` with citation chips, drawer, deep links, abort, provenance footer · `/knowledge` + uploader + viewer anchors | **Full cited-answer flow works with zero backend, zero Supabase.** Citation deep-links to a real fixture page |
| **D2** — Analytics & Compliance | Analytics console · `SqlDisclosure` · virtualized results + CSV · guardrail error copy · assessments list/create · item table grouped by category with `manually_set` lock · evidence panel · simulated auto-assess progress · CAP editor · binder download | Create → auto-assess with live row updates → CAP → binder, all in demo mode |
| **D3** — Portfolio polish | Landing · `/demo` entry · tour · README capture pipeline (P-1) · responsive/mobile pass · bn visual-regression snapshots · a11y + Lighthouse gates · README/`04-PLAN` corrections | All Part E gates green; README shows real captured assets; demo reachable from a public URL with no setup |

**Then** 06-PLAN Sprints 1 and 5 proceed unchanged (auth/RLS/Supabase, guest, billing, hardening) once ADR-003 is signed off — and `LiveDataSource` fills the interface D1 defined. No demo work is discarded.

### Explicitly out of scope

No Redux/Zustand/Jotai (06-PLAN §7 excludes it, correctly). No light theme in v1. No Storybook. No `next-intl`. No i18n rewrite — the compile-time `Dict` parity trick is kept (06-PLAN §1.3).

---

## Part G — Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Demo diverges from live behaviour and rots | **High** | One interface, one runtime flag, identical SSE contract; demo path covered by the same Playwright suite that will run against live |
| Demo mistaken for a working product | Medium | Persistent `DemoBadge`; honest no-match copy; README states demo-data scope plainly |
| Deferring auth hides RLS integration risk | Medium | Stated in G-5; ADR-003 written in parallel; 06-PLAN's RLS negative suite remains a Sprint-1 gate |
| Fixture authoring underestimated (28 bilingual artifacts) | Medium | Timeboxed in D1; breadth over depth — every screen populated before any screen is perfected |
| ADR-003 resolves toward self-hosting, invalidating F-2 | **High** (inherited) | Demo track is deliberately independent of it — this plan's value does not depend on the outcome |
| Bangla layout regressions from Tailwind's Latin defaults | Low | bn visual-regression snapshots in D3; `leading` floor enforced in B.3 |

---

## Part H — Definition of done

1. A stranger opens a public URL, understands what MIOS does within 30 seconds, and reaches a **cited** streaming answer in under three clicks — **no signup, no backend, no API key**.
2. That same flow works in Bangla, with correctly loaded fonts and no clipped conjuncts.
3. A citation deep-links to the exact page of a real fixture document.
4. Auto-assess runs to completion with live row updates and a downloadable binder, in demo mode.
5. Zero serious/critical axe violations on all seven audited routes; keyboard-only path passes.
6. Every token pair meets 4.5:1, asserted in CI — D-1 cannot regress.
7. README shows reproducibly-captured assets and describes the stack that actually ships.
8. `NEXT_PUBLIC_DATA_SOURCE=live` swaps adapters with no component changes.

---

## Open items

- **Fixture authoring ownership.** The 3-week estimate assumes C.3's content (14 documents, 12 Q&A pairs, 2 assessments, all bilingual) is authored by someone with RMG domain knowledge. If it must be researched from scratch, D1 grows by several days.
- **ADR-003 owner and deadline.** Not an engineering decision. Blocks 06-PLAN Sprint 1, not this plan.
