import { getAccessToken, supabase } from "./supabase";

export const API_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export interface Citation {
  document_id: string;
  document_name: string;
  page: number;
  chunk_index: number;
  snippet: string;
}

export interface ChatResponse {
  answer: string;
  citations: Citation[];
  provider: string;
}

export interface ChatStatus {
  provider: string;
  ready: boolean;
  mode: string;
}

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

async function authHeaders(): Promise<HeadersInit> {
  const token = await getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handle<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    localStorage.removeItem("mios_token");
    window.location.href = "/";
    throw new Error("Session expired");
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail ?? `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export async function login(email: string, password: string): Promise<string> {
  if (supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) throw new Error(error?.message ?? "Sign-in failed");
    return data.session.access_token;
  }
  const res = await fetch(`${API_URL}/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await handle<{ access_token: string }>(res);
  return data.access_token;
}

export async function register(
  companyName: string,
  fullName: string,
  email: string,
  password: string,
): Promise<string> {
  if (supabase) {
    const { data, error } = await supabase.auth.signUp({ email, password,
      options: { data: { full_name: fullName, company_name: companyName } } });
    if (error) throw new Error(error.message);
    if (!data.session) throw new Error("Check your email to confirm your account. Factory membership must be provisioned by an administrator.");
    return data.session.access_token;
  }
  const res = await fetch(`${API_URL}/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      company_name: companyName,
      full_name: fullName,
      email,
      password,
    }),
  });
  const data = await handle<{ access_token: string }>(res);
  return data.access_token;
}

export async function fetchDocuments(): Promise<DocumentRecord[]> {
  const res = await fetch(`${API_URL}/v1/documents`, { headers: await authHeaders() });
  return handle<DocumentRecord[]>(res);
}

export async function uploadDocument(file: File): Promise<void> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_URL}/v1/documents`, {
    method: "POST",
    headers: await authHeaders(),
    body: form,
  });
  await handle(res);
}

export async function ask(question: string): Promise<ChatResponse> {
  const res = await fetch(`${API_URL}/v1/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...await authHeaders() },
    body: JSON.stringify({ question }),
  });
  return handle<ChatResponse>(res);
}

export async function getChatStatus(): Promise<ChatStatus> {
  const res = await fetch(`${API_URL}/v1/chat/status`, { headers: await authHeaders() });
  return handle<ChatStatus>(res);
}

export interface StreamHandlers {
  onCitations?: (citations: Citation[]) => void;
  onToken: (token: string) => void;
}

export async function askStream(
  question: string,
  handlers: StreamHandlers,
): Promise<void> {
  const res = await fetch(`${API_URL}/v1/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...await authHeaders() },
    body: JSON.stringify({ question }),
  });
  if (!res.ok || !res.body) {
    await handle(res);
    return;
  }
  await consumeSse(res.body, handlers);
}

async function consumeSse(
  body: ReadableStream<Uint8Array>,
  handlers: StreamHandlers,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finished = false;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const event = JSON.parse(line.slice(6));
      if (event.type === "citations") handlers.onCitations?.(event.citations);
      else if (event.type === "token") handlers.onToken(event.value);
      else if (event.type === "error") throw new Error(event.message ?? "Response interrupted");
      else if (event.type === "done") finished = true;
    }
  }
  if (!finished) throw new Error("Response interrupted before completion. Please retry.");
}

export interface TableInfo {
  id: string;
  name: string;
  sheet_name: string;
  columns: { name: string; type: string }[];
  row_count: number;
}

export async function listTables(): Promise<TableInfo[]> {
  const res = await fetch(`${API_URL}/v1/analytics/tables`, {
    headers: await authHeaders(),
  });
  return handle<TableInfo[]>(res);
}

export interface QueryResult {
  answer: string;
  sql: string;
  columns: string[];
  rows: Record<string, unknown>[];
  row_count: number;
}

export async function runQuery(
  question: string,
  tableId?: string,
): Promise<QueryResult> {
  const res = await fetch(`${API_URL}/v1/analytics/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...await authHeaders() },
    body: JSON.stringify({ question, table_id: tableId ?? null }),
  });
  return handle<QueryResult>(res);
}

export interface TemplateInfo {
  code: string;
  name: string;
  version: number;
  description: string;
  item_count: number;
}

export async function listTemplates(): Promise<TemplateInfo[]> {
  const res = await fetch(`${API_URL}/v1/compliance/templates`, {
    headers: await authHeaders(),
  });
  return handle<TemplateInfo[]>(res);
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

export async function listAssessments(): Promise<AssessmentInfo[]> {
  const res = await fetch(`${API_URL}/v1/compliance/assessments`, {
    headers: await authHeaders(),
  });
  return handle<AssessmentInfo[]>(res);
}

export async function createAssessment(
  templateCode: string,
  title: string,
  dueDate: string,
): Promise<AssessmentInfo> {
  const res = await fetch(`${API_URL}/v1/compliance/assessments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...await authHeaders() },
    body: JSON.stringify({ template_code: templateCode, title, due_date: dueDate }),
  });
  return handle<AssessmentInfo>(res);
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

export async function getAssessmentItems(
  assessmentId: string,
): Promise<AssessmentItemRecord[]> {
  const res = await fetch(
    `${API_URL}/v1/compliance/assessments/${assessmentId}`,
    { headers: await authHeaders() },
  );
  return handle<AssessmentItemRecord[]>(res);
}

export async function autoAssessStream(
  assessmentId: string,
  onEvent: (event: { type: string; ref?: string; status?: string }) => void,
): Promise<void> {
  const res = await fetch(
    `${API_URL}/v1/compliance/assessments/${assessmentId}/auto-assess`,
    { method: "POST", headers: await authHeaders() },
  );
  if (!res.ok || !res.body) {
    await handle(res);
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        onEvent(JSON.parse(line.slice(6)));
      } catch {
        // ignore malformed frames
      }
    }
  }
}

const ITEM_STATUSES = [
  "pending",
  "compliant",
  "partial",
  "gap",
  "unknown",
  "not_applicable",
];

export { ITEM_STATUSES };

export async function updateAssessmentItem(
  itemId: string,
  patch: { status?: string; cap_text?: string },
): Promise<AssessmentItemRecord> {
  const res = await fetch(`${API_URL}/v1/compliance/items/${itemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...await authHeaders() },
    body: JSON.stringify(patch),
  });
  return handle<AssessmentItemRecord>(res);
}

export async function draftCap(itemId: string): Promise<AssessmentItemRecord> {
  const res = await fetch(`${API_URL}/v1/compliance/items/${itemId}/cap`, {
    method: "POST",
    headers: await authHeaders(),
  });
  return handle<AssessmentItemRecord>(res);
}

export function binderUrl(assessmentId: string): string {
  return `${API_URL}/v1/compliance/assessments/${assessmentId}/binder`;
}

export async function downloadBinder(assessmentId: string): Promise<void> {
  const res = await fetch(binderUrl(assessmentId), { headers: await authHeaders() });
  if (!res.ok) {
    await handle(res);
    return;
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `binder-${assessmentId}.zip`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export interface UsageInfo {
  plan: { code: string; name: string; price_usd: number };
  period: string;
  usage: Record<string, number>;
  limits: Record<string, number>;
  estimated_minutes_saved: number;
}

export async function fetchUsage(): Promise<UsageInfo> {
  const res = await fetch(`${API_URL}/v1/tenant/usage`, { headers: await authHeaders() });
  return handle<UsageInfo>(res);
}

export interface PlanInfo {
  code: string;
  name: string;
  price_usd: number;
}

export async function switchPlan(planCode: string): Promise<PlanInfo> {
  const res = await fetch(`${API_URL}/v1/tenant/plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...await authHeaders() },
    body: JSON.stringify({ plan: planCode }),
  });
  return handle<PlanInfo>(res);
}
