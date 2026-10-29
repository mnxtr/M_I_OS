import { NextResponse, type NextRequest } from "next/server";
import { getClaims } from "@/lib/supabase/claims";
import { createClient } from "@/lib/supabase/server";
import { canManageComplianceActions } from "@/lib/compliance/actions";
import { createActionSchema } from "@/lib/compliance/action-validation";

export const dynamic = "force-dynamic";

function enabled() {
  return process.env.FEATURE_COMPLIANCE_ACTIONS === "true";
}

async function authorized() {
  const claims = await getClaims();
  if (!claims) return { error: NextResponse.json({ detail: "Not authenticated" }, { status: 401 }) };
  if (!canManageComplianceActions(claims.role)) {
    return { error: NextResponse.json({ detail: "Not authorized" }, { status: 403 }) };
  }
  return { claims };
}

export async function GET() {
  if (!enabled()) return NextResponse.json({ detail: "Feature unavailable" }, { status: 404 });
  const session = await authorized();
  if (session.error) return session.error;
  const claims = session.claims!;
  const supabase = await createClient();
  const { data, error } = await supabase.from("compliance_actions")
    .select("id,tenant_id,assessment_id,assessment_item_id,title,priority,status,assigned_to,due_date,notes,created_by,created_at,updated_at,resolved_at")
    .eq("tenant_id", claims.tenantId).order("created_at", { ascending: false }).limit(250);
  if (error) return NextResponse.json({ detail: "Action register is unavailable" }, { status: 503 });
  return NextResponse.json({ actions: data ?? [] }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (!enabled()) return NextResponse.json({ detail: "Feature unavailable" }, { status: 404 });
  const session = await authorized();
  if (session.error) return session.error;
  const claims = session.claims!;
  const body: unknown = await request.json().catch(() => null);
  const parsed = createActionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ detail: "Invalid action fields" }, { status: 422 });

  const supabase = await createClient();
  const { data: item, error: itemError } = await supabase.from("assessment_items")
    .select("id,assessment_id,title")
    .eq("id", parsed.data.assessment_item_id)
    .eq("tenant_id", claims.tenantId).maybeSingle();
  if (itemError) return NextResponse.json({ detail: "Could not validate requirement" }, { status: 503 });
  if (!item) return NextResponse.json({ detail: "Requirement not found" }, { status: 404 });

  if (parsed.data.assigned_to) {
    const { data: assignee, error: ownerError } = await supabase.from("profiles")
      .select("id").eq("id", parsed.data.assigned_to).eq("tenant_id", claims.tenantId)
      .eq("is_active", true).maybeSingle();
    if (ownerError) return NextResponse.json({ detail: "Could not validate assignee" }, { status: 503 });
    if (!assignee) return NextResponse.json({ detail: "Assignee is not in this factory" }, { status: 422 });
  }

  const { data, error } = await supabase.from("compliance_actions").insert({
    tenant_id: claims.tenantId,
    assessment_id: item.assessment_id,
    assessment_item_id: item.id,
    title: String(item.title).slice(0, 300),
    priority: parsed.data.priority,
    status: "open",
    assigned_to: parsed.data.assigned_to ?? null,
    due_date: parsed.data.due_date ?? null,
    notes: parsed.data.notes,
    created_by: claims.userId,
  }).select("id,tenant_id,assessment_id,assessment_item_id,title,priority,status,assigned_to,due_date,notes,created_by,created_at,updated_at,resolved_at").single();
  if (error?.code === "23505") return NextResponse.json({ detail: "This requirement already has an action" }, { status: 409 });
  if (error || !data) return NextResponse.json({ detail: "Could not create action" }, { status: 503 });
  return NextResponse.json(data, { status: 201, headers: { "cache-control": "no-store" } });
}
