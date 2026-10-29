-- PROPOSED SCHEMA ONLY — DO NOT RUN AGAINST SHARED PRODUCTION SUPABASE.
-- Convert this reviewed SQL into a dated Supabase migration using the CLI.
-- Exercise against an isolated staging clone with two synthetic tenants first.
-- The action status is REMEDIATION progress, NOT certified compliance.
BEGIN;

-- Composite uniqueness lets PostgreSQL reject foreign keys that belong to
-- another tenant without trusting the application layer.
CREATE UNIQUE INDEX IF NOT EXISTS mios_assessment_items_identity_tenant_assessment_uidx
  ON public.assessment_items (id, tenant_id, assessment_id);
CREATE UNIQUE INDEX IF NOT EXISTS mios_profiles_identity_tenant_uidx
  ON public.profiles (id, tenant_id);

CREATE TABLE IF NOT EXISTS public.compliance_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  assessment_id uuid NOT NULL,
  assessment_item_id uuid NOT NULL,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 300),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','blocked','resolved')),
  assigned_to uuid,
  due_date date,
  notes text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 4000),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  CONSTRAINT mios_compliance_actions_one_per_requirement UNIQUE (tenant_id, assessment_item_id),
  CONSTRAINT mios_compliance_action_item_tenant_fk FOREIGN KEY (assessment_item_id,tenant_id,assessment_id)
    REFERENCES public.assessment_items(id,tenant_id,assessment_id) ON DELETE CASCADE,
  CONSTRAINT mios_compliance_action_assignee_tenant_fk FOREIGN KEY (assigned_to,tenant_id)
    REFERENCES public.profiles(id,tenant_id),
  CONSTRAINT mios_compliance_action_resolution_consistency CHECK (
    (status = 'resolved' AND resolved_at IS NOT NULL AND char_length(btrim(notes)) > 0)
    OR (status <> 'resolved' AND resolved_at IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS mios_compliance_actions_tenant_status_due_idx
  ON public.compliance_actions (tenant_id, status, due_date);
CREATE INDEX IF NOT EXISTS mios_compliance_actions_assignee_idx
  ON public.compliance_actions (tenant_id, assigned_to) WHERE assigned_to IS NOT NULL;

ALTER TABLE public.compliance_actions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.compliance_actions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.compliance_actions TO authenticated;
GRANT UPDATE (priority, status, assigned_to, due_date, notes, updated_at, resolved_at)
  ON public.compliance_actions TO authenticated;
-- No DELETE grant: preserve completed work and require audited admin cleanup.

CREATE POLICY mios_action_read ON public.compliance_actions FOR SELECT TO authenticated USING (
  tenant_id = NULLIF((SELECT auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid
  AND COALESCE(((SELECT auth.jwt() ->> 'is_anonymous'))::boolean,false) IS FALSE
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.tenant_id = compliance_actions.tenant_id
      AND p.is_active
      AND p.role::text IN ('owner','admin','compliance_manager')
      AND p.role::text = (SELECT auth.jwt() -> 'app_metadata' ->> 'mios_role')
  )
);

CREATE POLICY mios_action_create ON public.compliance_actions FOR INSERT TO authenticated WITH CHECK (
  created_by = (SELECT auth.uid())
  AND tenant_id = NULLIF((SELECT auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid
  AND COALESCE(((SELECT auth.jwt() ->> 'is_anonymous'))::boolean,false) IS FALSE
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.tenant_id = compliance_actions.tenant_id
      AND p.is_active AND p.role::text IN ('owner','admin','compliance_manager')
      AND p.role::text = (SELECT auth.jwt() -> 'app_metadata' ->> 'mios_role')
  )
);

CREATE POLICY mios_action_update ON public.compliance_actions FOR UPDATE TO authenticated USING (
  tenant_id = NULLIF((SELECT auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid
  AND COALESCE(((SELECT auth.jwt() ->> 'is_anonymous'))::boolean,false) IS FALSE
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.tenant_id = compliance_actions.tenant_id
      AND p.is_active AND p.role::text IN ('owner','admin','compliance_manager')
      AND p.role::text = (SELECT auth.jwt() -> 'app_metadata' ->> 'mios_role')
  )
) WITH CHECK (
  tenant_id = NULLIF((SELECT auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid
  AND COALESCE(((SELECT auth.jwt() ->> 'is_anonymous'))::boolean,false) IS FALSE
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.tenant_id = compliance_actions.tenant_id
      AND p.is_active AND p.role::text IN ('owner','admin','compliance_manager')
      AND p.role::text = (SELECT auth.jwt() -> 'app_metadata' ->> 'mios_role')
  )
);

COMMIT;
