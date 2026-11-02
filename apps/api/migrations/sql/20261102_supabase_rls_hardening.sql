-- Issue #18 hardening patch (DO NOT APPLY without shared-project review).
-- Scope intentionally limited to MIOS tenant tables and MIOS-auth functions.
-- Before apply, snapshot function ACLs for rollback:
-- select proname, pg_get_function_identity_arguments(p.oid) as args, proacl
-- from pg_proc p join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public' and proname in ('handle_new_user', 'custom_access_token_hook');
begin;

alter table if exists public.documents force row level security;
alter table if exists public.chunks force row level security;
alter table if exists public.table_sources force row level security;
alter table if exists public.table_rows force row level security;
alter table if exists public.assessments force row level security;
alter table if exists public.assessment_items force row level security;
alter table if exists public.guest_tokens force row level security;
alter table if exists public.monthly_usage force row level security;
alter table if exists public.payments force row level security;
alter table if exists public.profiles force row level security;
alter table if exists public.organization_members force row level security;

-- Internal trigger/helper functions must not be directly callable by anonymous users.
revoke execute on function public.handle_new_user() from anon, authenticated, public;
revoke execute on function public.custom_access_token_hook(jsonb) from anon, authenticated, public;

commit;
