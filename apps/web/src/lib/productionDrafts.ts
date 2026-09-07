import { API_URL } from "./api";
import { getAccessToken } from "./supabase";

export interface SavedDraft {
  revision: number;
  updated_at: string;
  payload: { interval_minutes: number; observations: {line:string; start:string; target:number; actual:number | null}[] };
}

async function request(method: "GET" | "POST", signal: AbortSignal, body?: unknown): Promise<SavedDraft | null> {
  const token = await getAccessToken();
  if (!token) throw new Error("SESSION_EXPIRED");
  const response = await fetch(`${API_URL}/v1/operations/draft`, {
    method, signal, cache:"no-store",
    headers: {Authorization:`Bearer ${token}`, ...(body ? {"Content-Type":"application/json"} : {})},
    ...(body ? {body:JSON.stringify(body)} : {}),
  });
  if (response.status === 401 || response.status === 403) throw new Error("SESSION_EXPIRED");
  if (response.status === 409) throw new Error("DRAFT_CONFLICT");
  if (response.status === 422) throw new Error("DRAFT_INVALID");
  if (!response.ok) throw new Error("DRAFT_UNAVAILABLE");
  return response.json();
}
export const loadProductionDraft = (signal: AbortSignal) => request("GET", signal);
export const saveProductionDraft = (value: string, revision: number, signal: AbortSignal) =>
  request("POST", signal, {expected_revision: revision, payload: JSON.parse(value)});
