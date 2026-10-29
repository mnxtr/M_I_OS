import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireClaims } from "@/lib/supabase/claims";
import { createClient } from "@/lib/supabase/server";
import {
  canManageComplianceActions,
  type ComplianceAction,
  type ActionCandidate,
  type ActionOwner,
} from "@/lib/compliance/actions";
import { ComplianceActionCenter } from "@/components/compliance/ComplianceActionCenter";

export const metadata: Metadata = { title: "Compliance Action Center" };
export const dynamic = "force-dynamic";

export default async function ComplianceActionsPage() {
  if (process.env.FEATURE_COMPLIANCE_ACTIONS !== "true") notFound();
  const claims = await requireClaims();
  if (!canManageComplianceActions(claims.role)) notFound();

  const supabase = await createClient();
  const [actions, candidates, owners] = await Promise.all([
    supabase.from("compliance_actions")
      .select("id,tenant_id,assessment_id,assessment_item_id,title,priority,status,assigned_to,due_date,notes,created_by,created_at,updated_at,resolved_at")
      .eq("tenant_id", claims.tenantId).order("created_at", { ascending: false }).limit(250),
    supabase.from("assessment_items").select("id,ref,title,assessment_id,status")
      .eq("tenant_id", claims.tenantId).in("status", ["pending", "unknown", "partial", "gap"])
      .order("updated_at", { ascending: false }).limit(150),
    supabase.from("profiles").select("id,full_name,email")
      .eq("tenant_id", claims.tenantId).eq("is_active", true).order("full_name").limit(100),
  ]);

  const error = actions.error || candidates.error || owners.error
    ? "Could not load the action register. Confirm that the staging migration is applied and the account has access."
    : "";
  return (
    <ComplianceActionCenter
      initialActions={(actions.data ?? []) as ComplianceAction[]}
      candidates={(candidates.data ?? []) as ActionCandidate[]}
      owners={(owners.data ?? []) as ActionOwner[]}
      initialError={error}
    />
  );
}
