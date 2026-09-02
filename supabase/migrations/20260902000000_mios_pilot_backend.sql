-- MIOS shareable pilot backend.
-- All operational rows are scoped to the authenticated user through RLS.

create table if not exists public.mios_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  company_name text not null check (char_length(company_name) between 1 and 160),
  full_name text not null default '' check (char_length(full_name) <= 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mios_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  filename text not null check (char_length(filename) between 1 and 255),
  doc_type text not null default 'document',
  department text not null default '',
  status text not null default 'ready' check (status in ('processing', 'ready', 'failed')),
  page_count integer not null default 0 check (page_count >= 0),
  error text not null default '',
  storage_path text,
  created_at timestamptz not null default now(),
  unique (user_id, filename)
);

create table if not exists public.mios_tables (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sheet_name text not null,
  columns jsonb not null default '[]'::jsonb check (jsonb_typeof(columns) = 'array'),
  row_count integer not null default 0 check (row_count >= 0),
  unique (user_id, name, sheet_name)
);

create table if not exists public.mios_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan jsonb not null,
  period text not null,
  usage jsonb not null,
  limits jsonb not null,
  estimated_minutes_saved integer not null default 0 check (estimated_minutes_saved >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.mios_templates (
  code text primary key,
  name text not null,
  version integer not null default 1 check (version > 0),
  description text not null,
  item_count integer not null check (item_count >= 0),
  items jsonb not null check (jsonb_typeof(items) = 'array')
);

create table if not exists public.mios_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 240),
  template_code text not null references public.mios_templates(code),
  due_date date,
  status text not null default 'draft' check (status in ('draft', 'running', 'partial', 'complete')),
  created_at timestamptz not null default now()
);

create table if not exists public.mios_assessment_items (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.mios_assessments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  ref text not null,
  category text not null,
  title text not null,
  guidance text not null,
  status text not null default 'pending' check (
    status in ('pending', 'compliant', 'partial', 'gap', 'unknown', 'not_applicable')
  ),
  manually_set boolean not null default false,
  ai_notes text not null default '',
  cap_text text not null default '',
  evidence jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence) = 'array'),
  suggested_status text not null default 'unknown' check (
    suggested_status in ('compliant', 'partial', 'gap', 'unknown', 'not_applicable')
  ),
  suggested_notes text not null default '',
  suggested_evidence jsonb not null default '[]'::jsonb check (
    jsonb_typeof(suggested_evidence) = 'array'
  ),
  cap_draft text not null default '',
  unique (assessment_id, ref)
);

create table if not exists public.mios_demo_answers (
  id text primary key,
  keywords text[] not null default '{}',
  answer text not null,
  citations jsonb not null default '[]'::jsonb check (jsonb_typeof(citations) = 'array')
);

create table if not exists public.mios_analytics_answers (
  id text primary key,
  keywords text[] not null default '{}',
  answer text not null,
  sql_text text not null,
  columns jsonb not null check (jsonb_typeof(columns) = 'array'),
  rows jsonb not null check (jsonb_typeof(rows) = 'array')
);

alter table public.mios_profiles enable row level security;
alter table public.mios_documents enable row level security;
alter table public.mios_tables enable row level security;
alter table public.mios_usage enable row level security;
alter table public.mios_templates enable row level security;
alter table public.mios_assessments enable row level security;
alter table public.mios_assessment_items enable row level security;
alter table public.mios_demo_answers enable row level security;
alter table public.mios_analytics_answers enable row level security;

create policy "MIOS profiles are private" on public.mios_profiles
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "MIOS documents are private" on public.mios_documents
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "MIOS tables are private" on public.mios_tables
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "MIOS usage is private" on public.mios_usage
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "MIOS assessments are private" on public.mios_assessments
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "MIOS assessment items are private" on public.mios_assessment_items
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Authenticated users can read MIOS templates" on public.mios_templates
  for select to authenticated using (true);

create policy "Authenticated users can read MIOS demo answers" on public.mios_demo_answers
  for select to authenticated using (true);

create policy "Authenticated users can read MIOS analytics answers" on public.mios_analytics_answers
  for select to authenticated using (true);

grant select, insert, update, delete on public.mios_profiles to authenticated;
grant select, insert, update, delete on public.mios_documents to authenticated;
grant select, insert, update, delete on public.mios_tables to authenticated;
grant select, insert, update, delete on public.mios_usage to authenticated;
grant select on public.mios_templates to authenticated;
grant select, insert, update, delete on public.mios_assessments to authenticated;
grant select, insert, update, delete on public.mios_assessment_items to authenticated;
grant select on public.mios_demo_answers to authenticated;
grant select on public.mios_analytics_answers to authenticated;

insert into public.mios_templates (code, name, version, description, item_count, items)
values
  (
    'SOCIAL-CORE',
    'Social compliance core',
    1,
    'A practical pilot checklist covering worker welfare, safety, records, and corrective action.',
    5,
    '[
      {"ref":"SC-01","category":"Working hours","title":"Working-hour records are complete","guidance":"Verify attendance, overtime approvals, and payroll records agree for the sample period.","suggested_status":"partial","suggested_notes":"Attendance and payroll records are present, but two overtime approvals are missing signatures.","cap_draft":"Assign HR to reconcile unsigned overtime approvals, obtain supervisor sign-off, and sample the next four weekly payroll cycles.","evidence":[{"document_id":"seed-hr-manual","document_name":"HR & Worker Welfare Manual.pdf","page":18,"chunk_index":2,"snippet":"Overtime requires written supervisor approval before payroll close."}]},
      {"ref":"SC-02","category":"Health and safety","title":"Emergency exits remain unobstructed","guidance":"Review inspection logs, maps, drills, and corrective actions for all production floors.","suggested_status":"compliant","suggested_notes":"The latest inspection log and evacuation drill record meet the pilot requirement.","cap_draft":"Maintain monthly exit-route inspections and retain photographs with the signed checklist.","evidence":[{"document_id":"seed-safety-sop","document_name":"Factory Safety SOP.pdf","page":9,"chunk_index":1,"snippet":"Exit routes are inspected monthly and after each floor layout change."}]},
      {"ref":"SC-03","category":"Worker welfare","title":"Grievance channel is accessible","guidance":"Confirm workers can raise concerns confidentially and receive tracked responses.","suggested_status":"compliant","suggested_notes":"The worker handbook documents two confidential reporting routes and escalation timing.","cap_draft":"Continue quarterly awareness refreshers and review closure time as a management KPI.","evidence":[{"document_id":"seed-hr-manual","document_name":"HR & Worker Welfare Manual.pdf","page":31,"chunk_index":3,"snippet":"Workers may report confidentially through the hotline or sealed grievance box."}]},
      {"ref":"SC-04","category":"Chemical safety","title":"Chemical inventory and SDS are current","guidance":"Compare the chemical inventory with floor stock and current safety data sheets.","suggested_status":"gap","suggested_notes":"The inventory lists the cleaning solvent, but the uploaded SDS register does not contain its current sheet.","cap_draft":"EHS should obtain the current SDS, brief affected operators, update the register, and verify floor copies within seven days.","evidence":[{"document_id":"seed-safety-sop","document_name":"Factory Safety SOP.pdf","page":22,"chunk_index":4,"snippet":"Each approved chemical must have a current SDS at the point of use."}]},
      {"ref":"SC-05","category":"Corrective action","title":"Corrective actions have owners and due dates","guidance":"Sample open findings for owner, target date, verification evidence, and closure approval.","suggested_status":"partial","suggested_notes":"Four of five sampled actions have owners and due dates; one maintenance action is missing a verifier.","cap_draft":"Add an independent verifier to the open maintenance action and make verifier assignment mandatory in the CAP log.","evidence":[{"document_id":"seed-cap-log","document_name":"Corrective Action Register.xlsx","page":1,"chunk_index":0,"snippet":"Open action CA-024 lists an owner and due date but no verification assignee."}]}
    ]'::jsonb
  ),
  (
    'QMS-LITE',
    'Quality management essentials',
    1,
    'A concise quality-system readiness check for document control, inspection, and traceability.',
    4,
    '[
      {"ref":"QM-01","category":"Document control","title":"Controlled procedures show current revision","guidance":"Check that floor copies match the approved document register.","suggested_status":"compliant","suggested_notes":"The sampled procedures match the revision register.","cap_draft":"Continue the quarterly controlled-copy sweep.","evidence":[{"document_id":"seed-quality","document_name":"Quality Control Plan.pdf","page":4,"chunk_index":0,"snippet":"Only the document-control copy marked CURRENT may be used on production floors."}]},
      {"ref":"QM-02","category":"Inspection","title":"In-line inspections are recorded","guidance":"Sample in-line inspection records across active lines and shifts.","suggested_status":"partial","suggested_notes":"Line A and B records are complete; one Line C shift record is missing the inspector signature.","cap_draft":"Retrain Line C inspectors and add an end-of-shift completeness check for four weeks.","evidence":[{"document_id":"seed-quality","document_name":"Quality Control Plan.pdf","page":12,"chunk_index":2,"snippet":"The assigned inspector signs every in-line inspection record before shift close."}]},
      {"ref":"QM-03","category":"Traceability","title":"Finished goods trace to production lots","guidance":"Trace a sample from finished carton to production order and material lot.","suggested_status":"compliant","suggested_notes":"The pilot sample traces from carton labels to the production and fabric lots.","cap_draft":"Retain the monthly traceability challenge and record elapsed completion time.","evidence":[{"document_id":"seed-production","document_name":"Production & Line Performance.csv","page":1,"chunk_index":0,"snippet":"Order, line, style, batch, output, and rejection fields are retained per shift."}]},
      {"ref":"QM-04","category":"Nonconformance","title":"Rejected material is segregated","guidance":"Review the rejection area, labels, disposition records, and release authority.","suggested_status":"gap","suggested_notes":"The process is documented, but the latest inspection notes an unlabeled hold bin.","cap_draft":"Label all hold bins, assign daily verification to Quality, and attach photographic closure evidence.","evidence":[{"document_id":"seed-quality","document_name":"Quality Control Plan.pdf","page":16,"chunk_index":3,"snippet":"Rejected material must remain identified and physically segregated until disposition."}]}
    ]'::jsonb
  )
on conflict (code) do update set
  name = excluded.name,
  version = excluded.version,
  description = excluded.description,
  item_count = excluded.item_count,
  items = excluded.items;

insert into public.mios_demo_answers (id, keywords, answer, citations)
values
  (
    'downtime',
    array['downtime', 'stoppage', 'bottleneck', 'line c', 'বন্ধ'],
    'Line C is the strongest operational risk in the pilot data. It accounts for 42% of recorded downtime while contributing 27% of output. The recurring pattern is needle-change and material-wait events concentrated on the evening shift. Start with a two-week countermeasure: pre-stage critical trims, add a 10-minute shift-start machine check, and review the top three stoppages daily with Maintenance and Production.',
    '[{"document_id":"seed-production","document_name":"Production & Line Performance.csv","page":1,"chunk_index":0,"snippet":"Line C recorded 126 downtime minutes and 8,420 units in the pilot period."},{"document_id":"seed-maintenance","document_name":"Preventive Maintenance Schedule.xlsx","page":1,"chunk_index":0,"snippet":"Needle and feed-system checks are scheduled weekly for Line C."}]'::jsonb
  ),
  (
    'audit',
    array['audit', 'compliance', 'social', 'inspection', 'অডিট'],
    'The pilot workspace is broadly ready for a buyer social-compliance pre-check, with two items needing focused follow-up: missing overtime approval signatures and a current SDS for one cleaning solvent. The emergency-exit and worker-grievance evidence is complete. Open the Compliance Copilot to run the seeded assessment and generate owner-ready corrective actions.',
    '[{"document_id":"seed-hr-manual","document_name":"HR & Worker Welfare Manual.pdf","page":18,"chunk_index":2,"snippet":"Overtime requires written supervisor approval before payroll close."},{"document_id":"seed-safety-sop","document_name":"Factory Safety SOP.pdf","page":22,"chunk_index":4,"snippet":"Each approved chemical must have a current SDS at the point of use."}]'::jsonb
  ),
  (
    'default',
    array[]::text[],
    'The seeded MIOS workspace connects operational documents, line-performance data, and compliance evidence. For the clearest pilot result, ask about Line C downtime, audit readiness, rejected quantity, or the next corrective action. I will answer from the private workspace sources and show the evidence used.',
    '[{"document_id":"seed-production","document_name":"Production & Line Performance.csv","page":1,"chunk_index":0,"snippet":"The pilot dataset covers output, rejects, downtime, line, and shift."}]'::jsonb
  )
on conflict (id) do update set
  keywords = excluded.keywords,
  answer = excluded.answer,
  citations = excluded.citations;

insert into public.mios_analytics_answers (id, keywords, answer, sql_text, columns, rows)
values
  (
    'line-performance',
    array['line', 'output', 'downtime', 'bottleneck', 'reject', 'performance'],
    'Line C is the priority: it has the lowest attainment (84.2%), the highest downtime (126 minutes), and the highest rejection rate (3.1%). Line A is the benchmark at 96.4% attainment.',
    'SELECT line, output_units, target_units, attainment_pct, reject_rate_pct, downtime_minutes FROM line_performance ORDER BY attainment_pct ASC;',
    '["line","output_units","target_units","attainment_pct","reject_rate_pct","downtime_minutes"]'::jsonb,
    '[{"line":"Line C","output_units":8420,"target_units":10000,"attainment_pct":84.2,"reject_rate_pct":3.1,"downtime_minutes":126},{"line":"Line B","output_units":9180,"target_units":10000,"attainment_pct":91.8,"reject_rate_pct":2.0,"downtime_minutes":74},{"line":"Line A","output_units":9640,"target_units":10000,"attainment_pct":96.4,"reject_rate_pct":1.2,"downtime_minutes":38}]'::jsonb
  ),
  (
    'shift-performance',
    array['shift', 'evening', 'morning'],
    'The evening shift trails the morning shift by 8.7 percentage points in attainment and records nearly twice the downtime. Line C evening shift is the first drill-down target.',
    'SELECT shift, attainment_pct, reject_rate_pct, downtime_minutes FROM shift_performance ORDER BY attainment_pct ASC;',
    '["shift","attainment_pct","reject_rate_pct","downtime_minutes"]'::jsonb,
    '[{"shift":"Evening","attainment_pct":84.9,"reject_rate_pct":2.8,"downtime_minutes":153},{"shift":"Morning","attainment_pct":93.6,"reject_rate_pct":1.5,"downtime_minutes":85}]'::jsonb
  ),
  (
    'default',
    array[]::text[],
    'The pilot dataset contains line, shift, output, rejection, and downtime measures. This summary ranks the production lines by attainment so the largest opportunity appears first.',
    'SELECT line, output_units, target_units, attainment_pct FROM line_performance ORDER BY attainment_pct ASC;',
    '["line","output_units","target_units","attainment_pct"]'::jsonb,
    '[{"line":"Line C","output_units":8420,"target_units":10000,"attainment_pct":84.2},{"line":"Line B","output_units":9180,"target_units":10000,"attainment_pct":91.8},{"line":"Line A","output_units":9640,"target_units":10000,"attainment_pct":96.4}]'::jsonb
  )
on conflict (id) do update set
  keywords = excluded.keywords,
  answer = excluded.answer,
  sql_text = excluded.sql_text,
  columns = excluded.columns,
  rows = excluded.rows;

create or replace function public.provision_mios_pilot()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  default_assessment_id uuid;
  template_item jsonb;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  insert into public.mios_profiles (user_id, company_name, full_name)
  values (
    current_user_id,
    coalesce(nullif(auth.jwt() -> 'user_metadata' ->> 'company_name', ''), 'Demo Factory Ltd.'),
    coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name', '')
  )
  on conflict (user_id) do update set
    company_name = excluded.company_name,
    full_name = excluded.full_name,
    updated_at = now();

  insert into public.mios_documents
    (user_id, filename, doc_type, department, status, page_count, created_at)
  values
    (current_user_id, 'Factory Safety SOP.pdf', 'pdf', 'EHS', 'ready', 34, now() - interval '5 days'),
    (current_user_id, 'HR & Worker Welfare Manual.pdf', 'pdf', 'HR', 'ready', 47, now() - interval '4 days'),
    (current_user_id, 'Production & Line Performance.csv', 'csv', 'Production', 'ready', 1, now() - interval '2 days'),
    (current_user_id, 'Preventive Maintenance Schedule.xlsx', 'xlsx', 'Maintenance', 'ready', 3, now() - interval '1 day'),
    (current_user_id, 'Quality Control Plan.pdf', 'pdf', 'Quality', 'ready', 24, now() - interval '12 hours'),
    (current_user_id, 'Corrective Action Register.xlsx', 'xlsx', 'Compliance', 'ready', 2, now() - interval '6 hours')
  on conflict (user_id, filename) do nothing;

  insert into public.mios_tables (user_id, name, sheet_name, columns, row_count)
  values
    (current_user_id, 'Line performance', 'line_performance', '[{"name":"line","type":"text"},{"name":"output_units","type":"number"},{"name":"target_units","type":"number"},{"name":"attainment_pct","type":"number"},{"name":"reject_rate_pct","type":"number"},{"name":"downtime_minutes","type":"number"}]'::jsonb, 96),
    (current_user_id, 'Shift performance', 'shift_performance', '[{"name":"shift","type":"text"},{"name":"attainment_pct","type":"number"},{"name":"reject_rate_pct","type":"number"},{"name":"downtime_minutes","type":"number"}]'::jsonb, 32)
  on conflict (user_id, name, sheet_name) do nothing;

  insert into public.mios_usage (user_id, plan, period, usage, limits, estimated_minutes_saved)
  values (
    current_user_id,
    '{"code":"pilot","name":"Pilot","price_usd":0}'::jsonb,
    to_char(current_date, 'YYYY-MM'),
    '{"chat_queries":12,"analytics_queries":7,"pages_ingested":111}'::jsonb,
    '{"chat_queries":200,"analytics_queries":50,"pages_ingested":500}'::jsonb,
    92
  )
  on conflict (user_id) do nothing;

  select id into default_assessment_id
  from public.mios_assessments
  where user_id = current_user_id and title = 'Buyer audit readiness · September'
  limit 1;

  if default_assessment_id is null then
    insert into public.mios_assessments
      (user_id, title, template_code, due_date, status, created_at)
    values
      (current_user_id, 'Buyer audit readiness · September', 'SOCIAL-CORE', current_date + 21, 'draft', now() - interval '3 hours')
    returning id into default_assessment_id;

    for template_item in
      select value from jsonb_array_elements(
        (select items from public.mios_templates where code = 'SOCIAL-CORE')
      )
    loop
      insert into public.mios_assessment_items (
        assessment_id, user_id, ref, category, title, guidance,
        suggested_status, suggested_notes, suggested_evidence, cap_draft
      ) values (
        default_assessment_id,
        current_user_id,
        template_item ->> 'ref',
        template_item ->> 'category',
        template_item ->> 'title',
        template_item ->> 'guidance',
        template_item ->> 'suggested_status',
        template_item ->> 'suggested_notes',
        coalesce(template_item -> 'evidence', '[]'::jsonb),
        template_item ->> 'cap_draft'
      );
    end loop;
  end if;
end;
$$;

create or replace function public.create_mios_assessment(
  requested_template_code text,
  requested_title text,
  requested_due_date date default null
)
returns public.mios_assessments
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  created_assessment public.mios_assessments;
  template_item jsonb;
  template_items jsonb;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if char_length(trim(requested_title)) = 0 then
    raise exception 'Assessment title is required' using errcode = '22023';
  end if;

  select items into template_items
  from public.mios_templates
  where code = requested_template_code;
  if template_items is null then
    raise exception 'Unknown template' using errcode = '22023';
  end if;

  insert into public.mios_assessments (user_id, title, template_code, due_date)
  values (current_user_id, trim(requested_title), requested_template_code, requested_due_date)
  returning * into created_assessment;

  for template_item in select value from jsonb_array_elements(template_items)
  loop
    insert into public.mios_assessment_items (
      assessment_id, user_id, ref, category, title, guidance,
      suggested_status, suggested_notes, suggested_evidence, cap_draft
    ) values (
      created_assessment.id,
      current_user_id,
      template_item ->> 'ref',
      template_item ->> 'category',
      template_item ->> 'title',
      template_item ->> 'guidance',
      template_item ->> 'suggested_status',
      template_item ->> 'suggested_notes',
      coalesce(template_item -> 'evidence', '[]'::jsonb),
      template_item ->> 'cap_draft'
    );
  end loop;

  return created_assessment;
end;
$$;

create or replace function public.auto_assess_mios(requested_assessment_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.mios_assessments
    where id = requested_assessment_id and user_id = current_user_id
  ) then
    raise exception 'Assessment not found' using errcode = 'P0002';
  end if;

  update public.mios_assessments
  set status = 'running'
  where id = requested_assessment_id and user_id = current_user_id;

  update public.mios_assessment_items
  set
    status = suggested_status,
    ai_notes = suggested_notes,
    evidence = suggested_evidence
  where assessment_id = requested_assessment_id
    and user_id = current_user_id
    and manually_set is false;

  update public.mios_assessments
  set status = 'complete'
  where id = requested_assessment_id and user_id = current_user_id;
end;
$$;

create or replace function public.increment_mios_usage(metric text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  current_value integer;
  minutes_delta integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if metric not in ('chat_queries', 'analytics_queries') then
    raise exception 'Unsupported usage metric' using errcode = '22023';
  end if;

  perform public.provision_mios_pilot();
  select coalesce((usage ->> metric)::integer, 0) into current_value
  from public.mios_usage where user_id = current_user_id;
  minutes_delta := case when metric = 'chat_queries' then 3 else 8 end;

  update public.mios_usage
  set
    usage = jsonb_set(usage, array[metric], to_jsonb(current_value + 1), true),
    estimated_minutes_saved = estimated_minutes_saved + minutes_delta,
    updated_at = now()
  where user_id = current_user_id;
end;
$$;

revoke all on function public.provision_mios_pilot() from public;
revoke all on function public.create_mios_assessment(text, text, date) from public;
revoke all on function public.auto_assess_mios(uuid) from public;
revoke all on function public.increment_mios_usage(text) from public;
grant execute on function public.provision_mios_pilot() to authenticated;
grant execute on function public.create_mios_assessment(text, text, date) to authenticated;
grant execute on function public.auto_assess_mios(uuid) to authenticated;
grant execute on function public.increment_mios_usage(text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'mios-pilot-documents',
  'mios-pilot-documents',
  false,
  15728640,
  array[
    'application/pdf',
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "MIOS users can upload own documents" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'mios-pilot-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "MIOS users can read own documents" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'mios-pilot-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "MIOS users can delete own documents" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'mios-pilot-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
