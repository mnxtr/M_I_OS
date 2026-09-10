import { NextResponse } from "next/server";
import { complianceAssessmentOut } from "@/lib/compliance/supabase";
import { ensureChecklistTemplates, type ChecklistItemSeed } from "@/lib/compliance/templates";
import { getClaims } from "@/lib/supabase/claims";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const claims = await getClaims();
  if (!claims) return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const templateCode = typeof body.template_code === "string" ? body.template_code.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 300) : "";
  const dueDate = typeof body.due_date === "string" ? body.due_date.slice(0, 20) : "";
  if (!templateCode || !title) return NextResponse.json({ detail: "Template and title are required" }, { status: 400 });

  await ensureChecklistTemplates();
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
