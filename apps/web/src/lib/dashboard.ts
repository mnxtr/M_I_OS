export type MetricStatus = "good" | "warning" | "critical" | "neutral";

export interface DashboardFactory {
  id: string;
  name: string;
  timezone: string;
  currency: string;
}

export interface KpiMetric {
  key: string;
  value: number;
  unit: string;
  target: number | null;
  delta: number;
  status: MetricStatus;
  module: string;
}

export interface ProductionPoint {
  label: string;
  actual: number;
  target: number;
  reject_rate: number;
  downtime: number;
}

export interface DashboardSnapshot {
  context: {
    factory: DashboardFactory;
    factories: DashboardFactory[];
    role: string;
    capabilities: string[];
    date_from: string;
    date_to: string;
    granularity: string;
    line_id: string | null;
    shift: string | null;
    available_lines: string[];
    available_shifts: string[];
  };
  generated_at: string;
  seeded_demo: boolean;
  kpis: KpiMetric[];
  production_series: ProductionPoint[] | null;
  line_rankings: { line: string; attainment: number; lost_output: number }[] | null;
  quality_pareto: { category: string; count: number; cumulative_pct: number }[] | null;
  compliance_coverage: { status: string; value: number }[] | null;
  maintenance_health: {
    category: string;
    planned: number;
    completed: number;
    overdue: number;
  }[] | null;
  action_pipeline: { status: string; value: number }[] | null;
  evidence_health: { status: string; value: number }[];
  freshness: { source: string; updated_at: string; status: "fresh" | "stale" | "missing" }[];
  warnings: string[];
}

export interface DashboardFilters {
  factoryId?: string;
  from?: string;
  to?: string;
  granularity?: "day" | "shift" | "line";
  lineId?: string;
  shift?: string;
}

export function createSeededDashboard(filters: DashboardFilters = {}): DashboardSnapshot {
  const to = filters.to ? new Date(`${filters.to}T00:00:00`) : new Date();
  const from = filters.from ? new Date(`${filters.from}T00:00:00`) : addDays(to, -6);
  const dayCount = Math.max(1, Math.min(31, daysBetween(from, to) + 1));
  const productionSeries = Array.from({ length: dayCount }, (_, index) => {
    const current = addDays(from, index);
    const wave = Math.sin(index * 1.17) * 260;
    const target = 8200 + (index % 3) * 120;
    return {
      label: current.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
      actual: Math.round(target * (0.91 + (index % 5) * 0.015) + wave),
      target,
      reject_rate: Number((2.1 + (index % 4) * 0.35).toFixed(1)),
      downtime: Math.round(32 + (index % 3) * 11 + Math.abs(wave) / 40),
    };
  });
  const actualTotal = productionSeries.reduce((sum, point) => sum + point.actual, 0);
  const targetTotal = productionSeries.reduce((sum, point) => sum + point.target, 0);
  const attainment = Number(((actualTotal / targetTotal) * 100).toFixed(1));
  const defectCounts = [37, 24, 18, 12, 7];
  let defectRunningTotal = 0;
  const qualityPareto = [
    "Broken stitch",
    "Oil mark",
    "Measurement",
    "Needle mark",
    "Shade variation",
  ].map((category, index) => {
    defectRunningTotal += defectCounts[index];
    return {
      category,
      count: defectCounts[index],
      cumulative_pct: Number(((defectRunningTotal / 98) * 100).toFixed(1)),
    };
  });
  const now = new Date().toISOString();
  const factory = {
    id: filters.factoryId || "pilot-factory",
    name: "Meghna Apparels — Pilot",
    timezone: "Asia/Dhaka",
    currency: "BDT",
  };

  return {
    context: {
      factory,
      factories: [factory],
      role: "owner",
      capabilities: ["dashboard", "production", "quality", "compliance", "maintenance", "actions", "evidence"],
      date_from: formatDate(from),
      date_to: formatDate(to),
      granularity: filters.granularity || "day",
      line_id: filters.lineId || null,
      shift: filters.shift || null,
      available_lines: ["Line 01", "Line 02", "Line 03", "Line 04", "Line 05"],
      available_shifts: ["Morning", "Evening", "Night"],
    },
    generated_at: now,
    seeded_demo: true,
    kpis: [
      { key: "output", value: actualTotal, unit: "pcs", target: targetTotal, delta: 3.8, status: attainment >= 95 ? "good" : "warning", module: "production" },
      { key: "attainment", value: attainment, unit: "%", target: 100, delta: 1.9, status: attainment >= 95 ? "good" : "warning", module: "production" },
      { key: "reject_rate", value: 2.6, unit: "%", target: 2, delta: -0.4, status: "warning", module: "quality" },
      { key: "downtime", value: 284, unit: "min", target: 250, delta: -8.2, status: "warning", module: "maintenance" },
      { key: "compliance_gaps", value: 10, unit: "open", target: 0, delta: -2, status: "critical", module: "compliance" },
      { key: "overdue_actions", value: 5, unit: "tasks", target: 0, delta: -1, status: "warning", module: "actions" },
      { key: "time_saved", value: 101, unit: "min", target: null, delta: 18, status: "neutral", module: "dashboard" },
    ],
    production_series: productionSeries,
    line_rankings: [
      { line: "Line 03", attainment: 98.4, lost_output: 120 },
      { line: "Line 01", attainment: 96.1, lost_output: 280 },
      { line: "Line 05", attainment: 93.8, lost_output: 510 },
      { line: "Line 02", attainment: 89.5, lost_output: 860 },
      { line: "Line 04", attainment: 84.2, lost_output: 1310 },
    ],
    quality_pareto: qualityPareto,
    compliance_coverage: [
      { status: "compliant", value: 42 },
      { status: "partial", value: 11 },
      { status: "gap", value: 6 },
      { status: "unknown", value: 4 },
      { status: "expiring", value: 3 },
    ],
    maintenance_health: [
      { category: "Preventive", planned: 28, completed: 23, overdue: 3 },
      { category: "Electrical", planned: 12, completed: 10, overdue: 1 },
      { category: "Mechanical", planned: 16, completed: 12, overdue: 4 },
    ],
    action_pipeline: [
      { status: "draft", value: 4 },
      { status: "pending approval", value: 6 },
      { status: "in progress", value: 11 },
      { status: "overdue", value: 5 },
      { status: "completed", value: 24 },
    ],
    evidence_health: [
      { status: "ready", value: 6 },
      { status: "processing", value: 0 },
      { status: "failed", value: 0 },
      { status: "stale", value: 1 },
      { status: "superseded", value: 0 },
    ],
    freshness: [
      { source: "Production & line performance", updated_at: now, status: "fresh" },
      { source: "Compliance evidence", updated_at: now, status: "fresh" },
      { source: "Maintenance schedule", updated_at: now, status: "fresh" },
    ],
    warnings: ["seeded_demo_data"],
  };
}

function addDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

function formatDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}
