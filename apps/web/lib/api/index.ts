import type {
  AssessmentInfo,
  AssessmentItemRecord,
  ChatFrame,
  AnalyticsFrame,
  AutoAssessFrame,
  QualityDashboardMetrics,
  ProductionDashboardMetrics,
  KnowledgeDashboardMetrics,
  ComplianceDashboardMetrics,
  AnalyticsDashboardMetrics,
  DashboardSummary,
  DocumentRecord,
  GuestTokenInfo,
  PaymentRecord,
  PlanInfo,
  QueryResult,
  TableInfo,
  TemplateInfo,
  UsageInfo,
  UserProfile,
} from "@mios/shared";
import { apiFetch, apiStream, serverApiFetch, type FetchOptions } from "./fetcher";

type Auth = { token: string };

// --- auth ---------------------------------------------------------------------

export const getMe = (auth: Auth) => apiFetch<UserProfile>("/v1/auth/me", auth);

// --- documents ----------------------------------------------------------------

export const listDocuments = (auth: Auth) => apiFetch<DocumentRecord[]>("/v1/documents", auth);

export const listDocumentsServer = (auth: Auth) =>
  serverApiFetch<DocumentRecord[]>("/v1/documents", auth);

/**
 * Register a file already uploaded straight to Supabase Storage.
 * See the upload flow in docs/06-FRONTEND-PLAN.md §10 — file bytes never cross Vercel.
 */
export const registerDocument = (
  auth: Auth,
  payload: { storage_path: string; filename: string; doc_type?: string; department?: string },
) =>
  apiFetch<DocumentRecord>("/v1/documents/register", {
    ...auth,
    method: "POST",
    body: payload,
  });

export const reingestDocument = (auth: Auth, documentId: string) =>
  apiFetch<DocumentRecord>(`/v1/documents/${documentId}/reingest`, { ...auth, method: "POST" });

export const deleteDocument = (auth: Auth, documentId: string) =>
  apiFetch<void>(`/v1/documents/${documentId}`, { ...auth, method: "DELETE" });

// --- chat ---------------------------------------------------------------------

export function chatStream(
  auth: Auth,
  question: string,
  signal?: AbortSignal,
): Promise<Response> {
  return apiStream("/v1/chat/stream", {
    ...auth,
    method: "POST",
    body: { question },
    signal,
  });
}

export type { ChatFrame };

// --- analytics ----------------------------------------------------------------

export const listTables = (auth: Auth) => apiFetch<TableInfo[]>("/v1/analytics/tables", auth);

export const listTablesServer = (auth: Auth) =>
  serverApiFetch<TableInfo[]>("/v1/analytics/tables", auth);

export const runQuery = (auth: Auth, question: string, tableId?: string | null) =>
  apiFetch<QueryResult>("/v1/analytics/query", {
    ...auth,
    method: "POST",
    body: { question, table_id: tableId ?? null },
  });

export function analyticsStream(
  auth: Auth,
  question: string,
  tableId?: string | null,
  signal?: AbortSignal,
): Promise<Response> {
  return apiStream("/v1/analytics/query/stream", {
    ...auth,
    method: "POST",
    body: { question, table_id: tableId ?? null },
    signal,
  });
}

export type { AnalyticsFrame };


// --- dashboard ---------------------------------------------------------------

function dashboardQuery(filters?: Partial<DashboardSummary["filters"]>) {
  const params = new URLSearchParams();
  if (filters?.range_days) params.set("range_days", String(filters.range_days));
  if (filters?.line) params.set("line", filters.line);
  if (filters?.department) params.set("department", filters.department);
  if (filters?.status) params.set("status", filters.status);
  const query = params.toString();
  return query ? `/v1/dashboard/summary?${query}` : "/v1/dashboard/summary";
}

export const fetchDashboardSummary = (
  auth: Auth,
  filters?: Partial<DashboardSummary["filters"]>,
) => apiFetch<DashboardSummary>(dashboardQuery(filters), auth);

export const fetchDashboardSummaryServer = (
  auth: Auth,
  filters?: Partial<DashboardSummary["filters"]>,
) => serverApiFetch<DashboardSummary>(dashboardQuery(filters), auth);


export async function fetchProductionMetrics(
  auth: Auth,
  filters?: Partial<DashboardSummary["filters"]>,
): Promise<ProductionDashboardMetrics> {
  return (await fetchDashboardSummary(auth, filters)).production;
}

export async function fetchComplianceMetrics(
  auth: Auth,
  filters?: Partial<DashboardSummary["filters"]>,
): Promise<ComplianceDashboardMetrics> {
  return (await fetchDashboardSummary(auth, filters)).compliance;
}

export async function fetchKnowledgeMetrics(
  auth: Auth,
  filters?: Partial<DashboardSummary["filters"]>,
): Promise<KnowledgeDashboardMetrics> {
  return (await fetchDashboardSummary(auth, filters)).knowledge;
}

export async function fetchQualityMetrics(
  auth: Auth,
  filters?: Partial<DashboardSummary["filters"]>,
): Promise<QualityDashboardMetrics> {
  return (await fetchDashboardSummary(auth, filters)).quality;
}

export async function fetchAnalyticsMetrics(
  auth: Auth,
  filters?: Partial<DashboardSummary["filters"]>,
): Promise<AnalyticsDashboardMetrics> {
  return (await fetchDashboardSummary(auth, filters)).analytics;
}

// --- compliance ---------------------------------------------------------------

export const listTemplates = (auth: Auth) =>
  apiFetch<TemplateInfo[]>("/v1/compliance/templates", auth);

export const listTemplatesServer = (auth: Auth) =>
  serverApiFetch<TemplateInfo[]>("/v1/compliance/templates", auth);

export const listAssessments = (auth: Auth) =>
  apiFetch<AssessmentInfo[]>("/v1/compliance/assessments", auth);

export const listAssessmentsServer = (auth: Auth) =>
  serverApiFetch<AssessmentInfo[]>("/v1/compliance/assessments", auth);

export const createAssessment = (
  auth: Auth,
  payload: { template_code: string; title: string; due_date: string },
) =>
  apiFetch<AssessmentInfo>("/v1/compliance/assessments", {
    ...auth,
    method: "POST",
    body: payload,
  });

export const getAssessmentItems = (auth: Auth, assessmentId: string) =>
  apiFetch<AssessmentItemRecord[]>(`/v1/compliance/assessments/${assessmentId}`, auth);

export const getAssessmentItemsServer = (auth: Auth, assessmentId: string) =>
  serverApiFetch<AssessmentItemRecord[]>(`/v1/compliance/assessments/${assessmentId}`, auth);

export function autoAssessStream(
  auth: Auth,
  assessmentId: string,
  signal?: AbortSignal,
): Promise<Response> {
  return apiStream(`/v1/compliance/assessments/${assessmentId}/auto-assess`, {
    ...auth,
    method: "POST",
    signal,
  });
}

export const updateAssessmentItem = (
  auth: Auth,
  itemId: string,
  patch: { status?: string; cap_text?: string; manually_set?: boolean },
) =>
  apiFetch<AssessmentItemRecord>(`/v1/compliance/items/${itemId}`, {
    ...auth,
    method: "PATCH",
    body: patch,
  });

export const draftCap = (auth: Auth, itemId: string) =>
  apiFetch<AssessmentItemRecord>(`/v1/compliance/items/${itemId}/cap`, {
    ...auth,
    method: "POST",
  });

/** The API uploads the ZIP to Storage and hands back a short-lived signed URL. */
export const requestBinder = (auth: Auth, assessmentId: string) =>
  serverApiFetch<{ url: string; expires_in: number }>(
    `/v1/compliance/assessments/${assessmentId}/binder?redirect=false`,
    auth,
  );

export type { AutoAssessFrame };

// --- tenant / billing ---------------------------------------------------------

export const fetchUsage = (auth: Auth) => apiFetch<UsageInfo>("/v1/tenant/usage", auth);

export const fetchUsageServer = (auth: Auth) => serverApiFetch<UsageInfo>("/v1/tenant/usage", auth);

export const listPlansServer = (auth: Auth) => serverApiFetch<PlanInfo[]>("/v1/tenant/plans", auth);

export const switchPlan = (auth: Auth, plan: string) =>
  apiFetch<PlanInfo>("/v1/tenant/plan", { ...auth, method: "POST", body: { plan } });

export const listPaymentsServer = (auth: Auth) =>
  serverApiFetch<PaymentRecord[]>("/v1/payments", auth);

export const createBkashPayment = (auth: Auth, payload: { plan: string; months: number }) =>
  serverApiFetch<{ payment_id: string; bkash_url: string }>("/v1/payments/bkash/create", {
    ...auth,
    method: "POST",
    body: payload,
  });

// --- guest tokens -------------------------------------------------------------

export const createGuestToken = (
  auth: Auth,
  payload: {
    label: string;
    valid_days: number;
    scope_all_documents: boolean;
    document_ids: string[];
  },
) => serverApiFetch<GuestTokenInfo>("/v1/guest-tokens", { ...auth, method: "POST", body: payload });

export const revokeGuestToken = (auth: Auth, token: string) =>
  serverApiFetch<void>(`/v1/guest-tokens/${encodeURIComponent(token)}`, {
    ...auth,
    method: "DELETE",
  });

export const listGuestTokensServer = (auth: Auth) =>
  serverApiFetch<GuestTokenInfo[]>("/v1/guest-tokens", auth);

// --- connectors ---------------------------------------------------------------

export const getConnectorSecret = (auth: Auth) =>
  serverApiFetch<{ connector_secret: string }>("/v1/connectors/email/secret", auth);

export const rotateConnectorSecret = (auth: Auth) =>
  serverApiFetch<{ connector_secret: string }>("/v1/connectors/email/secret", {
    ...auth,
    method: "POST",
  });

export type { FetchOptions };
