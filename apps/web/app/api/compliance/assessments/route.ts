import { NextResponse } from "next/server";
import { complianceAssessmentOut } from "@/lib/compliance/supabase";
import type { ChecklistItemSeed } from "@/lib/compliance/templates";
import { createClient } from "@/lib/supabase/server";
import { getClaims } from "@/lib/supabase/claims";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const claims = await getClaims();
  if (!claims) return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  // Do not rely on a potentially stale role claim for privileged writes.
  // Also require the current, active role from the authenticated RLS-scoped profile.
  const allowedRoles = ["owner", "admin", "compliance_manager"];
  if (!allowedRoles.includes(claims.role)) {
    return NextResponse.json({ detail: "Not authorized to create assessments" }, { status: 403 });
  }
  const userClient = await createClient();
  const { data: profile, error: profileError } = await userClient.from("profiles")
    .select("role,is_active").eq("id", claims.userId).eq("tenant_id", claims.tenantId).maybeSingle();
  if (profileError) return NextResponse.json({ detail: "Could not verify workspace permissions" }, { status: 503 });
  if (!profile?.is_active || !allowedRoles.includes(profile.role)) {
    return NextResponse.json({ detail: "Not authorized to create assessments" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const templateCode = typeof body.template_code === "string" ? body.template_code.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 300) : "";
  const dueDate = typeof body.due_date === "string" ? body.due_date.slice(0, 20) : "";
  if (!templateCode || !title) return NextResponse.json({ detail: "Template and title are required" }, { status: 400 });

  // A missing service credential must produce an actionable, safe response,
  // rather than an uncaught Next.js server-rendering error.
  // Provisioning checklist templates belongs in database migrations, not a user POST.
  if (!process.env.SUPABASE_SECRET_KEY) {
    console.error("MIOS compliance assessment creation unavailable: server credential missing");
    return NextResponse.json(
      { detail: "Assessment creation is temporarily unavailable. Contact your workspace administrator." },
      { status: 503 },
    );
  }
  const admin = createAdminClient();
  const { data: template, error: templateError } = await admin
    .from("checklist_templates")
    .select("code,items")
    .eq("code", templateCode)
    .maybeSingle();
  if (templateError) return NextResponse.json({ detail: templateError.message }, { status: 500 });
  if (!template) return NextResponse.json({ detail: "Template not found" }, { status: 404 });
  const items = Array.isArray(template.items) ? template.items as ChecklistItemSeed[] : [];
  if (!items.length) return NextResponse.json({ detail: "Template has no requirements" }, { status: 422 });

  const { data: assessment, error: assessmentError } = await admin
    .from("assessments")
    .insert({ tenant_id: claims.tenantId, template_code: template.code, title, due_date: dueDate, status: "pending" })
    .select("id,title,template_code,due_date,status,created_at")
    .single();
  if (assessmentError || !assessment) return NextResponse.json({ detail: assessmentError?.message ?? "Could not create assessment" }, { status: 500 });

  const { data: createdItems, error: itemError } = await admin.from("assessment_items").insert(
    items.map((item) => ({
      tenant_id: claims.tenantId,
      assessment_id: assessment.id,
      ref: item.ref,
      category: item.category,
      title: item.title,
      guidance: item.guidance,
      status: "pending",
    })),
  ).select("assessment_id,status");
  if (itemError) {
    await admin.from("assessments").delete().eq("id", assessment.id).eq("tenant_id", claims.tenantId);
    return NextResponse.json({ detail: itemError.message }, { status: 500 });
  }
  return NextResponse.json(complianceAssessmentOut(assessment, createdItems ?? []), { status: 201 });
}
