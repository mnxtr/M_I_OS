# Phase 1 — Security and Architecture Gate (October 2026)

Status: **IN PROGRESS — NOT CLEARED FOR CONFIDENTIAL CUSTOMER DATA**

Scope: MIOS repository `mnxtr/M_I_OS`, shared Supabase project. This is a read-only
review and regression-test milestone, not an authorization to modify the live database.

## Verified live observations (2026-10-26)

- RLS is enabled, but **FORCE ROW LEVEL SECURITY is false** on the inspected
  `public` tables: `profiles`, `factories`, `documents`, `chunks`,
  `table_sources`, `table_rows`, `assessments`, `assessment_items`,
  `guest_tokens`, `monthly_usage`, and `payments`.
  This does not alone demonstrate cross-tenant exposure; table owners and roles
  with BYPASSRLS require separate assessment.
- `public.handle_new_user` and `public.rls_auto_enable` are SECURITY DEFINER
  functions not executable by `anon` or `authenticated`.
- Seven SECURITY DEFINER functions remain executable by `authenticated`:
  `onboard_factory`, `create_cricket_match`, `create_team_with_players`,
  `record_delivery`, `start_match`, `start_second_innings`,
  `undo_last_delivery`. Six belong to a separate cricket application in
  the shared database. **Do not revoke or rewrite them without that owner's review.**
- The Supabase security advisor also flags `vector` installed in `public`.
  Moving an extension in a shared database requires dependency assessment.
- No live cross-tenant user-JWT tests were performed. Findings are *review signals*,
  **not proof of exploitability**.

## Repository changes in this milestone

- Reject malformed verified Supabase `app_metadata` with HTTP 401 rather than
  allowing an uncaught attribute error to cause HTTP 500.
- Add regression tests ensuring editable `user_metadata` cannot override the
  server-resolved tenant or role; mismatched app metadata, missing/inactive
  profiles, and invalid subjects fail closed.
- Keep live database, policies, function grants, secrets, and production
  deployment unchanged.

## Required checks before Phase 1 sign-off

1. Inventory the actual PostgreSQL identities used by the deployed Next.js
   server, FastAPI service, worker and privileged maintenance tasks; confirm
   which have `BYPASSRLS` or table ownership and which use the Supabase Data API.
2. With **two authorized test accounts in two isolated test tenants**, use
   signed-in JWTs to verify read/write/delete denial across `documents`,
   `chunks`, `factories`, `profiles`, `assessments` and Storage objects.
   Verify the same through each app endpoint and the Data API; test expired
   tokens and altered tenant IDs. Use synthetic records only.
3. Inspect definitions, `search_path`, ownership, role grants, and caller
   checks for `onboard_factory` and the six cricket functions; coordinate with
   the other application's owner. Test in staging before any grant changes.
4. Confirm RLS policies and any SECURITY DEFINER or service-role paths are
   tenant-scoped. Evaluate `FORCE ROW LEVEL SECURITY` per table against
   privileged migrations and other consumers before adopting it.
5. Document backup/restore, database and storage recovery, incident contacts,
   and least-privilege secret rotation. Verify in staging.
6. Run GitHub CI, lint, unit tests and signed-JWT integration tests; record
   evidence and review/approve a separate production change with rollback.

## Rollback and change control

- This PR changes only FastAPI auth handling and tests. Rollback: revert the PR.
- No live SQL changes were made. Any future schema/grant change needs an
  independently reviewed migration, backup, staging rehearsal, explicit
  rollback plan and coordination for the shared Supabase project.
- A green CI run does **not** establish production tenant isolation.

References:
- https://github.com/mnxtr/M_I_OS/issues/18
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
