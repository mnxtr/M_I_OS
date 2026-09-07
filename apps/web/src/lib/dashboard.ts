import { API_URL } from "./api";
import { getAccessToken } from "./supabase";

export type SourceStatus = "ready" | "processing" | "failed";
export interface KnowledgeSnapshot {
  fetched_at: string;
  total: number;
  counts: Record<SourceStatus, number>;
  ready_percent: number | null;
  matched: number;
  offset: number;
  limit: number;
  records: { id: string; filename: string; status: SourceStatus; department: string; created_at: string }[];
}

export async function getKnowledgeSnapshot(
  status: SourceStatus | "all", offset: number, signal: AbortSignal,
): Promise<KnowledgeSnapshot> {
  const token = await getAccessToken();
  if (!token) throw new Error("SESSION_EXPIRED");
  const params = new URLSearchParams({ offset: String(offset), limit: "20" });
  if (status !== "all") params.set("status", status);
  const response = await fetch(`${API_URL}/v1/dashboard/knowledge?${params}`, {
    headers: { Authorization: `Bearer ${token}` }, signal, cache: "no-store",
  });
  if (response.status === 401) {
    localStorage.removeItem("mios_token");
    throw new Error("SESSION_EXPIRED");
  }
  if (!response.ok) throw new Error("DASHBOARD_UNAVAILABLE");
  return response.json() as Promise<KnowledgeSnapshot>;
}
