import "server-only";

import type { AssessmentInfo, AssessmentItemRecord, Citation, ItemStatus, TemplateInfo } from "@mios/shared";
import { getClaims } from "@/lib/supabase/claims";
import { createClient } from "@/lib/supabase/server";
import { ensureChecklistTemplates } from "./templates";

type Row = Record<string, unknown>;

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function citations(value: unknown): Citation[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const citation = entry && typeof entry === "object" ? entry as Row : null;
    const document_id = asString(citation?.document_id);
    if (!document_id) return [];
    return [{
      document_id,
      document_name: asString(citation?.document_name, "Document"),
      page: Number(citation?.page ?? 0) || 0,
      chunk_index: Number(citation?.chunk_index ?? 0) || 0,
      snippet: asString(citation?.snippet),
    }];
  });
}

export function complianceItemOut(row: Row): AssessmentItemRecord {
  return {
    id: asString(row.id),
    ref: asString(row.ref),
    category: asString(row.category),
    title: asString(row.title),
    guidance: asString(row.guidance),
    status: asString(row.status, "pending") as ItemStatus,
    manually_set: row.manually_set === true,
    ai_notes: asString(row.ai_notes),
    cap_text: asString(row.cap_text),
    evidence: citations(row.evidence),
  };
}

export function complianceAssessmentOut(row: Row, itemRows: Row[]): AssessmentInfo {
  const counts: Record<string, number> = {};
  for (const item of itemRows.filter((item) => item.assessment_id === row.id)) {
    const status = asString(item.status, "pending");
    counts[status] = (counts[status] ?? 0) + 1;
  }
  return {
    id: asString(row.id),
    title: asString(row.title),
    template_code: asString(row.template_code),
    due_date: asString(row.due_date),
    status: asString(row.status, "pending"),
    created_at: asString(row.created_at),
    counts,
  };
}

export async function listComplianceTemplatesSupabase(): Promise<TemplateInfo[]> {
  await ensureChecklistTemplates();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("checklist_templates")
    .select("code,name,version,description,items")
    .order("code");
  if (error) throw new Error(error.message);
  return (data ?? []).map((template) => ({
    code: template.code,
    name: template.name,
    version: Number(template.version ?? 1),
    description: template.description ?? "",
    item_count: Array.isArray(template.items) ? template.items.length : 0,
  }));
}

export async function listComplianceAssessmentsSupabase(): Promise<AssessmentInfo[]> {
  const claims = await getClaims();
  if (!claims) throw new Error("Not authenticated");
  const supabase = await createClient();
  const [{ data: assessments, error: assessmentError }, { data: items, error: itemError }] = await Promise.all([
    supabase.from("assessments").select("id,title,template_code,due_date,status,created_at").eq("tenant_id", claims.tenantId).order("created_at", { ascending: false }),
    supabase.from("assessment_items").select("assessment_id,status").eq("tenant_id", claims.tenantId),
  ]);
  if (assessmentError) throw new Error(assessmentError.message);
  if (itemError) throw new Error(itemError.message);
  return (assessments ?? []).map((assessment) => complianceAssessmentOut(assessment as Row, (items ?? []) as Row[]));
}

export async function getComplianceAssessmentSupabase(assessmentId: string) {
  const claims = await getClaims();
  if (!claims) throw new Error("Not authenticated");
  const supabase = await createClient();
  const [{ data: assessment, error: assessmentError }, { data: items, error: itemError }] = await Promise.all([
    supabase.from("assessments").select("id,title,template_code,due_date,status,created_at").eq("id", assessmentId).eq("tenant_id", claims.tenantId).maybeSingle(),
    supabase.from("assessment_items").select("id,assessment_id,ref,category,title,guidance,status,manually_set,ai_notes,cap_text,evidence").eq("assessment_id", assessmentId).eq("tenant_id", claims.tenantId).order("ref"),
  ]);
  if (assessmentError) throw new Error(assessmentError.message);
  if (itemError) throw new Error(itemError.message);
  if (!assessment) return null;
  return { assessment: complianceAssessmentOut(assessment as Row, (items ?? []) as Row[]), items: (items ?? []).map((item) => complianceItemOut(item as Row)) };
}
