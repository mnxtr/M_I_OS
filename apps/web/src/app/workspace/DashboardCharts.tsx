
import { ReactNode, useId } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { DashboardSnapshot } from "@/lib/dashboard";
import { Lang, t } from "@/lib/i18n";

import type { WorkspaceView } from "./DashboardOverview";

const COLORS: Record<string, string> = {
  actual: "#70a5ff",
  target: "#9fb4d1",
  good: "#70a5ff",
  compliant: "#70a5ff",
  ready: "#70a5ff",
  completed: "#70a5ff",
  warning: "#efbd68",
  partial: "#efbd68",
  processing: "#9fb4d1",
  expiring: "#efbd68",
  overdue: "#ff8f9e",
  gap: "#ff8f9e",
  failed: "#ff8f9e",
  unknown: "#8491a6",
  stale: "#d8a95d",
  superseded: "#8491a6",
  draft: "#8491a6",
  "pending approval": "#efbd68",
  "in progress": "#9fb4d1",
};

interface DashboardChartsProps {
  dashboard: DashboardSnapshot;
  lang: Lang;
  onNavigate: (view: WorkspaceView) => void;
}

export default function DashboardCharts({ dashboard, lang, onNavigate }: DashboardChartsProps) {
  const tr = t(lang);
  const locale = lang === "bn" ? "bn-BD" : "en-GB";

  return (
    <div className="dashboard-chart-grid">
      {dashboard.production_series ? (
        <ChartCard
          title={tr.productionTrend}
          insight={tr.productionInsight}
          action={tr.askProduction}
          onAction={() => onNavigate("analytics")}
          table={
            <ChartTable
              caption={tr.productionTrend}
              columns={[tr.period, tr.actual, tr.target]}
              rows={dashboard.production_series.map((point) => [
                point.label,
                point.actual.toLocaleString(locale),
                point.target.toLocaleString(locale),
              ])}
              filename="mios-production-trend.csv"
              downloadLabel={tr.downloadCsv}
              rawDataLabel={tr.rawData}
            />
          }
        >
          <AppChart label={tr.productionTrend}>
            <ComposedChart data={dashboard.production_series} margin={{ top: 8, right: 10, left: 2, bottom: 2 }}>
              <CartesianGrid stroke="#202d3e" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis tickLine={false} axisLine={false} fontSize={11} width={48} />
              <ChartTooltip />
              <Bar dataKey="actual" name={tr.actual} fill={COLORS.actual} radius={[4, 4, 0, 0]} />
              <Line dataKey="target" name={tr.target} stroke={COLORS.target} strokeWidth={2} dot={false} />
            </ComposedChart>
          </AppChart>
          <ChartLegend items={[[tr.actual, COLORS.actual], [tr.target, COLORS.target]]} />
        </ChartCard>
      ) : null}

      {dashboard.line_rankings ? (
        <ChartCard
          title={tr.linePerformance}
          insight={tr.lineInsight}
          action={tr.askProduction}
          onAction={() => onNavigate("analytics")}
          table={
            <ChartTable
              caption={tr.linePerformance}
              columns={[tr.line, tr.attainment, tr.lostOutput]}
              rows={dashboard.line_rankings.map((row) => [row.line, `${row.attainment}%`, row.lost_output.toLocaleString(locale)])}
              filename="mios-line-performance.csv"
              downloadLabel={tr.downloadCsv}
              rawDataLabel={tr.rawData}
            />
          }
        >
          <AppChart label={tr.linePerformance}>
            <BarChart data={dashboard.line_rankings} layout="vertical" margin={{ top: 8, right: 18, left: 12, bottom: 2 }}>
              <CartesianGrid stroke="#202d3e" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} unit="%" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis dataKey="line" type="category" width={58} tickLine={false} axisLine={false} fontSize={11} />
              <ChartTooltip />
              <Bar dataKey="attainment" name={tr.attainment} radius={[0, 4, 4, 0]}>
                {dashboard.line_rankings.map((row) => (
                  <Cell key={row.line} fill={row.attainment < 90 ? COLORS.overdue : row.attainment < 95 ? COLORS.warning : COLORS.good} />
                ))}
              </Bar>
            </BarChart>
          </AppChart>
        </ChartCard>
      ) : null}

      {dashboard.quality_pareto ? (
        <ChartCard
          title={tr.qualityPareto}
          insight={tr.qualityInsight}
          action={tr.askProduction}
          onAction={() => onNavigate("analytics")}
          table={
            <ChartTable
              caption={tr.qualityPareto}
              columns={[tr.category, tr.count, tr.cumulative]}
              rows={dashboard.quality_pareto.map((row) => [row.category, row.count, `${row.cumulative_pct}%`])}
              filename="mios-quality-pareto.csv"
              downloadLabel={tr.downloadCsv}
              rawDataLabel={tr.rawData}
            />
          }
        >
          <AppChart label={tr.qualityPareto}>
            <BarChart data={dashboard.quality_pareto} margin={{ top: 8, right: 8, left: 0, bottom: 38 }}>
              <CartesianGrid stroke="#202d3e" vertical={false} />
              <XAxis dataKey="category" angle={-24} textAnchor="end" height={62} interval={0} tickLine={false} axisLine={false} fontSize={10} />
              <YAxis tickLine={false} axisLine={false} fontSize={11} width={35} />
              <ChartTooltip />
              <Bar dataKey="count" name={tr.count} fill={COLORS.warning} radius={[4, 4, 0, 0]} />
            </BarChart>
          </AppChart>
        </ChartCard>
      ) : null}

      {dashboard.compliance_coverage ? (
        <StatusChartCard
          title={tr.complianceReadiness}
          insight={tr.complianceInsight}
          data={dashboard.compliance_coverage}
          lang={lang}
          onAction={() => onNavigate("compliance")}
          action={tr.startAssessment}
          filename="mios-compliance-readiness.csv"
        />
      ) : null}

      {dashboard.maintenance_health ? (
        <ChartCard
          title={tr.maintenanceHealth}
          insight={tr.maintenanceInsight}
          table={
            <ChartTable
              caption={tr.maintenanceHealth}
              columns={[tr.category, tr.planned, tr.completed, tr.overdue]}
              rows={dashboard.maintenance_health.map((row) => [row.category, row.planned, row.completed, row.overdue])}
              filename="mios-maintenance-health.csv"
              downloadLabel={tr.downloadCsv}
              rawDataLabel={tr.rawData}
            />
          }
        >
          <AppChart label={tr.maintenanceHealth}>
            <BarChart data={dashboard.maintenance_health} margin={{ top: 8, right: 8, left: 0, bottom: 2 }}>
              <CartesianGrid stroke="#202d3e" vertical={false} />
              <XAxis dataKey="category" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis tickLine={false} axisLine={false} fontSize={11} width={35} />
              <ChartTooltip />
              <Bar dataKey="planned" name={tr.planned} fill="#64748b" radius={[3, 3, 0, 0]} />
              <Bar dataKey="completed" name={tr.completed} fill={COLORS.completed} radius={[3, 3, 0, 0]} />
              <Bar dataKey="overdue" name={tr.overdue} fill={COLORS.overdue} radius={[3, 3, 0, 0]} />
            </BarChart>
          </AppChart>
          <ChartLegend items={[[tr.planned, "#64748b"], [tr.completed, COLORS.completed], [tr.overdue, COLORS.overdue]]} />
        </ChartCard>
      ) : null}

      {dashboard.action_pipeline ? (
        <StatusChartCard
          title={tr.actionPipeline}
          insight={tr.actionInsight}
          data={dashboard.action_pipeline}
          lang={lang}
          onAction={() => onNavigate("compliance")}
          action={tr.viewKnowledge}
          filename="mios-action-pipeline.csv"
        />
      ) : null}

      <StatusChartCard
        title={tr.evidenceHealth}
        insight={tr.evidenceInsight}
        data={dashboard.evidence_health}
        lang={lang}
        onAction={() => onNavigate("knowledge")}
        action={tr.viewKnowledge}
        filename="mios-evidence-health.csv"
      />
    </div>
  );
}

export function AppChart({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="app-chart" role="img" aria-label={label} tabIndex={0}>
      <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
    </div>
  );
}

export function ChartCard({
  title,
  insight,
  action,
  onAction,
  children,
  table,
}: {
  title: string;
  insight: string;
  action?: string;
  onAction?: () => void;
  children: ReactNode;
  table: ReactNode;
}) {
  const headingId = useId();
  return (
    <section className="chart-card" aria-labelledby={headingId}>
      <div className="chart-card-heading">
        <div>
          <h2 id={headingId}>{title}</h2>
          <p>{insight}</p>
        </div>
        {action && onAction ? <button className="text-button" onClick={onAction}>{action}</button> : null}
      </div>
      {children}
      {table}
    </section>
  );
}

export function ChartLegend({ items }: { items: [string, string][] }) {
  return (
    <ul className="chart-legend" aria-label="Chart legend">
      {items.map(([label, color]) => <li key={label}><span style={{ background: color }} />{label}</li>)}
    </ul>
  );
}

export function ChartTooltip() {
  return <Tooltip cursor={{ fill: "rgba(120,167,255,0.08)" }} contentStyle={{ borderRadius: 8, borderColor: "#34455e", fontSize: 12 }} />;
}

export function ChartTable({
  caption,
  columns,
  rows,
  filename,
  downloadLabel,
  rawDataLabel,
}: {
  caption: string;
  columns: string[];
  rows: (string | number)[][];
  filename: string;
  downloadLabel: string;
  rawDataLabel: string;
}) {
  return (
    <details className="chart-table">
      <summary>{rawDataLabel}</summary>
      <button className="text-button chart-download" onClick={() => downloadCsv(filename, columns, rows)}>{downloadLabel}</button>
      <div className="table-scroll" tabIndex={0}>
        <table>
          <caption className="sr-only">{caption}</caption>
          <thead><tr>{columns.map((column) => <th scope="col" key={column}>{column}</th>)}</tr></thead>
          <tbody>{rows.map((row, rowIndex) => <tr key={`${filename}-${rowIndex}`}>{row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </details>
  );
}

function StatusChartCard({ title, insight, data, lang, onAction, action, filename }: {
  title: string;
  insight: string;
  data: { status: string; value: number }[];
  lang: Lang;
  onAction: () => void;
  action: string;
  filename: string;
}) {
  const tr = t(lang);
  return (
    <ChartCard
      title={title}
      insight={insight}
      action={action}
      onAction={onAction}
      table={<ChartTable caption={title} columns={[tr.status, tr.value]} rows={data.map((row) => [humanize(row.status), row.value])} filename={filename} downloadLabel={tr.downloadCsv} rawDataLabel={tr.rawData} />}
    >
      <AppChart label={title}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 30 }}>
          <CartesianGrid stroke="#202d3e" vertical={false} />
          <XAxis dataKey="status" tickFormatter={humanize} angle={-18} textAnchor="end" height={52} interval={0} tickLine={false} axisLine={false} fontSize={10} />
          <YAxis tickLine={false} axisLine={false} fontSize={11} width={35} />
          <ChartTooltip />
          <Bar dataKey="value" name={tr.value} radius={[4, 4, 0, 0]}>
            {data.map((row) => <Cell key={row.status} fill={COLORS[row.status] || COLORS.unknown} />)}
          </Bar>
        </BarChart>
      </AppChart>
    </ChartCard>
  );
}

function humanize(value: string): string {
  return value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

function downloadCsv(filename: string, columns: string[], rows: (string | number)[][]): void {
  const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
  const csv = [columns, ...rows].map((row) => row.map(escape).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
