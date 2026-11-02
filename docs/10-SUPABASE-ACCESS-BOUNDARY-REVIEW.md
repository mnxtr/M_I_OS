# 10 — Supabase access-boundary review (Issue #18)

**Scope:** shared Supabase project `dkxgpdhzklgojrxwzndu`, MIOS tables/functions only.  
**Rule:** no live schema changes until shared-project impact is reviewed.

## PostgreSQL role inventory (API + worker + user-facing paths)

| Runtime path | Credential/role | RLS expectation |
|---|---|---|
| Browser/RSC/server actions (`createClient`) | Supabase JWT (`authenticated`) | Tenant isolation from JWT claim (`app_metadata.tenant_id`) |
| Next.js server-only admin helpers (`createAdminClient`) | `SUPABASE_SECRET_KEY` (`service_role`) | Bypasses RLS; every query must self-scope by verified tenant claims |
| FastAPI request path (`DATABASE_URL`) | dedicated login role (expected `mios_api`) | Must not have `BYPASSRLS`; API sets `app.tenant_id` per request |
| Background worker (`process_document`) | same `DATABASE_URL` role as API | Must set `app.tenant_id` before tenant-table reads/writes |

## Read-only verification checklist

1. **Role privileges and bypass flags**
```sql
select rolname, rolcanlogin, rolbypassrls
from pg_roles
where rolname in ('anon','authenticated','service_role','mios_api')
order by rolname;
```

2. **RLS + FORCE RLS on MIOS tables**
```sql
select n.nspname as schema_name,
       c.relname as table_name,
       c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as force_rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'documents','chunks','table_sources','table_rows','assessments','assessment_items',
    'guest_tokens','monthly_usage','payments','profiles','organization_members'
  )
order by c.relname;
```

3. **Security-definer functions callable by public/anon/authenticated**
```sql
select n.nspname as schema_name,
       p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as args,
       pg_get_userbyid(p.proowner) as owner_name,
       p.prosecdef as security_definer,
       p.proconfig as function_gucs,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute,
       has_function_privilege('public', p.oid, 'EXECUTE') as public_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef
order by p.proname;
```

4. **Direct RPC grants exposed to users**
```sql
select p.proname,
       pg_get_function_identity_arguments(p.oid) as args,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and (has_function_privilege('anon', p.oid, 'EXECUTE')
       or has_function_privilege('authenticated', p.oid, 'EXECUTE'))
order by p.proname;
```

5. **Cross-tenant isolation with valid non-owner JWTs** (no service role)
```bash
# Tenant-A non-owner token attempting Tenant-B reads must return [] / 0 rows.
curl "$SUPABASE_URL/rest/v1/documents?select=id,tenant_id&tenant_id=eq.$TENANT_B" \
  -H "apikey: $SUPABASE_PUBLISHABLE_KEY" \
  -H "Authorization: ******"
```
Repeat for `chunks`, `table_sources`, `table_rows`, `assessments`, `assessment_items`, `guest_tokens`, `monthly_usage`, `payments` and storage object paths.

## Version-controlled hardening plan (after review)

- Candidate patch: `/home/runner/work/M_I_OS/M_I_OS/apps/api/migrations/sql/20261102_supabase_rls_hardening.sql`
- Rollback: `/home/runner/work/M_I_OS/M_I_OS/apps/api/migrations/sql/20261102_supabase_rls_hardening_rollback.sql`
- Capture `proacl` for affected functions before apply; rollback restores table FORCE-RLS flags and replays grants from that snapshot.

The patch is intentionally scoped to MIOS tables and MIOS auth helper functions only, to avoid changing unrelated application objects in the shared project.
