import type { User } from "@supabase/supabase-js";

import type { ChatMetadata, ChatResponse, Citation } from "@/lib/chat";
import { getSupabase } from "@/lib/supabase";
import type { DashboardFilters, DashboardSnapshot } from "@/lib/dashboard";

export type { ChatMetadata, ChatResponse, Citation } from "@/lib/chat";

export interface DocumentRecord {
  id: string;
  filename: string;
  doc_type: string;
  department: string;
  status: string;
  page_count: number;
  error: string;
  created_at: string;
}

export interface TableInfo {
  id: string;
  name: string;
  sheet_name: string;
  columns: { name: string; type: string }[];
  row_count: number;
}

export interface QueryResult {
  answer: string;
  sql: string;
  columns: string[];
  rows: Record<string, unknown>[];
  row_count: number;
}

export interface TemplateInfo {
  code: string;
  name: string;
  version: number;
  description: string;
  item_count: number;
}

export interface AssessmentInfo {
  id: string;
  title: string;
  template_code: string;
  due_date: string;
  status: string;
  created_at: string;
  counts: Record<string, number>;
}

export interface AssessmentItemRecord {
  id: string;
  ref: string;
  category: string;
  title: string;
  guidance: string;
  status: string;
  manually_set: boolean;
  ai_notes: string;
  cap_text: string;
  evidence: Citation[];
}

export interface UsageInfo {
  plan: { code: string; name: string; price_usd: number };
  period: string;
  usage: Record<string, number>;
  limits: Record<string, number>;
  estimated_minutes_saved: number;
}

export interface PlanInfo {
  code: string;
  name: string;
  price_usd: number;
}

interface AnalyticsAnswerRow {
  id: string;
  keywords: string[];
  answer: string;
  sql_text: string;
  columns: string[];
  rows: Record<string, unknown>[];
}

interface AssessmentRow {
  id: string;
  title: string;
  template_code: string;
  due_date: string | null;
  status: string;
  created_at: string;
  mios_assessment_items?: { status: string }[];
}

let provisionPromise: Promise<void> | null = null;

export async function getCurrentUser(): Promise<User | null> {
  const { data, error } = await getSupabase().auth.getUser();
  if (error) return null;
  return data.user;
}

export async function login(email: string, password: string): Promise<void> {
  const { error } = await getSupabase().auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  await provisionPilot();
}

export async function register(
  companyName: string,
  fullName: string,
  email: string,
  password: string,
): Promise<{ requiresEmailConfirmation: boolean }> {
  const { data, error } = await getSupabase().auth.signUp({
    email,
    password,
    options: {
      data: {
        company_name: companyName.trim(),
        full_name: fullName.trim(),
      },
    },
  });
  if (error) throw new Error(error.message);

  const requiresEmailConfirmation = !data.session;
  if (!requiresEmailConfirmation) await provisionPilot();
  return { requiresEmailConfirmation };
}

export async function signOut(): Promise<void> {
  const { error } = await getSupabase().auth.signOut();
  if (error) throw new Error(error.message);
  provisionPromise = null;
}

export async function fetchDashboard(
  filters: DashboardFilters = {},
): Promise<DashboardSnapshot> {
  const params = new URLSearchParams();
  if (filters.factoryId) params.set("factory_id", filters.factoryId);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.granularity) params.set("granularity", filters.granularity);
  if (filters.lineId) params.set("line_id", filters.lineId);
  if (filters.shift) params.set("shift", filters.shift);
  const response = await fetch(`/api/mios/dashboard?${params.toString()}`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Dashboard data could not be loaded.");
  return response.json() as Promise<DashboardSnapshot>;
}

export async function provisionPilot(): Promise<void> {
  if (!provisionPromise) {
    const request = getSupabase().rpc("provision_mios_pilot");
    provisionPromise = Promise.resolve(request)
      .then(({ error }) => {
        if (error) throw new Error(error.message);
      })
      .catch((error: unknown) => {
        provisionPromise = null;
        throw error;
      });
  }
  await provisionPromise;
}

export async function fetchDocuments(): Promise<DocumentRecord[]> {
  await provisionPilot();
  const { data, error } = await getSupabase()
    .from("mios_documents")
    .select("id, filename, doc_type, department, status, page_count, error, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as DocumentRecord[];
}

export async function uploadDocument(file: File): Promise<void> {
  if (file.size > 15 * 1024 * 1024) throw new Error("Files must be 15 MB or smaller.");

  const user = await requireUser();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
  const storagePath = `${user.id}/${crypto.randomUUID()}-${safeName}`;
  const supabase = getSupabase();
  const { error: uploadError } = await supabase.storage
    .from("mios-pilot-documents")
    .upload(storagePath, file, { contentType: file.type || undefined, upsert: false });
  if (uploadError) throw new Error(uploadError.message);

  const extension = file.name.split(".").pop()?.toLowerCase() || "document";
  const { error: rowError } = await supabase.from("mios_documents").upsert(
    {
      user_id: user.id,
      filename: file.name,
      doc_type: extension,
      department: "Uploaded",
      status: "ready",
      page_count: 0,
      error: "",
      storage_path: storagePath,
      created_at: new Date().toISOString(),
    },
    { onConflict: "user_id,filename" },
  );
  if (rowError) {
    await supabase.storage.from("mios-pilot-documents").remove([storagePath]);
    throw new Error(rowError.message);
  }
}

export async function ask(question: string): Promise<ChatResponse> {
  const response = await fetch("/api/mios/chat", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, top_k: 8 }),
  });
  if (!response.ok) throw new Error(await responseError(response));
  return response.json() as Promise<ChatResponse>;
}

export interface StreamHandlers {
  onMetadata?: (metadata: ChatMetadata) => void;
  onCitations?: (citations: Citation[]) => void;
  onWarning?: (warning: string) => void;
  onToken: (token: string) => void;
}

export async function askStream(
  question: string,
  handlers: StreamHandlers,
): Promise<void> {
  const response = await fetch("/api/mios/chat/stream", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, top_k: 8 }),
  });
  if (!response.ok) throw new Error(await responseError(response));
  if (!response.body) throw new Error("MIOS returned an empty response stream.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const citations: Citation[] = [];
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() || "";
    blocks.forEach((block) => handleStreamBlock(block, handlers, citations));
    if (done) break;
  }
  if (buffer.trim()) handleStreamBlock(buffer, handlers, citations);
}

function handleStreamBlock(
  block: string,
  handlers: StreamHandlers,
  citations: Citation[],
): void {
  const data = block
    .split("\n")
    .find((line) => line.startsWith("data:"))
    ?.slice(5)
    .trim();
  if (!data) return;
  const event = JSON.parse(data) as Record<string, unknown>;
  if (event.type === "metadata") {
    handlers.onMetadata?.(event as unknown as ChatMetadata);
  } else if (event.type === "citation" && event.citation) {
    citations.push(event.citation as Citation);
    handlers.onCitations?.([...citations]);
  } else if (event.type === "warning" && typeof event.message === "string") {
    handlers.onWarning?.(event.message);
  } else if (event.type === "token" && typeof event.value === "string") {
    handlers.onToken(event.value);
  } else if (event.type === "error") {
    throw new Error(typeof event.message === "string" ? event.message : "MIOS generation failed.");
  }
}

async function responseError(response: Response): Promise<string> {
  const body = await response.text();
  try {
    const parsed = JSON.parse(body) as { detail?: string };
    return parsed.detail || `MIOS request failed (${response.status}).`;
  } catch {
    return body || `MIOS request failed (${response.status}).`;
  }
}

export async function listTables(): Promise<TableInfo[]> {
  await provisionPilot();
  const { data, error } = await getSupabase()
    .from("mios_tables")
    .select("id, name, sheet_name, columns, row_count")
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as TableInfo[];
}

export async function runQuery(
  question: string,
  _tableId?: string,
): Promise<QueryResult> {
  await requireUser();
  const { data, error } = await getSupabase()
    .from("mios_analytics_answers")
    .select("id, keywords, answer, sql_text, columns, rows");
  if (error) throw new Error(error.message);

  const selected = pickAnswer(question, (data ?? []) as AnalyticsAnswerRow[]);
  await incrementUsage("analytics_queries");
  return {
    answer: selected.answer,
    sql: selected.sql_text,
    columns: selected.columns,
    rows: selected.rows,
    row_count: selected.rows.length,
  };
}

export async function listTemplates(): Promise<TemplateInfo[]> {
  const { data, error } = await getSupabase()
    .from("mios_templates")
    .select("code, name, version, description, item_count")
    .order("code");
  if (error) throw new Error(error.message);
  return (data ?? []) as TemplateInfo[];
}

export async function listAssessments(): Promise<AssessmentInfo[]> {
  await provisionPilot();
  const { data, error } = await getSupabase()
    .from("mios_assessments")
    .select("id, title, template_code, due_date, status, created_at, mios_assessment_items(status)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  return ((data ?? []) as AssessmentRow[]).map((assessment) => ({
    id: assessment.id,
    title: assessment.title,
    template_code: assessment.template_code,
    due_date: assessment.due_date ?? "",
    status: assessment.status,
    created_at: assessment.created_at,
    counts: countStatuses(assessment.mios_assessment_items ?? []),
  }));
}

export async function createAssessment(
  templateCode: string,
  title: string,
  dueDate: string,
): Promise<AssessmentInfo> {
  const { data, error } = await getSupabase().rpc("create_mios_assessment", {
    requested_template_code: templateCode,
    requested_title: title,
    requested_due_date: dueDate || null,
  });
  if (error) throw new Error(error.message);

  const assessment = (Array.isArray(data) ? data[0] : data) as AssessmentRow | null;
  if (!assessment) throw new Error("Assessment could not be created.");
  return {
    id: assessment.id,
    title: assessment.title,
    template_code: assessment.template_code,
    due_date: assessment.due_date ?? "",
    status: assessment.status,
    created_at: assessment.created_at,
    counts: { pending: 0 },
  };
}

export async function getAssessmentItems(
  assessmentId: string,
): Promise<AssessmentItemRecord[]> {
  const { data, error } = await getSupabase()
    .from("mios_assessment_items")
    .select("id, ref, category, title, guidance, status, manually_set, ai_notes, cap_text, evidence")
    .eq("assessment_id", assessmentId)
    .order("ref");
  if (error) throw new Error(error.message);
  return (data ?? []) as AssessmentItemRecord[];
}

export async function autoAssessStream(
  assessmentId: string,
  onEvent: (event: { type: string; ref?: string; status?: string }) => void,
): Promise<void> {
  const items = await getAssessmentItems(assessmentId);
  for (const item of items.filter((candidate) => !candidate.manually_set)) {
    onEvent({ type: "progress", ref: item.ref });
    await delay(110);
  }

  const { error } = await getSupabase().rpc("auto_assess_mios", {
    requested_assessment_id: assessmentId,
  });
  if (error) throw new Error(error.message);
  items.forEach((item) => onEvent({ type: "verdict", ref: item.ref }));
  onEvent({ type: "done", status: "complete" });
}

export const ITEM_STATUSES = [
  "pending",
  "compliant",
  "partial",
  "gap",
  "unknown",
  "not_applicable",
];

export async function updateAssessmentItem(
  itemId: string,
  patch: { status?: string; cap_text?: string },
): Promise<AssessmentItemRecord> {
  const update = patch.status ? { ...patch, manually_set: true } : patch;
  const { data, error } = await getSupabase()
    .from("mios_assessment_items")
    .update(update)
    .eq("id", itemId)
    .select("id, ref, category, title, guidance, status, manually_set, ai_notes, cap_text, evidence")
    .single();
  if (error) throw new Error(error.message);
  return data as AssessmentItemRecord;
}

export async function draftCap(itemId: string): Promise<AssessmentItemRecord> {
  const supabase = getSupabase();
  const { data: draftRow, error: draftError } = await supabase
    .from("mios_assessment_items")
    .select("cap_draft")
    .eq("id", itemId)
    .single();
  if (draftError) throw new Error(draftError.message);

  const { data, error } = await supabase
    .from("mios_assessment_items")
    .update({ cap_text: String(draftRow.cap_draft ?? "") })
    .eq("id", itemId)
    .select("id, ref, category, title, guidance, status, manually_set, ai_notes, cap_text, evidence")
    .single();
  if (error) throw new Error(error.message);
  return data as AssessmentItemRecord;
}

export async function downloadBinder(assessmentId: string): Promise<void> {
  const [assessments, items] = await Promise.all([
    listAssessments(),
    getAssessmentItems(assessmentId),
  ]);
  const assessment = assessments.find((candidate) => candidate.id === assessmentId);
  if (!assessment) throw new Error("Assessment not found.");

  const sections = items.map((item) => {
    const evidence = item.evidence
      .map((citation) => `- ${citation.document_name}, p.${citation.page}: ${citation.snippet}`)
      .join("\n");
    return [
      `## ${item.ref} · ${item.title}`,
      `Status: ${item.status}`,
      item.ai_notes ? `MIOS assessment: ${item.ai_notes}` : "",
      evidence ? `Evidence:\n${evidence}` : "Evidence: none attached",
      item.cap_text ? `Corrective action:\n${item.cap_text}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
  });
  const markdown = [
    `# Evidence binder · ${assessment.title}`,
    `Framework: ${assessment.template_code}`,
    `Due date: ${assessment.due_date || "Not set"}`,
    `Status: ${assessment.status}`,
    ...sections,
  ].join("\n\n");

  downloadBlob(
    new Blob([markdown], { type: "text/markdown;charset=utf-8" }),
    `mios-evidence-binder-${assessmentId}.md`,
  );
}

export async function fetchUsage(): Promise<UsageInfo> {
  await provisionPilot();
  const user = await requireUser();
  const { data, error } = await getSupabase()
    .from("mios_usage")
    .select("plan, period, usage, limits, estimated_minutes_saved")
    .eq("user_id", user.id)
    .single();
  if (error) throw new Error(error.message);
  return data as UsageInfo;
}

export async function switchPlan(planCode: string): Promise<PlanInfo> {
  const user = await requireUser();
  const plans: Record<string, PlanInfo> = {
    pilot: { code: "pilot", name: "Pilot", price_usd: 0 },
    starter: { code: "starter", name: "Starter", price_usd: 99 },
    growth: { code: "growth", name: "Growth", price_usd: 299 },
  };
  const plan = plans[planCode];
  if (!plan) throw new Error("Unknown plan.");
  const { error } = await getSupabase()
    .from("mios_usage")
    .update({ plan })
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  return plan;
}

async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Your session has expired. Please sign in again.");
  return user;
}

async function incrementUsage(metric: "chat_queries" | "analytics_queries"): Promise<void> {
  const { error } = await getSupabase().rpc("increment_mios_usage", { metric });
  if (error) throw new Error(error.message);
}

function countStatuses(items: { status: string }[]): Record<string, number> {
  return items.reduce<Record<string, number>>((counts, item) => {
    counts[item.status] = (counts[item.status] ?? 0) + 1;
    return counts;
  }, {});
}

function pickAnswer<T extends { id: string; keywords: string[] }>(question: string, rows: T[]): T {
  if (rows.length === 0) throw new Error("Pilot data is not available yet.");
  const normalizedQuestion = question.toLocaleLowerCase();
  return (
    rows.find(
      (row) =>
        row.id !== "default" &&
        row.keywords.some((keyword) => normalizedQuestion.includes(keyword.toLocaleLowerCase())),
    ) ??
    rows.find((row) => row.id === "default") ??
    rows[0]
  );
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}
