import { NextResponse } from "next/server";
import { complianceAssessmentOut } from "@/lib/compliance/supabase";
import { DEFAULT_CHECKLISTS, type ChecklistItemSeed } from "@/lib/compliance/templates";
import { getClaims } from "@/lib/supabase/claims";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const claims = await getClaims();
  if (!claims) return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });

  const raw: unknown = await request.json().catch(() => null);
  const body = raw !== null && typeof raw === "object" && !Array.isArray(raw)
    ? raw as Record<string, unknown> : {};
  const templateCode = typeof body.template_code === "string" ? body.template_code.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 300) : "";
  const dueDate = typeof body.due_date === "string" ? body.due_date.trim() : "";
  if (!templateCode || !title) {
    return NextResponse.json({ detail: "Template and title are required" }, { status: 400 });
  }
  if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    return NextResponse.json({ detail: "Due date must be YYYY-MM-DD" }, { status: 422 });
  }
  if (!process.env.SUPABASE_SECRET_KEY) {
    return NextResponse.json(
      { detail: "Compliance writes are not configured. Contact the workspace administrator." },
      { status: 503 },
    );
  }

  const admin = createAdminClient();
  const builtIn = DEFAULT_CHECKLISTS.find((template) => template.code === templateCode);
  let code = builtIn?.code ?? "";
  let items: ChecklistItemSeed[] = builtIn?.items ?? [];

  // Custom template lookup is read-only. Built-in templates need no database seed.
  if (!builtIn) {
    const { data: template, error: templateError } = await admin
      .from("checklist_templates")
      .select("code,items")
      .eq("code", templateCode)
      .maybeSingle();
    if (templateError) {
      return NextResponse.json({ detail: "Could not load checklist template" }, { status: 503 });
    }
    if (!template) return NextResponse.json({ detail: "Template not found" }, { status: 404 });
    code = template.code;
    items = Array.isArray(template.items) ? template.items as ChecklistItemSeed[] : [];
  }
  if (!items.length) {
    return NextResponse.json({ detail: "Template has no requirements" }, { status: 422 });
  }

  const { data: assessment, error: assessmentError } = await admin
    .from("assessments")
    .insert({ tenant_id: claims.tenantId, template_code: code, title, due_date: dueDate, status: "pending" })
    .select("id,title,template_code,due_date,status,created_at")
    .single();
  if (assessmentError || !assessment) {
    return NextResponse.json({ detail: "Could not create assessment" }, { status: 503 });
  }

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
    // Best-effort rollback of the incomplete assessment within the authorized tenant.
    await admin.from("assessments").delete().eq("id", assessment.id).eq("tenant_id", claims.tenantId);
    return NextResponse.json({ detail: "Could not create checklist requirements" }, { status: 503 });
  }
  return NextResponse.json(complianceAssessmentOut(assessment, createdItems ?? []), { status: 201 });
}
