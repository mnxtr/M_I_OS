-- Prevent anonymous Supabase sessions from reaching the MIOS pilot. Email or
-- another permanent identity must be attached before any pilot data is used.

alter policy "MIOS profiles are private" on public.mios_profiles
  using (
    (select auth.uid()) = user_id
    and (select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)) is false
  )
  with check (
    (select auth.uid()) = user_id
    and (select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)) is false
  );

alter policy "MIOS documents are private" on public.mios_documents
  using (
    (select auth.uid()) = user_id
    and (select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)) is false
  )
  with check (
    (select auth.uid()) = user_id
    and (select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)) is false
  );

alter policy "MIOS tables are private" on public.mios_tables
  using (
    (select auth.uid()) = user_id
    and (select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)) is false
  )
  with check (
    (select auth.uid()) = user_id
    and (select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)) is false
  );

alter policy "MIOS usage is private" on public.mios_usage
  using (
    (select auth.uid()) = user_id
    and (select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)) is false
  )
  with check (
    (select auth.uid()) = user_id
    and (select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)) is false
  );

alter policy "MIOS assessments are private" on public.mios_assessments
  using (
    (select auth.uid()) = user_id
    and (select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)) is false
  )
  with check (
    (select auth.uid()) = user_id
    and (select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)) is false
  );

alter policy "MIOS assessment items are private" on public.mios_assessment_items
  using (
    (select auth.uid()) = user_id
    and (select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)) is false
  )
  with check (
    (select auth.uid()) = user_id
    and (select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)) is false
  );

alter policy "Authenticated users can read MIOS templates" on public.mios_templates
  using ((select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)) is false);

alter policy "Authenticated users can read MIOS demo answers" on public.mios_demo_answers
  using ((select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)) is false);

alter policy "Authenticated users can read MIOS analytics answers" on public.mios_analytics_answers
  using ((select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)) is false);

alter policy "MIOS users can upload own documents" on storage.objects
  with check (
    bucket_id = 'mios-pilot-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)) is false
  );

alter policy "MIOS users can read own documents" on storage.objects
  using (
    bucket_id = 'mios-pilot-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)) is false
  );

alter policy "MIOS users can delete own documents" on storage.objects
  using (
    bucket_id = 'mios-pilot-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)) is false
  );

create index if not exists mios_assessments_template_code_idx
  on public.mios_assessments (template_code);
