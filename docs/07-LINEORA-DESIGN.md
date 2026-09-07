# Linora brand and three dashboard layouts

Brand: **Linora**. Tagline: **See the gap. Keep production moving.**
The name combines production-line recognition with a short, product-like sound. It is a creative
proposal; trademark, domain and language checks have not been performed. Avoid claiming market
popularity or name availability.

## Shared visual system

Warm paper background `#f5f6f2`, white surfaces, deep green text `#16352f`, teal action `#086b58`,
amber investigation `#b87912`, red failure `#b3342c`. Typography uses the system stack; large,
plain-language headings sit above compact evidence tables. Color always has a text equivalent.
Use clear focus rings, keyboard buttons, honest loading states, scoped timestamps and source
records. Core navigation: Operations, Knowledge, Assistant, Facilities. Compliance sits inside
the assistant rather than the primary navigation.

## A — Operations overview (recommended and implemented as the first slice)

Desktop spatial specification, 12 columns:

| Row | Left area | Right area |
|---|---|---|
| Header | Brand and workspace, columns 1–7 | Language and account, columns 8–12 |
| Introduction | Outcome headline and knowledge shortcut, columns 1–8 | Operational context, columns 9–12 |
| Input | Hourly line/start/target/actual form, all columns | Advanced JSON disclosure below |
| Metrics | Attainment, columns 1–4; gross shortfall, columns 5–8 | Observed/missing coverage, columns 9–12 |
| Evidence | Interval performance bars and exact source table, all columns | — |
| Investigation | Consecutive shortfall runs, columns 1–6 | Recurring clock-time gaps, columns 7–12 |
| Activity | Recent successful session actions, all columns | — |

Main action: add an hourly observation and analyze gaps. Select labeled demo data only through
an explicit button. No live feed or fabricated KPIs appear on initial load. Mobile stacks cards
and fields; exact tables scroll horizontally. Future facility/shift filters must change every
metric together, with an effective timestamp. Owner and corrective-action controls arrive with
persistent records in M3.

## B — Shift execution board

| Row | Left area | Right area |
|---|---|---|
| Header | Facility, floor, shift and offline status | Shift handover action |
| Main board | One row per line; target, actual, gap and last update, 8 columns | Escalations ordered by overdue time, 4 columns |
| Detail drawer | Selected line hourly trend, downtime reason and edit history | Assign owner and next review |
| Footer | Missing intervals and handover notes | Acknowledge shift |

Best for floor supervisors and shared tablets. Denser and faster for repeated entry, but weak
as a first executive demonstration and dependent on persistent, timely data. Use numeric entry
with large touch targets; queue offline drafts visibly, never silently overwrite corrected data.
This is a design proposal, not a second implemented dashboard.

## C — Intelligence desk

| Row | Left area | Right area |
|---|---|---|
| Header | Factory and question scope | Evidence freshness |
| Main | Conversation and suggested operational questions, 7 columns | Retrieved evidence and citations, 5 columns |
| Answer | Short answer, uncertainty and source links | Relevant gap/chart with exact records |
| Follow-up | Save investigation draft | Open source or assign for review |

Best for IE analysis, SOP lookup and management investigations. A chat-first homepage can hide
missing operational data and encourage unsupported answers, so use it as a secondary destination.
Only scoped read tools should be offered initially. Mutating actions require a reviewed draft,
server authorization and a recorded execution result. This is a design proposal.

## Recommendation

Choose A because it provides an immediate operations story with a clear trail from input to
calculation to investigation. Add B after the factory data pipeline is dependable; keep C for
questions that need document evidence. Validate with five supervisors and three production
managers: can each identify the largest shortfall and the missing data within 60 seconds?

## UI release checks still required

Desktop 1440 px and mobile 390 px browser review, keyboard-only flow, screen-reader names,
Bangla text wrapping and touch targets need a reachable preview. Component tests cover loading,
filtering, empty/error states, upload outcomes and successful gap submission. Browser screenshots
are not included because the local preview was blocked in this environment.
