export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("mios_token");
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
  const res = await fetch(`${API_URL}/v1/documents`, { headers: authHeaders() });
  return handle<DocumentRecord[]>(res);
}

export async function uploadDocument(file: File): Promise<void> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_URL}/v1/documents`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });
  await handle(res);
}

export async function ask(question: string): Promise<ChatResponse> {
  const res = await fetch(`${API_URL}/v1/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ question }),
  });
  return handle<ChatResponse>(res);
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
    headers: { "Content-Type": "application/json", ...authHeaders() },
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

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const event = JSON.parse(line.slice(6));
        if (event.type === "citations") handlers.onCitations?.(event.citations);
        else if (event.type === "token") handlers.onToken(event.value);
      } catch {
        // ignore malformed frames
      }
    }
  }
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
    headers: authHeaders(),
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
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ question, table_id: tableId ?? null }),
  });
  return handle<QueryResult>(res);
}
