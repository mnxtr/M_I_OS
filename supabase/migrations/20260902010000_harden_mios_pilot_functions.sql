-- The pilot RPCs only touch caller-owned rows protected by RLS, so invoker
-- security is sufficient and avoids exposing elevated database privileges.

alter function public.provision_mios_pilot() security invoker;
alter function public.create_mios_assessment(text, text, date) security invoker;
alter function public.auto_assess_mios(uuid) security invoker;
alter function public.increment_mios_usage(text) security invoker;

revoke execute on function public.provision_mios_pilot() from anon;
revoke execute on function public.create_mios_assessment(text, text, date) from anon;
revoke execute on function public.auto_assess_mios(uuid) from anon;
revoke execute on function public.increment_mios_usage(text) from anon;

create index if not exists mios_documents_user_created_idx
  on public.mios_documents (user_id, created_at desc);
create index if not exists mios_tables_user_idx
  on public.mios_tables (user_id);
create index if not exists mios_assessments_user_created_idx
  on public.mios_assessments (user_id, created_at desc);
create index if not exists mios_assessment_items_user_idx
  on public.mios_assessment_items (user_id);
