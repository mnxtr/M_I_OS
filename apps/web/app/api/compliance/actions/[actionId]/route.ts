import { NextResponse, type NextRequest } from "next/server";
import { getClaims } from "@/lib/supabase/claims";
import { createClient } from "@/lib/supabase/server";
import { canManageComplianceActions } from "@/lib/compliance/actions";
import { updateActionSchema } from "@/lib/compliance/action-validation";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ actionId: string }> }) {
  if (process.env.FEATURE_COMPLIANCE_ACTIONS !== "true")
    return NextResponse.json({ detail: "Feature unavailable" }, { status: 404 });
  const claims = await getClaims();
  if (!claims) return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  if (!canManageComplianceActions(claims.role))
    return NextResponse.json({ detail: "Not authorized" }, { status: 403 });

  const { actionId } = await params;
  const body: unknown = await request.json().catch(() => null);
  const parsed = updateActionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ detail: "Invalid action fields" }, { status: 422 });

  const supabase = await createClient();
  const { data: existing, error: lookupError } = await supabase.from("compliance_actions")
    .select("id,status,notes,resolved_at")
    .eq("id", actionId).eq("tenant_id", claims.tenantId).maybeSingle();
  if (lookupError) return NextResponse.json({ detail: "Could not load action" }, { status: 503 });
  if (!existing) return NextResponse.json({ detail: "Action not found" }, { status: 404 });

  if (parsed.data.assigned_to) {
    const { data: assignee, error: ownerError } = await supabase.from("profiles")
      .select("id").eq("id", parsed.data.assigned_to).eq("tenant_id", claims.tenantId)
      .eq("is_active", true).maybeSingle();
    if (ownerError) return NextResponse.json({ detail: "Could not validate assignee" }, { status: 503 });
    if (!assignee) return NextResponse.json({ detail: "Assignee is not in this factory" }, { status: 422 });
  }

  const nextStatus = parsed.data.status ?? existing.status;
  const nextNotes = parsed.data.notes ?? existing.notes;
  if (nextStatus === "resolved" && !String(nextNotes).trim()) {
    return NextResponse.json({ detail: "Record a resolution note before closing the action" }, { status: 422 });
  }

  const update: Record<string, unknown> = { ...parsed.data, updated_at: new Date().toISOString() };
  if (parsed.data.status === "resolved" && existing.status !== "resolved") {
    update.resolved_at = new Date().toISOString();
  } else if (parsed.data.status && parsed.data.status !== "resolved") {
    update.resolved_at = null;
  }
  const { data, error } = await supabase.from("compliance_actions").update(update)
    .eq("id", existing.id).eq("tenant_id", claims.tenantId)
    .select("id,tenant_id,assessment_id,assessment_item_id,title,priority,status,assigned_to,due_date,notes,created_by,created_at,updated_at,resolved_at").maybeSingle();
  if (error || !data) return NextResponse.json({ detail: "Could not update action" }, { status: error ? 503 : 404 });
  return NextResponse.json(data, { headers: { "cache-control": "no-store" } });
}
