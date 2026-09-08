/**
 * MIOS API contract — mirrors `apps/api/app/schemas.py` and the router response models.
 *
 * Shared between the Next.js app and any future TS consumer. Keep in lockstep with the
 * FastAPI OpenAPI document; `npm run gen:api` regenerates a checked copy in CI.
 */

export type Lang = "en" | "bn";

export const USER_ROLES = [
  "owner",
  "admin",
  "compliance_manager",
  "production_manager",
  "operator",
] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const DOC_STATUSES = ["processing", "ready", "failed"] as const;
export type DocStatus = (typeof DOC_STATUSES)[number];

export const ITEM_STATUSES = [
  "pending",
  "compliant",
  "partial",
  "gap",
  "unknown",
  "not_applicable",
] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

/** `apps/api/app/schemas.py::UserOut` */
export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
}

/** `apps/api/app/schemas.py::Citation` */
export interface Citation {
  document_id: string;
  document_name: string;
  page: number;
  chunk_index: number;
  snippet: string;
}

/** `apps/api/app/schemas.py::ChatOut` */
export interface ChatResponse {
  answer: string;
  citations: Citation[];
  provider: string;
}

/** `apps/api/app/schemas.py::DocumentOut` */
export interface DocumentRecord {
  id: string;
  filename: string;
  doc_type: string;
  department: string;
  language: string;
  status: DocStatus;
  page_count: number;
  error: string;
  created_at: string;
}

export interface TableColumn {
  name: string;
  type: string;
}

/** `apps/api/app/routers/analytics.py::TableOut` */
export interface TableInfo {
  id: string;
  name: string;
  sheet_name: string;
  columns: TableColumn[];
  row_count: number;
}

/** `apps/api/app/routers/analytics.py::QueryOut` */
export interface QueryResult {
  answer: string;
  sql: string;
  columns: string[];
  rows: Record<string, unknown>[];
  row_count: number;
}

/** `apps/api/app/routers/compliance.py::TemplateOut` */
export interface TemplateInfo {
  code: string;
  name: string;
  version: number;
  description: string;
  item_count: number;
}

/** `apps/api/app/routers/compliance.py::AssessmentOut` */
export interface AssessmentInfo {
  id: string;
  title: string;
  template_code: string;
  due_date: string;
  status: string;
  created_at: string;
  counts: Record<string, number>;
}

/** `apps/api/app/routers/compliance.py::ItemOut` */
export interface AssessmentItemRecord {
  id: string;
  ref: string;
  category: string;
  title: string;
  guidance: string;
  status: ItemStatus;
  manually_set: boolean;
  ai_notes: string;
  cap_text: string;
  evidence: Citation[];
}

export interface PlanInfo {
  code: string;
  name: string;
  price_usd: number;
}

/** `apps/api/app/routers/tenant.py::UsageOut` */
export interface UsageInfo {
  plan: PlanInfo;
  period: string;
  usage: Record<string, number>;
  limits: Record<string, number>;
  estimated_minutes_saved: number;
}

/** `apps/api/app/routers/guest.py::GuestTokenOut` */
export interface GuestTokenInfo {
  token: string;
  label: string;
  expires_at: string;
  scope_all_documents: boolean;
  document_ids: string[];
}

/** Shape returned by `GET /v1/guest/documents` (plain dicts, not a response model) */
export interface GuestDocument {
  id: string;
  filename: string;
  doc_type: string;
  department: string;
  page_count: number;
  created_at: string;
}

/** `apps/api/app/routers/payments.py::PaymentOut` */
export interface PaymentRecord {
  id: string;
  provider: string;
  invoice_no: string;
  plan: string;
  months: number;
  amount_bdt: number;
  status: string;
  created_at: string;
  completed_at: string | null;
}

// ---------------------------------------------------------------------------
// Server-sent event frames. One discriminated union per streaming endpoint.
// Producers: chat.py::chat_stream, analytics.py::run_query_stream,
// compliance.py::auto_assess (+ copilot.py::judge_item).
// ---------------------------------------------------------------------------

export type ChatFrame =
  | { type: "citations"; citations: Citation[] }
  | { type: "token"; value: string }
  | { type: "done" };

export type AnalyticsFrame =
  | { type: "sql"; sql: string }
  | { type: "rows"; count: number; preview: Record<string, unknown>[] }
  | { type: "token"; value: string }
  | { type: "done" };

export type AutoAssessFrame =
  | { type: "start"; total: number }
  | { type: "progress"; ref: string }
  | { type: "verdict"; ref: string; status: ItemStatus }
  | { type: "error"; ref: string; detail: string }
  | { type: "done"; status: string };

/** Metric keys used by `apps/api/app/services/plans.py`. */
export const USAGE_METRICS = ["chat_queries", "analytics_queries", "pages_ingested"] as const;
export type UsageMetric = (typeof USAGE_METRICS)[number];

// ---------------------------------------------------------------------------
// Dashboard payloads. Producer: apps/api/app/routers/dashboard.py.
// ---------------------------------------------------------------------------

export interface DashboardFilters {
  range_days: number;
  line: string;
  department: string;
  status: "" | DocStatus;
}

export interface DashboardStatusBreakdown {
  key: string;
  label: string;
  count: number;
  tone: "neutral" | "ok" | "warn" | "danger" | "accent";
}

export interface DashboardTrendPoint {
  date: string;
  output_qty: number;
  target_qty: number;
  defects: number;
  downtime_min: number;
  defect_rate: number;
}

export interface ProductionLineMetric {
  line: string;
  output_qty: number;
  target_qty: number;
  defects: number;
  downtime_min: number;
  defect_rate: number;
}

export interface KnowledgeDashboardMetrics {
  total_documents: number;
  ready_documents: number;
  processing_documents: number;
  failed_documents: number;
  page_count: number;
  status_breakdown: DashboardStatusBreakdown[];
  department_breakdown: DashboardStatusBreakdown[];
  recent_documents: DocumentRecord[];
}

export interface AnalyticsDashboardMetrics {
  table_count: number;
  total_rows: number;
  largest_tables: TableInfo[];
}

export interface ComplianceDashboardMetrics {
  assessment_count: number;
  open_assessments: number;
  gap_count: number;
  partial_count: number;
  manually_set_count: number;
  status_breakdown: DashboardStatusBreakdown[];
  recent_assessments: AssessmentInfo[];
}

export interface ProductionDashboardMetrics {
  output_qty: number;
  target_qty: number;
  defects: number;
  downtime_min: number;
  defect_rate: number;
  trend: DashboardTrendPoint[];
  by_line: ProductionLineMetric[];
}

export interface QualityDashboardMetrics {
  defect_count: number;
  defect_rate: number;
  trend: DashboardTrendPoint[];
  by_line: ProductionLineMetric[];
}

export interface DashboardSummary {
  generated_at: string;
  filters: DashboardFilters;
  available_filters: {
    lines: string[];
    departments: string[];
    statuses: DocStatus[];
  };
  knowledge: KnowledgeDashboardMetrics;
  analytics: AnalyticsDashboardMetrics;
  compliance: ComplianceDashboardMetrics;
  production: ProductionDashboardMetrics;
  quality: QualityDashboardMetrics;
  usage: UsageInfo | null;
}

