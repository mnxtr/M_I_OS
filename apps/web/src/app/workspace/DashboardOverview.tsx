"use client";

import dynamic from "next/dynamic";

import type { DashboardFilters, DashboardSnapshot, KpiMetric } from "@/lib/dashboard";
import { Lang, t } from "@/lib/i18n";

export type WorkspaceView = "overview" | "chat" | "compliance" | "analytics" | "knowledge";

const DashboardCharts = dynamic(() => import("./DashboardCharts"), {
  loading: () => <div className="dashboard-loading" aria-live="polite">Loading charts…</div>,
  ssr: false,
});

interface DashboardOverviewProps {
  dashboard: DashboardSnapshot | null;
  filters: DashboardFilters;
  loading: boolean;
  error: string;
  lang: Lang;
  onFiltersChange: (filters: DashboardFilters) => void;
  onRefresh: () => void;
  onNavigate: (view: WorkspaceView) => void;
}

export default function DashboardOverview({
  dashboard,
  filters,
  loading,
  error,
  lang,
  onFiltersChange,
  onRefresh,
  onNavigate,
}: DashboardOverviewProps) {
  const tr = t(lang);
  const locale = lang === "bn" ? "bn-BD" : "en-GB";

  return (
    <div className="workspace-view overview-view">
      <section className="hero-panel command-hero">
        <div>
          <p className="eyebrow">{tr.overviewEyebrow}</p>
          <h1>{tr.overviewTitle}</h1>
          <p>{tr.overviewCopy}</p>
        </div>
        {dashboard ? (
          <div className="dashboard-meta">
            {dashboard.seeded_demo ? <span className="data-mode-badge">{tr.seededData}</span> : null}
            <span>{tr.lastRefreshed} {formatDateTime(dashboard.generated_at, locale)}</span>
          </div>
        ) : null}
      </section>

      <DashboardFilterBar dashboard={dashboard} filters={filters} loading={loading} lang={lang} onChange={onFiltersChange} onRefresh={onRefresh} />
      <div className="sr-only" aria-live="polite">{loading ? tr.dashboardLoading : dashboard ? `${tr.lastRefreshed} ${formatDateTime(dashboard.generated_at, locale)}` : ""}</div>
      {error ? <div className="global-alert" role="alert">{tr.dashboardError} {error}</div> : null}
      {dashboard?.warnings.length ? <div className="data-warning" role="status">{tr.partialData}</div> : null}
      {loading && !dashboard ? <DashboardSkeleton label={tr.dashboardLoading} /> : null}
      {dashboard ? (
        <>
          <section className="kpi-grid" aria-label={tr.workspacePulse}>
            {dashboard.kpis.map((metric) => <KpiCard key={metric.key} metric={metric} lang={lang} onOpen={() => onNavigate(moduleView(metric.module))} />)}
          </section>
          <DashboardCharts dashboard={dashboard} lang={lang} onNavigate={onNavigate} />
          <FreshnessPanel dashboard={dashboard} lang={lang} />
        </>
      ) : null}
    </div>
  );
}

function DashboardFilterBar({ dashboard, filters, loading, lang, onChange, onRefresh }: {
  dashboard: DashboardSnapshot | null;
  filters: DashboardFilters;
  loading: boolean;
  lang: Lang;
  onChange: (filters: DashboardFilters) => void;
  onRefresh: () => void;
}) {
  const tr = t(lang);
  const activePreset = inferPreset(filters.from, filters.to);
  const setPreset = (days: number) => {
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - days + 1);
    onChange({ ...filters, from: isoDate(from), to: isoDate(to) });
  };

  return (
    <section className="dashboard-filter-bar" aria-label={tr.dashboardFilters}>
      <label className="field-label compact-filter"><span>{tr.factory}</span><select value={filters.factoryId || dashboard?.context.factory.id || ""} onChange={(event) => onChange({ ...filters, factoryId: event.target.value })}>{(dashboard?.context.factories || []).map((factory) => <option key={factory.id} value={factory.id}>{factory.name}</option>)}</select></label>
      <div className="period-control"><span>{tr.period}</span><div className="preset-buttons"><button className={activePreset === 1 ? "is-active" : ""} aria-pressed={activePreset === 1} onClick={() => setPreset(1)}>{tr.today}</button><button className={activePreset === 7 ? "is-active" : ""} aria-pressed={activePreset === 7} onClick={() => setPreset(7)}>{tr.sevenDays}</button><button className={activePreset === 30 ? "is-active" : ""} aria-pressed={activePreset === 30} onClick={() => setPreset(30)}>{tr.thirtyDays}</button></div></div>
      <label className="field-label compact-filter"><span>{tr.line}</span><select value={filters.lineId || ""} onChange={(event) => onChange({ ...filters, lineId: event.target.value || undefined })}><option value="">{tr.allLines}</option>{dashboard?.context.available_lines.map((line) => <option key={line}>{line}</option>)}</select></label>
      <label className="field-label compact-filter"><span>{tr.shift}</span><select value={filters.shift || ""} onChange={(event) => onChange({ ...filters, shift: event.target.value || undefined })}><option value="">{tr.allShifts}</option>{dashboard?.context.available_shifts.map((shift) => <option key={shift}>{shift}</option>)}</select></label>
      <button className="btn btn-secondary dashboard-refresh" disabled={loading} onClick={onRefresh}>{loading ? tr.pleaseWait : tr.refresh}</button>
    </section>
  );
}

function KpiCard({ metric, lang, onOpen }: { metric: KpiMetric; lang: Lang; onOpen: () => void }) {
  const tr = t(lang);
  const locale = lang === "bn" ? "bn-BD" : "en-GB";
  const labels: Record<string, string> = { output: lang === "bn" ? "আউটপুট" : "Output units", attainment: tr.attainment, reject_rate: lang === "bn" ? "রিজেক্ট হার" : "Reject rate", downtime: lang === "bn" ? "ডাউনটাইম" : "Downtime", compliance_gaps: lang === "bn" ? "কমপ্লায়েন্স ঘাটতি" : "Compliance gaps", overdue_actions: tr.overdue, time_saved: tr.expertTimeSaved };
  return (
    <button className={`kpi-card status-${metric.status}`} onClick={onOpen} aria-label={`${labels[metric.key] || metric.key}: ${metric.value} ${metric.unit}`}>
      <span>{labels[metric.key] || metric.key}</span>
      <strong>{metric.value.toLocaleString(locale)} <small>{metric.unit}</small></strong>
      <span className="kpi-detail"><i className={metric.delta >= 0 ? "delta-up" : "delta-down"}>{metric.delta >= 0 ? "+" : ""}{metric.delta}%</i>{metric.target !== null ? `${tr.target} ${metric.target.toLocaleString(locale)}` : tr.comparison}</span>
    </button>
  );
}

function FreshnessPanel({ dashboard, lang }: { dashboard: DashboardSnapshot; lang: Lang }) {
  const tr = t(lang);
  const locale = lang === "bn" ? "bn-BD" : "en-GB";
  return <section className="freshness-panel" aria-labelledby="freshness-title"><div><p className="eyebrow">{tr.evidenceHealth}</p><h2 id="freshness-title">{tr.lastRefreshed}</h2></div><ul>{dashboard.freshness.map((source) => <li key={source.source}><span className={`freshness-dot status-${source.status}`} /><strong>{source.source}</strong><time dateTime={source.updated_at}>{formatDateTime(source.updated_at, locale)}</time></li>)}</ul></section>;
}

function DashboardSkeleton({ label }: { label: string }) {
  return <div className="dashboard-skeleton" role="status"><span /><span /><span /><p>{label}</p></div>;
}

function moduleView(module: string): WorkspaceView {
  if (module === "compliance" || module === "actions") return "compliance";
  if (module === "evidence") return "knowledge";
  if (module === "production" || module === "quality" || module === "maintenance") return "analytics";
  return "overview";
}

function formatDateTime(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function isoDate(value: Date): string { return value.toISOString().slice(0, 10); }

function inferPreset(from?: string, to?: string): number {
  if (!from || !to) return 7;
  return Math.round((new Date(`${to}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime()) / 86_400_000) + 1;
}

export function StatusBadge({ status, lang }: { status: string; lang: Lang }) {
  const tr = t(lang);
  const label = status === "ready" ? tr.ready : status === "failed" ? tr.failed : tr.processing;
  return <span className={`status-badge status-${status}`}>{label}</span>;
}
