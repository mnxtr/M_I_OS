# Production draft persistence: implementation and activation

This milestone implements one private saved production workbench draft per user and workspace.
It preserves the existing analysis API and frontend input flow. A saved draft is not an approved
production record, a facility registration, an activity audit log or a shared shift submission.

## User flow

1. Open Overview. The UI checks for the user's saved draft through the authenticated API.
2. If one exists, review its revision, timestamp and records. Choose **Restore saved draft** to
   replace the current local input, or **Use my local draft instead** to keep entered work.
3. Add hourly records to the draft and press **Save draft**. Partially typed fields that have not
   been added as an interval are not saved. Saving is explicit, not an automatic background job.
4. The UI reports saved only after server acknowledgement. Edits made while a save is in flight
   remain dirty and need another save. A refresh can restore the last acknowledged version.
5. If another tab saved a newer revision, the server returns conflict. Local input remains intact.
   Review the latest server version and choose which draft to continue with; there is no silent
   merge or overwrite. Keeping local work requires another explicit Save to replace the server.

If the storage endpoint is unavailable or disabled, analysis still works with local inputs and
the UI explains that server saving is unavailable. No offline cache of factory data is created.
The new component sits outside the analysis form so saving cannot accidentally submit analysis.

## API contract

`GET /v1/operations/draft` returns `null` when no draft exists for the authenticated user/tenant,
otherwise `{revision, payload, updated_at}`. It never accepts a client-provided owner ID.

`POST /v1/operations/draft` accepts:

```json
{
  "expected_revision": 0,
  "payload": {
    "interval_minutes": 60,
    "observations": [
      {"line":"Line 01","start":"2026-09-01T09:00:00+06:00","target":100,"actual":null}
    ]
  }
}
```

Revision 0 creates a new draft; updates require the last observed positive revision. Empty
observation arrays are allowed for drafts so the user can save a cleared draft. Analysis still
requires at least one observation. The existing 500-record, count, aware-timestamp and overlap
constraints apply. Unknown actuals remain null; zero remains a known zero.

| Result | Behavior |
|---|---|
| 200 | Transaction committed; response contains the next revision and saved payload |
| 401/403 | Identity or membership rejected; local input retained |
| 409 | Duplicate create or stale/missing update revision; no overwrite |
| 422 | Payload invalid; correct input before retrying |
| 503 | Feature disabled or storage unavailable; no successful-save claim |

Database connectivity failures may surface as a generic server error under the existing API
error handler. The UI handles all non-success responses without discarding input. Requests have
a 15-second client timeout. If a response is lost after a successful commit, reconnect/review
the saved revision before retrying; this avoids assuming the save failed.

## Storage and isolation

`production_drafts` has a composite primary key `(tenant_id, user_id)`, integer revision,
JSONB payload and timezone-aware update time. A single conditional SQL UPDATE checks ownership
and revision together; a unique primary key rejects simultaneous first creates. FastAPI commits
before returning success. Both read and write queries contain explicit tenant and user filters.

The migration enables and forces RLS with both USING and WITH CHECK predicates requiring
transaction-local `app.tenant_id` and `app.user_id`. Authentication already sets the tenant;
the draft route sets the user from the verified principal. Missing context denies access.
Client `anon`, `authenticated` and PUBLIC grants are revoked on this table. Browser requests go
through FastAPI, not directly through the Supabase Data API. No SECURITY DEFINER function or
service-role client was added.

The API runtime must use a restricted database role without superuser or BYPASSRLS privileges.
Database administrators and privileged Supabase roles remain trusted operators. Existing
Supabase profile/tenant identity reconciliation is still a separate deployment dependency.

No foreign key to the legacy `users` table was added because the connected project uses
`profiles`; user/tenant identity is established by the existing authentication adapter. Define
retention and administrative cleanup for deleted accounts before customer rollout. The draft
table is excluded from development bootstrap so bootstrap cannot create it without its migration
policies and grants.

## Deployment activation

The feature flag defaults to `PRODUCTION_DRAFTS_ENABLED=false`. No cloud migration or runtime
role grant was applied in this task. Keep it off until these steps are verified:

1. Back up and reconcile the target schema and restricted API runtime role. The existing
   `0001_baseline` is intentionally a no-op and does not create the application's base tables.
   This migration is additive; it is not a complete fresh-database installer.
2. Install the migration tools using `pip install -e '.[migrations]'` from `apps/api`.
3. Inspect `alembic current` and the target schema. If the existing application schema has no
   Alembic history, verify it matches the baseline before explicitly stamping `0001_baseline`.
   Do not stamp head: that would skip the draft migration.
4. Run `alembic upgrade head` using migration credentials. Give the known API runtime role only
   SELECT, INSERT and UPDATE on `production_drafts`. Do not grant browser roles access.
5. With the actual runtime role, test owner read/create/update; another user in the same tenant;
   another tenant; missing contexts; stale revision; and changed owner/tenant fields. Verify
   unauthenticated browser roles cannot access the table. Check Supabase security advisors.
6. Set `PRODUCTION_DRAFTS_ENABLED=true` and restart the API. Verify save → refresh → restore
   through the real frontend, then run a two-tab conflict test.

Rollback: disable the flag first. Prefer retaining saved data while reverting the application.
The migration downgrade drops the table and destroys drafts; export/approve that loss before
using it. No automatic migration or destructive rollback runs at application startup.

## Code map and validation

| File | Responsibility |
|---|---|
| `app/models.py` | Storage model with generic JSON for SQLite tests and JSONB on Postgres |
| `app/routers/production_drafts.py` | Authenticated ownership, validation, compare-and-update and commit |
| `migrations/versions/0002_production_drafts.py` | Table, revision constraint, forced RLS and grant revocation |
| `src/lib/productionDrafts.ts` | Bearer-authenticated load/save requests and error mapping |
| `src/components/ProductionDraftSync.tsx` | Save/restore/review/conflict state and edit preservation |
| `src/components/OperationsDashboard.tsx` | Binds persisted draft input to the existing workbench |

Recorded verification: 121 backend tests passed, one existing DSN-gated test skipped; 22 frontend
tests passed; TypeScript/Vite build passed. SQLite HTTP tests exercise persisted round trips,
same-tenant different-user isolation, cross-tenant isolation, duplicate creation, stale updates,
unknown versus zero, empty drafts, validation and feature gating. Component tests cover remount
recovery, no silent replacement, edits during saves, conflict resolution and unavailable storage.
Alembic successfully generated the PostgreSQL upgrade SQL; CI now checks that generation too.

These checks do not prove PostgreSQL RLS behavior, a live Supabase deployment, actual browser
refresh behavior or a successful Vercel release. The runtime-role and live-preview checks above
remain required. The Supabase changelog index could not be fetched in this session; current
[RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security) was
reviewed, including the separate roles of grants and row policies.
