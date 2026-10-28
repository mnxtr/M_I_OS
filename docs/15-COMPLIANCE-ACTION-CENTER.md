# Linora Compliance Action Center — vertical-slice implementation plan

**Feature status:** code implemented on a draft branch; SQL is **review-only** and has **not** been applied to production or staging. The page and API default to disabled unless the server sets `FEATURE_COMPLIANCE_ACTIONS=true`.

**Goal:** give factory leadership one tenant-scoped view of evidence remediation work: who owns the gap, when it is due, whether progress is blocked, and which assessment must be reviewed. This is a task register, **not** a regulator-issued compliance score, certification, or substitute for a qualified auditor.

## 1. Design and user workflow

Personas: **owner / C-suite** (time-critical exceptions and accountability), **compliance manager** (create and update tasks), and **operator** (not granted access in the first slice). The existing compliance workspace remains the authoritative source of requirements and evidence.

1. Open **Compliance → Action Center** when enabled.
2. View compact executive cards: active, overdue, due in seven days, resolved.
3. Search/filter the review queue; open an assessment to inspect underlying evidence.
4. Create an action from an existing pending, unknown, partial, or gap assessment item. An item can have at most one action.
5. Assign an active same-tenant colleague, set priority/deadline, and record remediation notes.
6. Move through `open → in_progress / blocked → resolved`; closing requires a resolution note. The original assessment **does not change** as a side effect.

Visual language: dark command-center surfaces consistent with Linora, restrained mint accents for actions, amber for deadlines, red for overdue/blocked, positive status only for **task completion**. Responsive two-column layout collapses into a single column on phones. Native select/date controls, explicit labels, status text beyond color, keyboard focus, accessible filter buttons and alert messages. All values come from real tenant rows; no fictitious factory KPIs.

## 2. Frontend delivery

| File | Responsibility |
| --- | --- |
| `apps/web/app/(app)/compliance/actions/page.tsx` | Server-rendered, role-checked page; reads capped tenant-scoped items, action rows and team members under user JWT |
| `apps/web/components/compliance/ComplianceActionCenter.tsx` | Mobile-first executive counters, queue, create form, inline status/owner/date/notes edits |
| `apps/web/lib/compliance/actions.ts` | Shared action types, access roles and deterministic executive metrics |
| `apps/web/app/(app)/compliance/page.tsx` | Conditional entry point from existing compliance workspace |
| `apps/web/.env.example` | Server-only, default-off feature flag |

Limits in this slice: 250 recent action rows, 150 candidate assessment items and 100 active team members. Add cursor pagination, virtualized search and server-side filtering before large-factory rollout.

## 3. Backend / API contract

All three routes are **Next.js server-side route handlers** using per-request Supabase SSR client and verified JWT claims, not a privileged Supabase service key. The feature flag gates the page **and** APIs.

| Endpoint | Action | Contract |
| --- | --- | --- |
| `GET /api/compliance/actions` | List | Authenticated owner/admin/compliance_manager, tenant-filtered, no-store, at most 250 |
| `POST /api/compliance/actions` | Create | Input: `assessment_item_id`, `priority`, optional `assigned_to`, `due_date`, `notes`. Requirement and assignee resolved server-side inside the caller's tenant; **never** trust client-supplied tenant, title, creator or assessment ID. |
| `PATCH /api/compliance/actions/:actionId` | Edit | Strict allowlist of `status`, `priority`, `assigned_to`, `due_date`, `notes`. On resolution, require non-empty notes; set `resolved_at` server-side. |
 
Expected errors: 401 not signed in; 403 wrong role; 404 disabled/unknown; 409 action already exists; 422 invalid input/assignee/resolution; 503 unavailable datastore. The production API remains independent of the legacy FastAPI service, and all writes go through an RLS-enforcing per-user client. A future iOS app needs a separate authenticated API strategy rather than reuse of browser-only session cookies.

## 4. Database and security

The proposed SQL is in [`docs/sql/compliance-action-center.review.sql`](sql/compliance-action-center.review.sql), **not** an automatically applied migration. It defines `public.compliance_actions` and two supporting composite unique indexes on existing tables so PostgreSQL itself rejects assessment-item and assignee references belonging to other tenants.

Fields: `id`, `tenant_id`, `assessment_id`, `assessment_item_id`, `title`, `priority`, `status`, `assigned_to`, `due_date`, `notes`, `created_by`, `created_at`, `updated_at`, `resolved_at`.

- SELECT, INSERT and limited-column UPDATE grants only to authenticated users.
- RLS for authorized tenant roles combines verified `app_metadata.tenant_id`, a live active `profiles` row, and non-anonymous session checks. No trust in `user_metadata`.
- Write requests cannot modify `tenant_id`, `assessment_id`, `assessment_item_id`, `title` or `created_by` through SQL column permissions.
- Composite foreign keys enforce the item's assessment + tenant and assignee's tenant; unique `(tenant_id,assessment_item_id)` prevents duplicating tasks for one requirement.
- No DELETE grant, no SECURITY DEFINER function and no runtime schema bootstrapping.
- **Known limitation:** no immutable status-event ledger or optimistic concurrency yet. `updated_at` is an operational timestamp, not a tamper-resistant audit trail.

### Controlled staging migration procedure

1. On a workstation with Supabase CLI installed, run `supabase migration new compliance_action_center` from the appropriately linked, isolated staging project. Copy the reviewed SQL into that generated file; do not invent version numbers.
2. Review SQL against the staging schema, run the migration in staging, and inspect security/performance advisors. Do not run on the shared live project while issue #18 remains open.
3. Test two authorized synthetic factory tenants (and owner/admin/compliance_manager, operator, anonymous) with real signed JWTs through both PostgREST and the application API: deny cross-tenant reads/writes/assignee assignments; deny owner/tenant field tampering; confirm duplicate and resolved-note checks.
4. Verify impact of the two new unique indexes on existing shared tables, record backups, query plans, lock durations and rollback. Review with the owner of the shared Supabase project.
5. Enable `FEATURE_COMPLIANCE_ACTIONS=true` in staging only; validate browser flows and production-sized datasets; only then approve a separately reviewed migration/release.

Suggested rollback: disable the flag first; restore the prior deployment. A schema rollback must preserve action data and be reviewed (do **not** blindly drop a populated table). The new indexes must be considered for other consumers before removal.

## 5. Verification and acceptance

Local non-database unit tests in `apps/web/tests/compliance-actions.test.ts` and `apps/web/tests/compliance-action-validation.test.ts` cover:
- role authorization predicate;
- overdue/soon/resolved counters and filtering;
- strict server input validation and rejection of client-specified tenant identity.

CI must run web tests/typecheck/lint/build and secret scan. Passing those checks **does not clear the production gate**. Required integration tests before enabling:
- owner/admin/compliance manager can create and update; operator/anonymous cannot;
- foreign-tenant assessment and profile IDs cannot be linked even via direct Data API;
- closing requires notes; updating status never alters underlying `assessment_items.status`;
- correct 401/403/404/409/422 behavior and no service-role credentials exposed;
- screen reader labels, keyboard navigation, 375px mobile viewport and 1440px executive layout;
- load tests, pagination plan, audit-event strategy, rollback and backup restore.

**Dependencies:** security issue [#18](https://github.com/mnxtr/M_I_OS/issues/18) remains open. Existing compliance PRs [#34](https://github.com/mnxtr/M_I_OS/pull/34) and [#35](https://github.com/mnxtr/M_I_OS/pull/35) overlap in their dashboard redesign: integrate deliberately, not by indiscriminately merging both.

## 6. Later iterations

- **V1.1** append-only action event history (who, change, previous value, timestamp); optimistic concurrency and server pagination.
- **V1.2** reminders for overdue / seven-day-due items; email and executive iOS push only after consent, rate limits and notifications infrastructure.
- **V2** certificate/document expiry intelligence with versioned source references, human verification and buyer-standard applicability, without automatically declaring regulatory compliance.
