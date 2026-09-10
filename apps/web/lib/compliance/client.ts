"use client";

import type { AssessmentInfo, AssessmentItemRecord } from "@mios/shared";
import { ApiError } from "@/lib/api/fetcher";

async function request<T>(url: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    headers: { ...(init.body ? { "content-type": "application/json" } : {}), ...init.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(typeof body.detail === "string" ? body.detail : `Request failed (${response.status})`, response.status, body);
  }
  return response.json() as Promise<T>;
}

export const createComplianceAssessment = (payload: { template_code: string; title: string; due_date: string }) =>
  request<AssessmentInfo>("/api/compliance/assessments", { method: "POST", body: JSON.stringify(payload) });

export const updateComplianceItem = (itemId: string, patch: { status?: string; cap_text?: string; manually_set?: boolean }) =>
  request<AssessmentItemRecord>(`/api/compliance/items/${itemId}`, { method: "PATCH", body: JSON.stringify(patch) });

export const draftComplianceCap = (itemId: string) =>
  request<AssessmentItemRecord>(`/api/compliance/items/${itemId}/cap`, { method: "POST" });

export async function autoAssessCompliance(assessmentId: string, signal?: AbortSignal) {
  const response = await fetch(`/api/compliance/assessments/${assessmentId}/auto-assess`, { method: "POST", signal });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(typeof body.detail === "string" ? body.detail : `Request failed (${response.status})`, response.status, body);
  }
  return response;
}
