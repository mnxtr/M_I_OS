import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  ClipboardList,
  FileCheck2,
  FileWarning,
  Layers3,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { requireClaims } from "@/lib/supabase/claims";
import {
  listComplianceAssessmentsSupabase,
  listComplianceTemplatesSupabase,
} from "@/lib/compliance/supabase";
import { complianceOverview } from "@/lib/compliance/summary";
import { getServerT, getLang } from "@/lib/i18n";
import { formatDate, formatInteger } from "@/lib/format";
import { CreateAssessmentForm } from "@/components/compliance/CreateAssessmentForm";
import { statusTone } from "@/components/compliance/StatusPill";
import { FeatureTabs, TabsContent } from "@/components/navigation/FeatureTabs";
import { Panel, PanelTitle, Badge, EmptyState, ErrorBanner, Muted } from "@/components/ui/panel";
import type { AssessmentInfo, Lang, TemplateInfo } from "@mios/shared";
import type { Dict } from "@/lib/i18n/en";

export const metadata: Metadata = {
  title: "Compliance Intelligence | Linora",
  description: "Factory audit evidence, assessment reviews and corrective action plans.",
};

type Props = { searchParams: Promise<{ tab?: string }> };

export default async function CompliancePage({ searchParams }: Props) {
  // Auth must complete before we read any tenant-specific information.
  const [claims, { t }, lang, params] = await Promise.all([
    requireClaims(), getServerT(), getLang(), searchParams,
  ]);

  let templates: TemplateInfo[] = [];
  let assessments: AssessmentInfo[] = [];
  let error = "";
  const [templateResult, assessmentResult] = await Promise.allSettled([
    listComplianceTemplatesSupabase(),
    listComplianceAssessmentsSupabase(),
  ]);
  if (templateResult.status === "fulfilled") templates = templateResult.value;
  if (assessmentResult.status === "fulfilled") assessments = assessmentResult.value;
  if (templateResult.status === "rejected" || assessmentResult.status === "rejected") {
    error = t.common.networkError;
  }

  const overview = complianceOverview(assessments);
  const defaultTab = ["assessments", "gaps", "caps", "binders"].includes(params.tab ?? "")
    ? params.tab!
    : "assessments";
  const gapAssessments = assessments.filter((assessment) =>
    (assessment.counts.gap ?? 0) + (assessment.counts.partial ?? 0) +
    (assessment.counts.unknown ?? 0) > 0,
  );

  return (
    <div className="mx-auto max-w-7xl space-y-7 pb-12">
      <section className="relative isolate overflow-hidden rounded-[28px] border border-accent/25 bg-panel px-6 py-8 shadow-2xl shadow-black/20 md:px-9 md:py-10">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-40"
          style={{ backgroundImage: "linear-gradient(rgba(115,246,210,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(115,246,210,.06) 1px, transparent 1px)", backgroundSize: "32px 32px", maskImage: "linear-gradient(120deg,transparent,black)" }} />
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-36 size-[32rem] rounded-full bg-accent/10 blur-[100px]" />
        <div className="relative grid gap-8 md:grid-cols-[minmax(0,1fr)_220px] md:items-center">
          <div className="min-w-0">
            <div className="mios-eyebrow flex items-center gap-2"><span className="mios-signal-dot" /> LINORA / GOVERNANCE INTELLIGENCE / 01</div>
            <h1 className="mios-display mt-5 max-w-2xl text-4xl font-semibold leading-[1.02] text-fg sm:text-5xl">
              Evidence, not <span className="text-accent">assumptions.</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-muted sm:text-base">
              A decision room for factory audit readiness. Follow requirements, surface missing evidence,
              and coordinate corrective actions without losing the source trail.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a href="#new-assessment" className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-accent-dark">
                <Plus className="size-4" /> Start a review
              </a>
              <Link href="/knowledge" className="inline-flex items-center gap-2 rounded-lg border border-border bg-bg/50 px-4 py-2.5 text-sm font-medium text-fg hover:border-accent/40">
                Browse evidence <ArrowUpRight className="size-4" />
              </Link>
            </div>
            <p className="mt-6 text-xs text-muted">
              Workspace: {claims.email || "Authenticated user"} · All figures are derived from this workspace&apos;s assessment records.
            </p>
          </div>
          <div className="flex flex-col items-center justify-center rounded-2xl border border-accent/15 bg-bg/65 p-6">
            <div className="relative size-40">
              <svg viewBox="0 0 120 120" className="size-full -rotate-90" role="img" aria-label={`${overview.completionPercent}% of checklist requirements reviewed`}>
                <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="9" className="text-border" />
                <circle cx="60" cy="60" r="50" fill="none" stroke="#73f6d2" strokeLinecap="round" strokeWidth="9" pathLength="100"
                  strokeDasharray={`${overview.completionPercent} 100`} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-4xl font-semibold tracking-tight text-fg">{overview.completionPercent}%</span>
                <span className="text-[10px] font-semibold uppercase tracking-[.18em] text-muted">Reviewed</span>
              </div>
            </div>
            <p className="mt-1 text-center text-xs leading-5 text-muted">
              {overview.requirements > 0
                ? `${overview.assessed} of ${overview.requirements} checklist requirements`
                : "Create an assessment to begin."}
            </p>
            <p className="mt-2 text-center text-[10px] uppercase tracking-widest text-accent/70">Progress, not certification</p>
          </div>
        </div>
      </section>

      <ErrorBanner>{error}</ErrorBanner>

      <section aria-label="Compliance snapshot" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric title="Active reviews" value={overview.assessments} icon={<ClipboardList className="size-5" />} context="Assessments created" />
        <Metric title="Requirements tracked" value={overview.requirements} icon={<Layers3 className="size-5" />} context="Checklist items on record" />
        <Metric title="Requires attention" value={overview.attention} icon={<FileWarning className="size-5" />} context="Unresolved or unreviewed" alert={overview.attention > 0} />
        <Metric title="Documented gaps" value={overview.gaps} icon={<ShieldCheck className="size-5" />} context="Items marked as gaps" alert={overview.gaps > 0} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(275px,0.85fr)]">
        <div className="min-w-0">
          <FeatureTabs
            defaultValue={defaultTab}
            tabs={[
              { value: "assessments", label: t.tabs.assessments },
              { value: "gaps", label: t.tabs.evidenceGaps },
              { value: "caps", label: t.tabs.caps },
              { value: "binders", label: t.tabs.binders },
            ]}
          >
            <TabsContent value="assessments">
              <div className="grid gap-5 pt-2">
                <div id="new-assessment" className="scroll-mt-24">
                  {templates.length > 0 ? <CreateAssessmentForm templates={templates} /> :
                    <Panel><ErrorBanner>Checklists are unavailable. Confirm your Supabase connection and refresh.</ErrorBanner></Panel>}
                </div>
                <AssessmentList assessments={assessments} lang={lang} t={t} />
              </div>
            </TabsContent>
            <TabsContent value="gaps">
              <div className="pt-2"><AssessmentList assessments={gapAssessments} lang={lang} t={t} emptyTitle="No flagged assessments" emptyBody="Requirements with a gap, partial, or unknown status appear here." /></div>
            </TabsContent>
            <TabsContent value="caps">
              <div className="pt-2"><AssessmentList assessments={gapAssessments} lang={lang} t={t} emptyTitle="No corrective-action reviews" emptyBody="Open a flagged assessment to draft, edit, and save a corrective action plan." /></div>
            </TabsContent>
            <TabsContent value="binders">
              <div className="pt-2"><AssessmentList assessments={assessments} lang={lang} t={t} emptyTitle="No evidence binders yet" emptyBody="Create an assessment and open it to export a Markdown evidence binder." /></div>
            </TabsContent>
          </FeatureTabs>
        </div>
        <aside className="space-y-4" aria-label="Executive briefing">
          <Panel className="border-accent/25 bg-panel/80 p-6">
            <div className="flex items-center gap-2 text-accent"><FileCheck2 className="size-5" /><span className="mios-eyebrow">Decision queue</span></div>
            <h2 className="mt-4 text-xl font-semibold tracking-tight text-fg">Where attention goes next</h2>
            <p className="mt-2 text-sm leading-6 text-muted">These assessments contain recorded gaps, partial findings or unknown outcomes.</p>
            <div className="mt-5 space-y-2">
              {overview.priority.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted">
                  No flagged reviews on record. This does not establish compliance.
                </div>
              ) : overview.priority.slice(0, 5).map((assessment) => (
                <Link href={`/compliance/${assessment.id}`} key={assessment.id}
                  className="group flex items-center justify-between gap-2 rounded-xl border border-border bg-bg/50 p-3 transition-colors hover:border-accent/40">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-fg">{assessment.title}</span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {(assessment.counts.gap ?? 0) + (assessment.counts.partial ?? 0) + (assessment.counts.unknown ?? 0)} flagged requirements
                    </span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-muted group-hover:text-accent" />
                </Link>
              ))}
            </div>
          </Panel>
          <div className="rounded-2xl border border-border bg-bg/70 p-5">
            <div className="mios-eyebrow">Evidence protocol</div>
            <p className="mt-3 text-sm font-medium text-fg">A document match is not an audit verdict.</p>
            <p className="mt-2 text-xs leading-6 text-muted">
              AI findings are suggestions. Only an authorized human reviewer should confirm compliance
              after checking the cited records and physical conditions.
            </p>
            <Link href="/knowledge" className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline">
              Open factory knowledge <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        </aside>
      </section>
      <Muted className="text-xs">{t.compliance.humanInLoop}</Muted>
    </div>
  );
}

function Metric({ title, value, icon, context, alert = false }: {
  title: string;
  value: number;
  icon: React.ReactNode;
  context: string;
  alert?: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-panel p-5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-[.12em] text-muted">{title}</span>
        <span className={alert ? "text-warn" : "text-accent"}>{icon}</span>
      </div>
      <p className="mt-3 font-mono text-3xl font-semibold tracking-tight text-fg">{value.toLocaleString()}</p>
      <p className="mt-1 text-xs text-muted">{context}</p>
    </div>
  );
}

function AssessmentList({
  assessments, lang, t, emptyTitle, emptyBody,
}: {
  assessments: AssessmentInfo[];
  lang: Lang;
  t: Dict;
  emptyTitle?: string;
  emptyBody?: string;
}) {
  return (
    <Panel className="bg-panel/75">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="mios-eyebrow">Assessment register</p>
          <PanelTitle className="mt-2">{t.compliance.assessments}</PanelTitle>
        </div>
        <Badge tone="neutral">{formatInteger(assessments.length, lang)} records</Badge>
      </div>
      {assessments.length === 0 ? (
        <EmptyState className="mt-4 border-0" title={emptyTitle ?? t.compliance.emptyTitle} body={emptyBody ?? t.compliance.emptyBody} />
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {assessments.map((assessment) => (
            <li key={assessment.id}>
              <Link href={`/compliance/${assessment.id}`}
                className="group flex flex-wrap items-center justify-between gap-4 py-4 hover:text-fg">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-fg group-hover:text-accent">{assessment.title}</p>
                  <p className="mt-1 text-xs text-muted">
                    {assessment.template_code}
                    {assessment.due_date ? ` · ${t.compliance.dueDate}: ${formatDate(assessment.due_date, lang)}` : ""}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {Object.entries(assessment.counts).filter(([, count]) => count > 0).map(([status, count]) => (
                      <Badge key={status} tone={statusTone(status)}>
                        {t.compliance.statuses[status as keyof typeof t.compliance.statuses] ?? status}: {formatInteger(count, lang)}
                      </Badge>
                    ))}
                  </div>
                </div>
                <ArrowUpRight className="size-4 shrink-0 text-muted group-hover:text-accent" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
