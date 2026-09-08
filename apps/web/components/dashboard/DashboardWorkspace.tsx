"use client";

import * as React from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import type {
  DashboardFilters,
  DashboardStatusBreakdown,
  DashboardSummary,
  DashboardTrendPoint,
  ProductionLineMetric,
} from "@mios/shared";
import { fetchDashboardSummary } from "@/lib/api";
import { getClientToken } from "@/lib/api/token";
import { ApiError } from "@/lib/api/fetcher";
import { formatInteger, formatRelative } from "@/lib/format";
import { useT } from "@/lib/i18n/useT";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import {
  Badge,
  EmptyState,
  ErrorBanner,
  Muted,
  Panel,
  PanelDescription,
  PanelHeader,
  PanelTitle,
  Skeleton,
} from "@/components/ui/panel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrapper,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/primitives";

export function DashboardWorkspace({ initialSummary }: { initialSummary: DashboardSummary }) {
  const { t, lang } = useT();
  const [summary, setSummary] = React.useState(initialSummary);
  const [filters, setFilters] = React.useState<DashboardFilters>(initialSummary.filters);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  async function refresh(nextFilters = filters) {
    setBusy(true);
    setError("");
    try {
      const token = await getClientToken();
      const next = await fetchDashboardSummary({ token }, nextFilters);
      setSummary(next);
      setFilters(next.filters);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.localized(t) : t.common.unknownError);
    } finally {
      setBusy(false);
    }
  }

  function update<K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]) {
    const nextFilters = { ...filters, [key]: value };
    setFilters(nextFilters);
    void refresh(nextFilters);
  }

  const production = summary.production;
  const usage = summary.usage;

  return (
    <div className="grid gap-5">
      <Panel>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <PanelTitle>{t.dashboard.filters}</PanelTitle>
            <PanelDescription>{t.dashboard.updated(formatRelative(summary.generated_at, lang))}</PanelDescription>
          </div>
          <div className="grid flex-1 gap-2 sm:grid-cols-2 lg:max-w-3xl lg:grid-cols-4">
            <Select
              value={String(filters.range_days)}
              onChange={(event) => update("range_days", Number(event.target.value))}
              aria-label={t.dashboard.range}
            >
              <option value="7">{t.dashboard.last7}</option>
              <option value="30">{t.dashboard.last30}</option>
              <option value="90">{t.dashboard.last90}</option>
              <option value="365">{t.dashboard.last365}</option>
            </Select>
            <Select
              value={filters.line}
              onChange={(event) => update("line", event.target.value)}
              aria-label={t.dashboard.line}
            >
              <option value="">{t.dashboard.allLines}</option>
              {summary.available_filters.lines.map((line) => (
                <option key={line} value={line}>
                  {line}
                </option>
              ))}
            </Select>
            <Select
              value={filters.department}
              onChange={(event) => update("department", event.target.value)}
              aria-label={t.dashboard.department}
            >
              <option value="">{t.dashboard.allDepartments}</option>
              {summary.available_filters.departments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </Select>
            <div className="flex gap-2">
              <Select
                value={filters.status}
                onChange={(event) => update("status", event.target.value as DashboardFilters["status"])}
                aria-label={t.dashboard.status}
              >
                <option value="">{t.dashboard.allStatuses}</option>
                {summary.available_filters.statuses.map((status) => (
                  <option key={status} value={status}>
                    {t.knowledge[status]}
                  </option>
                ))}
              </Select>
              <Button type="button" variant="ghost" onClick={() => void refresh()} disabled={busy}>
                <RefreshCw className="size-4" />
                <span className="sr-only">{t.common.retry}</span>
              </Button>
            </div>
          </div>
        </div>
      </Panel>

      <ErrorBanner>{error}</ErrorBanner>

      {busy ? <DashboardSkeleton /> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title={t.dashboard.output} value={formatInteger(production.output_qty, lang)} detail={t.dashboard.target(formatInteger(production.target_qty, lang))} />
        <MetricCard title={t.dashboard.downtime} value={formatInteger(production.downtime_min, lang)} detail={t.dashboard.minutes} tone="warn" />
        <MetricCard title={t.dashboard.defectRate} value={`${production.defect_rate}%`} detail={t.dashboard.defects(formatInteger(production.defects, lang))} tone={production.defect_rate > 2 ? "danger" : "ok"} />
        <MetricCard title={t.dashboard.minutesSaved} value={formatInteger(usage?.estimated_minutes_saved ?? 0, lang)} detail={usage ? usage.plan.name : t.common.loading} tone="accent" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel>
          <PanelHeader>
            <div>
              <PanelTitle>{t.dashboard.productionTrend}</PanelTitle>
              <PanelDescription>{t.dashboard.productionTrendBody}</PanelDescription>
            </div>
            <Badge tone="accent">{summary.analytics.table_count} {t.analytics.tablesAvailable.toLowerCase()}</Badge>
          </PanelHeader>
          {production.trend.length > 0 ? (
            <TrendChart points={production.trend} />
          ) : (
            <EmptyState className="border-0 py-10" title={t.dashboard.noProductionData} body={t.analytics.emptyBody} />
          )}
        </Panel>

        <Panel>
          <PanelHeader>
            <div>
              <PanelTitle>{t.dashboard.outputByLine}</PanelTitle>
              <PanelDescription>{t.dashboard.outputByLineBody}</PanelDescription>
            </div>
          </PanelHeader>
          {production.by_line.length > 0 ? (
            <LineBars lines={production.by_line} />
          ) : (
            <EmptyState className="border-0 py-10" title={t.dashboard.noLineData} body={t.analytics.emptyBody} />
          )}
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <BreakdownCard title={t.dashboard.knowledgeHealth} items={summary.knowledge.status_breakdown} empty={t.knowledge.emptyBody} />
        <BreakdownCard title={t.dashboard.complianceReadiness} items={summary.compliance.status_breakdown} empty={t.compliance.emptyBody} />
        <UsageCard summary={summary} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel>
          <PanelHeader>
            <div>
              <PanelTitle>{t.dashboard.recentDocuments}</PanelTitle>
              <PanelDescription>{t.dashboard.recentDocumentsBody}</PanelDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/knowledge">{t.nav.knowledge}</Link>
            </Button>
          </PanelHeader>
          <RecentDocuments summary={summary} />
        </Panel>
        <Panel>
          <PanelHeader>
            <div>
              <PanelTitle>{t.dashboard.recentAssessments}</PanelTitle>
              <PanelDescription>{t.dashboard.recentAssessmentsBody}</PanelDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/compliance">{t.nav.compliance}</Link>
            </Button>
          </PanelHeader>
          <RecentAssessments summary={summary} />
        </Panel>
      </div>
    </div>
  );
}

function MetricCard({ title, value, detail, tone = "neutral" }: { title: string; value: string; detail: string; tone?: "neutral" | "ok" | "warn" | "danger" | "accent" }) {
  return (
    <Panel className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted">{title}</p>
        <Badge tone={tone}>&nbsp;</Badge>
      </div>
      <p className="text-3xl font-semibold text-fg">{value}</p>
      <p className="text-xs text-muted">{detail}</p>
    </Panel>
  );
}

function TrendChart({ points }: { points: DashboardTrendPoint[] }) {
  const max = Math.max(1, ...points.flatMap((point) => [point.output_qty, point.target_qty]));
  const width = 640;
  const height = 220;
  const xStep = points.length > 1 ? width / (points.length - 1) : width;
  const pathFor = (key: "output_qty" | "target_qty") =>
    points
      .map((point, index) => {
        const x = index * xStep;
        const y = height - (point[key] / max) * (height - 24) - 12;
        return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

  return (
    <div className="grid gap-3">
      <svg role="img" aria-label="Production output trend" viewBox={`0 0 ${width} ${height}`} className="h-64 w-full overflow-visible">
        <path d={pathFor("target_qty")} fill="none" stroke="var(--color-muted)" strokeWidth="2" strokeDasharray="6 6" />
        <path d={pathFor("output_qty")} fill="none" stroke="var(--color-accent)" strokeWidth="3" />
      </svg>
      <div className="flex flex-wrap gap-3 text-xs text-muted">
        <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-accent" />Output</span>
        <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-muted" />Target</span>
      </div>
    </div>
  );
}

function LineBars({ lines }: { lines: ProductionLineMetric[] }) {
  const { lang } = useT();
  const max = Math.max(1, ...lines.map((line) => line.output_qty));
  return (
    <div className="grid gap-3">
      {lines.map((line) => (
        <div key={line.line} className="grid gap-1.5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate text-fg">{line.line}</span>
            <span className="whitespace-nowrap text-muted">{formatInteger(line.output_qty, lang)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-border">
            <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(4, (line.output_qty / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function BreakdownCard({ title, items, empty }: { title: string; items: DashboardStatusBreakdown[]; empty: string }) {
  const { lang } = useT();
  const total = items.reduce((sum, item) => sum + item.count, 0);
  return (
    <Panel>
      <PanelTitle>{title}</PanelTitle>
      {items.length === 0 ? (
        <Muted className="mt-3">{empty}</Muted>
      ) : (
        <div className="mt-4 grid gap-3">
          {items.map((item) => (
            <div key={item.key} className="grid gap-1.5">
              <div className="flex items-center justify-between gap-2 text-sm">
                <Badge tone={item.tone}>{item.label}</Badge>
                <span className="text-muted">{formatInteger(item.count, lang)}</span>
              </div>
              <Progress value={item.count} max={Math.max(total, 1)} label={item.label} />
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function UsageCard({ summary }: { summary: DashboardSummary }) {
  const { t, lang } = useT();
  const usage = summary.usage;
  if (!usage) return <Panel><PanelTitle>{t.dashboard.usage}</PanelTitle><Muted className="mt-3">{t.common.loading}</Muted></Panel>;
  return (
    <Panel>
      <PanelTitle>{t.dashboard.usage}</PanelTitle>
      <div className="mt-4 grid gap-3">
        {Object.entries(usage.usage).map(([metric, used]) => {
          const limit = usage.limits[metric] ?? 0;
          return (
            <div key={metric} className="grid gap-1.5">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted">{t.settings.billing.metric[metric as keyof typeof t.settings.billing.metric] ?? metric}</span>
                <span className="text-fg">{formatInteger(used, lang)}</span>
              </div>
              <Progress value={used} max={limit > 0 ? limit : used || 1} label={metric} />
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function RecentDocuments({ summary }: { summary: DashboardSummary }) {
  const { t, lang } = useT();
  if (summary.knowledge.recent_documents.length === 0) return <Muted>{t.knowledge.emptyBody}</Muted>;
  return (
    <TableWrapper>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t.knowledge.filename}</TableHead>
            <TableHead>{t.knowledge.status}</TableHead>
            <TableHead>{t.knowledge.uploaded}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {summary.knowledge.recent_documents.map((doc) => (
            <TableRow key={doc.id}>
              <TableCell><Link href={`/knowledge/${doc.id}`} className="text-accent hover:underline">{doc.filename}</Link></TableCell>
              <TableCell><Badge tone={doc.status === "ready" ? "ok" : doc.status === "failed" ? "danger" : "accent"}>{t.knowledge[doc.status]}</Badge></TableCell>
              <TableCell className="text-muted">{formatRelative(doc.created_at, lang)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableWrapper>
  );
}

function RecentAssessments({ summary }: { summary: DashboardSummary }) {
  const { t, lang } = useT();
  if (summary.compliance.recent_assessments.length === 0) return <Muted>{t.compliance.emptyBody}</Muted>;
  return (
    <TableWrapper>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t.compliance.assessments}</TableHead>
            <TableHead>{t.compliance.dueDate}</TableHead>
            <TableHead>{t.compliance.statuses.gap}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {summary.compliance.recent_assessments.map((assessment) => (
            <TableRow key={assessment.id}>
              <TableCell><Link href={`/compliance/${assessment.id}`} className="text-accent hover:underline">{assessment.title}</Link></TableCell>
              <TableCell className="text-muted">{assessment.due_date || "-"}</TableCell>
              <TableCell className="text-muted">{formatInteger(assessment.counts.gap ?? 0, lang)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableWrapper>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-hidden>
      {[0, 1, 2, 3].map((item) => (
        <Panel key={item} className="grid gap-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-3 w-32" />
        </Panel>
      ))}
    </div>
  );
}
