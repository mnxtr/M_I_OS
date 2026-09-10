import { NextResponse, type NextRequest } from "next/server";
import { getClaims } from "@/lib/supabase/claims";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Evidence binder download. The authenticated route builds a portable Markdown report
 * from the tenant's own assessment rows, without depending on the retired FastAPI app.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ assessmentId: string }> },
) {
  const claims = await getClaims();
  if (!claims) return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });

  const { assessmentId } = await params;
  const admin = createAdminClient();
  const [{ data: assessment, error: assessmentError }, { data: items, error: itemsError }] = await Promise.all([
    admin.from("assessments").select("id,title,template_code,due_date,status,created_at").eq("id", assessmentId).eq("tenant_id", claims.tenantId).maybeSingle(),
    admin.from("assessment_items").select("ref,category,title,status,manually_set,ai_notes,cap_text,evidence").eq("assessment_id", assessmentId).eq("tenant_id", claims.tenantId).order("ref"),
  ]);
  if (assessmentError || itemsError) return NextResponse.json({ detail: assessmentError?.message ?? itemsError?.message }, { status: 500 });
  if (!assessment) return NextResponse.json({ detail: "Assessment not found" }, { status: 404 });
  const lines = [
    `# Evidence Binder — ${assessment.title}`,
    "",
    `Template: ${assessment.template_code}`,
    `Due date: ${assessment.due_date || "—"}`,
    `Status: ${assessment.status}`,
    `Generated: ${new Date().toISOString()}`,
    "",
    "| Ref | Category | Requirement | Status | Notes |",
    "|---|---|---|---|---|",
    ...(items ?? []).map((item) => `| ${item.ref} | ${item.category.replaceAll("|", "/")} | ${item.title.replaceAll("|", "/")} | ${item.status}${item.manually_set ? " (manual)" : ""} | ${(item.ai_notes ?? "").replaceAll("|", "/").replaceAll("\n", " ").slice(0, 120)} |`),
  ];
  for (const item of items ?? []) {
    const evidence = Array.isArray(item.evidence) ? item.evidence as Array<Record<string, unknown>> : [];
    if (!evidence.length && !item.cap_text) continue;
    lines.push("", `## [${item.ref}] ${item.title}`, "", `Status: **${item.status}**${item.manually_set ? " (manual)" : ""}`);
    for (const citation of evidence) lines.push(`- Evidence: ${String(citation.document_name ?? "Document")} p.${Number(citation.page ?? 0)} — “${String(citation.snippet ?? "").slice(0, 300)}”`);
    if (item.cap_text) lines.push("", "### Corrective Action Plan", "", item.cap_text);
  }
  return new NextResponse(lines.join("\n"), {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `attachment; filename="binder-${assessment.id}.md"`,
      "cache-control": "no-store",
    },
  });
}
