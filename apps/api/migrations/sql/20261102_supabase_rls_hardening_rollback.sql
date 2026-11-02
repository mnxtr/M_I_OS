-- Rollback for 20261102_supabase_rls_hardening.sql
-- Restore function EXECUTE grants from the ACL snapshot captured before apply.
begin;

alter table if exists public.documents no force row level security;
alter table if exists public.chunks no force row level security;
alter table if exists public.table_sources no force row level security;
alter table if exists public.table_rows no force row level security;
alter table if exists public.assessments no force row level security;
alter table if exists public.assessment_items no force row level security;
alter table if exists public.guest_tokens no force row level security;
alter table if exists public.monthly_usage no force row level security;
alter table if exists public.payments no force row level security;
alter table if exists public.profiles no force row level security;
alter table if exists public.organization_members no force row level security;

commit;
