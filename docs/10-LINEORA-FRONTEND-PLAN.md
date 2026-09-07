# Lineora frontend refresh and UX plan

This iteration improves the existing React/Vite application. It retains the Lineora name,
operations-first direction and existing API contracts. It does not add a live factory feed,
persistent production storage or new authentication authority.

## Product direction

Make the daily workflow easy to understand: enter actuals → review the draft → analyze gaps →
inspect source records → consult factory knowledge. The workspace should feel like a calm,
purpose-built operations product. Use the sign-in page for the brand story and keep the working
screen compact. Avoid performance claims without factory data and avoid decorative charts that
look like live production numbers.

## Implemented improvements

| Previous friction | Implemented change | User benefit |
|---|---|---|
| Large marketing hero above the working form | Compact overview header, persistent desktop sidebar and horizontal mobile navigation | Tasks appear sooner; section locations remain consistent |
| Section navigation unmounted production inputs | Visited sections stay mounted and are hidden accessibly | Drafts and results survive section changes within the session |
| Added rows were only visible in JSON | Draft table, count, unknown labels, remove buttons and success feedback | Operators can check and correct entries before analysis |
| Demo button silently overwrote drafts | Inline replace/keep choice | Existing draft data is not replaced accidentally |
| Form accepted fractional pieces and ambiguous interval modes | Whole-piece validation, 500-record cap and explicit 60-minute entry requirement | Earlier, more actionable correction feedback |
| All source rows rendered at once | Line filter and 20-row result pages; chart capped at 24 points | Smaller rendered tables with an explicit scope |
| Identical clock times across days looked ambiguous | Chart labels include the date and Dhaka time | Repeated slots remain distinguishable |
| Login was a small, plain form | Split brand/form layout, visible labels, password visibility toggle and mode feedback | Clearer onboarding and fewer password-entry errors |
| Chat started as an empty box | Suggested operational prompts that fill, but do not send, the composer | Easier first question without unexpected API usage |
| User chat text lacked contrast on dark bubbles | Explicit white foreground | Readable user messages |
| Opening overview fetched assistant data, including duplicate requests | Fetch assistant sources/tables/usage together after authentication and first assistant visit | Removes unneeded overview requests and duplicate fetching |
| Every screen shipped in the initial page module | Lazy workspace route and secondary components | Defers screen code until it is needed |
| File drop area had no drag feedback | Highlighted drop state and clearer processing explanation | Visible feedback without exposing implementation jargon |

The initial refresh retained drafts only in memory. The next implementation adds explicit
server save/restore, subject to migration and backend enablement; see
[the activation contract](11-PRODUCTION-DRAFTS.md). Unsaved changes still clear on refresh or
sign-out. No factory data is copied into localStorage by these changes.
The result line filter applies to the chart/table; summary cards and patterns retain the full
submitted scope, with a visible explanation.

## Visual system

- Dark blue-green navigation `#142d34`, quiet grey canvas `#f4f6f8`, white working surfaces.
- Teal primary actions, mint active navigation, amber shortfall bars and red failures.
- Restrained borders, subtle shadows, rounded 8–16 px surfaces and system typography.
- Decorative icons are inline SVG, hidden from assistive technology; no icon-font dependency.
- Buttons generally have a 44 px minimum height; keyboard focus remains visible.
- Three card columns on desktop; stacked cards and single-column entry on narrow phones.
- Mobile navigation scrolls horizontally within its own area; evidence tables scroll within
  their cards. Avoid forcing the whole page to a desktop width.
- Reduced-motion preferences disable transitions. Language controls expose their selected state.

## Optimization evidence and limits

Before this refresh, the production build emitted an application entry chunk of approximately
282.78 kB raw / 89.09 kB gzip, plus the 227.02 kB Supabase chunk. The first refreshed build emitted
252.61 kB raw / 81.31 kB gzip for the entry, with workspace and secondary screens split into
separate chunks. The Supabase chunk is still required by authentication. These are build sizes,
not measured page-load latency or Core Web Vitals.

The richer visual system increased CSS from about 6 kB to 16 kB raw. This is an explicit tradeoff;
avoid claiming every asset became smaller. No new runtime dependency was added. Keep the chart
and table rendering bounded rather than importing a chart library for simple interval bars.

Lazy-loaded views have a visible loading fallback. Retaining visited views consumes more session
memory than unmounting them; this is intentional to prevent loss of entered work. Long-lived
production sessions should later move drafts into a scoped state store and allow safe eviction.

## Prioritized next work

| Priority | Feature | Dependency | Acceptance criterion |
|---|---|---|---|
| P0 | Reachable preview and visual QA | Vercel project access/configuration | Inspect 390, 768 and 1440 px; no page overflow; all primary controls reachable by keyboard |
| P0 | Persistent facility/shift/line context | Canonical backend facility mapping and RLS | Every saved record and metric has authorized facility/shift scope; no UUID assumptions |
| P0 | Save/resume production drafts | Authenticated persistence API | Refresh retains approved drafts; server validation and conflict state are visible |
| P1 | CSV mapping and validation preview | Import API and idempotent source keys | Show invalid cells and units before committing; replay does not duplicate output |
| P1 | Investigation drawer | Durable gap and action records | Select a gap, see source intervals, assign an owner, set a review time and record outcome |
| P1 | Durable activity timeline | Server event storage | Timestamp, actor and facility are authoritative; pagination and permissions enforced |
| P1 | Full Bangla pass | Supervisor feedback | All operational labels/errors, dates and number formats reviewed by a Bangla speaker |
| P1 | Chat source drawer and provider status | RAG evaluation and provider metadata | Distinguish live generation, fallback, incomplete answer and source support |
| P2 | Mobile offline entry | Conflict-resolution contract | Pending, synced and failed entries are visible; reconnect never silently overwrites data |
| P2 | Shared component extraction | Stable visual review | Consolidate buttons, tables, field errors and loading surfaces without changing contracts |
| P2 | Measured performance budget | Real preview and telemetry | Record LCP/INP/CLS and slow-network traces before claiming a speed improvement |

## Validation

Automated interaction coverage includes draft retention across navigation, deferred resource
fetching, suggested-question behavior, password visibility, account-mode explanation, draft
removal, unknown actuals, demo replacement protection, and filtered pagination. Existing knowledge
upload/error/empty/filter tests remain part of the suite. Run `npm test` and `npm run build` from
`apps/web`.
Recorded verification: 18 frontend tests passed; TypeScript and Vite production build passed.

A browser visual/accessibility audit has not been completed. The previous environment blocked
localhost preview access. Component tests and TypeScript checks do not substitute for inspecting
the responsive layout, screen-reader behavior or actual mobile performance.

Pilot usability protocol: ask five supervisors to add one interval with an unknown actual, fix
a mistaken row, switch to knowledge and back, run analysis and identify a recurring gap. Measure
completion rate, time and errors. Proposed target: at least four of five complete the basic flow
without assistance. This is a future evaluation target, not a claimed result.
