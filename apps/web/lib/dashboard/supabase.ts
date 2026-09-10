import "server-only";

import type {
  AssessmentInfo,
  DashboardFilters,
  DashboardStatusBreakdown,
  DashboardSummary,
  DocumentRecord,
  PlanInfo,
  TableInfo,
  UsageInfo,
} from "@mios/shared";
import { getClaims } from "@/lib/supabase/claims";
import { createClient } from "@/lib/supabase/server";

type Row = Record<string, unknown>;

const PLANS: Record<string, PlanInfo & { limits: Record<string, number> }> = {
  trial: {
    code: "trial",
    name: "Trial",
    price_usd: 0,
    limits: { chat_queries: 200, analytics_queries: 50, pages_ingested: 500 },
  },
  starter: {
    code: "starter",
    name: "Starter",
    price_usd: 99,
    limits: { chat_queries: 1500, analytics_queries: 300, pages_ingested: 2000 },
  },
  growth: {
    code: "growth",
    name: "Growth",
    price_usd: 299,
    limits: { chat_queries: -1, analytics_queries: -1, pages_ingested: 10000 },
  },
  enterprise: {
    code: "enterprise",
    name: "Enterprise",
    price_usd: 800,
    limits: { chat_queries: -1, analytics_queries: -1, pages_ingested: -1 },
  },
};

const PERIOD = new Date().toISOString().slice(0, 7);

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0) || 0;
}

function asBoolean(value: unknown) {
  return value === true;
}

function tone(key: string): DashboardStatusBreakdown["tone"] {
  if (["ready", "compliant"].includes(key)) return "ok";
  if (["processing", "partial", "unknown"].includes(key)) return "warn";
  if (["failed", "gap"].includes(key)) return "danger";
  return "neutral";
}

function breakdown(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .filter(([, count]) => count > 0)
    .map(([key, count]) => ({
      key,
      label: key.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
      count,
      tone: tone(key),
    }));
}

function documentOut(row: Row): DocumentRecord {
  return {
    id: asString(row.id),
    filename: asString(row.filename),
    doc_type: asString(row.doc_type, "other"),
    department: asString(row.department, "general"),
    language: asString(row.language, "en"),
    status: asString(row.status, "processing") as DocumentRecord["status"],
    page_count: asNumber(row.page_count),
    error: asString(row.error),
    created_at: asString(row.created_at),
  };
}

function assessmentOut(row: Row, items: Row[]): AssessmentInfo {
  const ownItems = items.filter((item) => item.assessment_id === row.id);
  const counts: Record<string, number> = {};
  for (const item of ownItems) {
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

function metricRow(data: unknown) {
  const row = (data && typeof data === "object" ? data : {}) as Row;
  const value = (...keys: string[]) => {
    for (const key of keys) if (row[key] !== undefined && row[key] !== null) return asNumber(row[key]);
    return 0;
  };
  return {
    date: asString(row.date ?? row.day ?? row.production_date),
    line: asString(row.line, "Unknown line"),
    output_qty: value("output_qty", "output", "qty", "quantity", "produced_units"),
    target_qty: value("target_qty", "target", "planned_units"),
    defects: value("defects", "defect_count", "rejects", "rejected_units"),
    downtime_min: value("downtime_min", "downtime", "downtime_minutes"),
  };
}

function metrics(rows: Row[]) {
  const total = { output_qty: 0, target_qty: 0, defects: 0, downtime_min: 0 };
  const byDate = new Map<string, typeof total>();
  const byLine = new Map<string, typeof total>();
  for (const raw of rows) {
    const row = metricRow(raw.data);
    const date = row.date || "undated";
    const line = row.line || "Unknown line";
    const dateBucket = byDate.get(date) ?? { ...total };
    const lineBucket = byLine.get(line) ?? { ...total };
    for (const key of Object.keys(total) as Array<keyof typeof total>) {
      total[key] += row[key];
      dateBucket[key] += row[key];
      lineBucket[key] += row[key];
    }
    byDate.set(date, dateBucket);
    byLine.set(line, lineBucket);
  }
  const withRate = (value: typeof total) => ({
    ...value,
    defect_rate: value.output_qty ? Number(((value.defects / value.output_qty) * 100).toFixed(2)) : 0,
  });
  const trend = [...byDate.entries()]
    .filter(([date]) => date !== "undated")
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([date, value]) => ({ date, ...withRate(value) }));
  const by_line = [...byLine.entries()]
    .sort((a, b) => b[1].output_qty - a[1].output_qty)
    .slice(0, 8)
    .map(([line, value]) => ({ line, ...withRate(value) }));
  return { ...withRate(total), trend, by_line };
}

async function read<T>(query: PromiseLike<{ data: T | null; error: { message: string } | null }>) {
  const result = await query;
  if (result.error) throw new Error(result.error.message);
  return result.data ?? ([] as T);
}

export async function fetchDashboardSummarySupabase(
  filters: Partial<DashboardFilters> = {},
): Promise<DashboardSummary> {
  const claims = await getClaims();
  if (!claims) throw new Error("Not authenticated");
  const supabase = await createClient();
  const [documents, tables, tableRows, insights, assessments, items, usage, tenant] = await Promise.all([
    read(supabase.from("documents").select("id,filename,doc_type,department,language,status,page_count,error,created_at").eq("tenant_id", claims.tenantId).order("created_at", { ascending: false })),
    read(supabase.from("table_sources").select("id,name,sheet_name,columns,row_count").eq("tenant_id", claims.tenantId).order("row_count", { ascending: false })),
    read(supabase.from("table_rows").select("data").eq("tenant_id", claims.tenantId).limit(5000)),
    read(supabase.from("knowledge_insights").select("document_id,model,modality,topics,language,chunk_count").eq("tenant_id", claims.tenantId)),
    read(supabase.from("assessments").select("id,title,template_code,due_date,status,created_at").eq("tenant_id", claims.tenantId).order("created_at", { ascending: false })),
    read(supabase.from("assessment_items").select("assessment_id,status,manually_set").eq("tenant_id", claims.tenantId)),
    read(supabase.from("monthly_usage").select("metric,used").eq("tenant_id", claims.tenantId).eq("period", PERIOD)),
    read(supabase.from("tenants").select("plan").eq("id", claims.tenantId).maybeSingle()),
  ]) as [Row[], Row[], Row[], Row[], Row[], Row[], Row[], Row | null];

  const documentRecords = documents.map(documentOut);
  const since = Date.now() - (filters.range_days ?? 30) * 86_400_000;
  const filteredDocuments = documentRecords.filter((document) => {
    const createdAt = Date.parse(document.created_at);
    return (
      (!filters.department || document.department === filters.department) &&
      (!filters.status || document.status === filters.status) &&
      (!Number.isFinite(createdAt) || createdAt >= since)
    );
  });
  const statuses = filteredDocuments.map((document) => document.status);
  const departments = documentRecords.map((document) => document.department).filter(Boolean);
  const filteredDocumentIds = new Set(filteredDocuments.map((document) => document.id));
  const filteredInsights = insights.filter((insight) => filteredDocumentIds.has(asString(insight.document_id)));
  const topics = filteredInsights.flatMap((insight) => Array.isArray(insight.topics)
    ? insight.topics.filter((topic): topic is string => typeof topic === "string")
    : []);
  const production = metrics(
    tableRows.filter((row) => !filters.line || metricRow(row.data).line === filters.line),
  );
  const plan = (PLANS[asString(tenant?.plan, "trial")] ?? PLANS.trial)!;
  const usageByMetric = Object.fromEntries(usage.map((row) => [asString(row.metric), asNumber(row.used)]));
  const usageInfo: UsageInfo = {
    plan: { code: plan.code, name: plan.name, price_usd: plan.price_usd },
    period: PERIOD,
    usage: usageByMetric,
    limits: plan.limits,
    estimated_minutes_saved: (usageByMetric.chat_queries ?? 0) * 3 + (usageByMetric.analytics_queries ?? 0) * 8,
  };
  const assessmentRecords = assessments.map((assessment) => assessmentOut(assessment, items));
  const itemStatuses = items.map((item) => asString(item.status, "pending"));
  const compliance = {
    assessment_count: assessments.length,
    open_assessments: assessments.filter((assessment) => asString(assessment.status) !== "complete").length,
    gap_count: itemStatuses.filter((status) => status === "gap").length,
    partial_count: itemStatuses.filter((status) => status === "partial").length,
    manually_set_count: items.filter((item) => asBoolean(item.manually_set)).length,
    status_breakdown: breakdown(itemStatuses),
    recent_assessments: assessmentRecords.slice(0, 5),
  };
  const tableInfos: TableInfo[] = tables.map((table) => ({
    id: asString(table.id),
    name: asString(table.name),
    sheet_name: asString(table.sheet_name),
    columns: Array.isArray(table.columns) ? table.columns as TableInfo["columns"] : [],
    row_count: asNumber(table.row_count),
  }));
  const filtersOut: DashboardFilters = {
    range_days: filters.range_days ?? 30,
    line: filters.line ?? "",
    department: filters.department ?? "",
    status: filters.status ?? "",
  };
  return {
    generated_at: new Date().toISOString(),
    filters: filtersOut,
    available_filters: {
      lines: production.by_line.map((line) => line.line),
      departments: [...new Set(departments)].sort(),
      statuses: ["ready", "processing", "failed"],
    },
    knowledge: {
      total_documents: filteredDocuments.length,
      ready_documents: statuses.filter((status) => status === "ready").length,
      processing_documents: statuses.filter((status) => status === "processing").length,
      failed_documents: statuses.filter((status) => status === "failed").length,
      page_count: filteredDocuments.reduce((sum, document) => sum + document.page_count, 0),
      total_chunks: filteredInsights.reduce((sum, insight) => sum + asNumber(insight.chunk_count), 0),
      analyzed_documents: filteredInsights.length,
      insight_coverage: filteredDocuments.length
        ? Number(((filteredInsights.length / filteredDocuments.length) * 100).toFixed(1))
        : 0,
      status_breakdown: breakdown(statuses),
      department_breakdown: breakdown(departments),
      type_breakdown: breakdown(filteredDocuments.map((document) => document.doc_type)),
      topic_breakdown: breakdown(topics).slice(0, 8),
      model_breakdown: breakdown(filteredInsights.map((insight) => asString(insight.model, "unknown"))),
      recent_documents: filteredDocuments.slice(0, 5),
    },
    analytics: {
      table_count: tableInfos.length,
      total_rows: tableInfos.reduce((sum, table) => sum + table.row_count, 0),
      largest_tables: tableInfos.slice(0, 5),
    },
    compliance,
    production,
    quality: {
      defect_count: production.defects,
      defect_rate: production.defect_rate,
      trend: production.trend,
      by_line: production.by_line,
    },
    usage: usageInfo,
  };
}
