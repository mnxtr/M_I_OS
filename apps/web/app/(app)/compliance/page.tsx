import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, ClipboardCheck, FileSearch, Activity } from "lucide-react";
import { requireClaims } from "@/lib/supabase/claims";
import { listComplianceAssessmentsSupabase, listComplianceTemplatesSupabase } from "@/lib/compliance/supabase";
import { getServerT, getLang } from "@/lib/i18n";
import { formatDate, formatInteger } from "@/lib/format";
import { CreateAssessmentForm } from "@/components/compliance/CreateAssessmentForm";
import { statusTone } from "@/components/compliance/StatusPill";
import { FeatureTabs, TabsContent } from "@/components/navigation/FeatureTabs";
import { Panel, PanelTitle, Badge, EmptyState, ErrorBanner, Muted } from "@/components/ui/panel";
import type { AssessmentInfo, Lang, TemplateInfo } from "@mios/shared";
import type { Dict } from "@/lib/i18n/en";

export const metadata: Metadata = { title: "Compliance" };

type Props = { searchParams: Promise<{ tab?: string }> };

export default async function CompliancePage({ searchParams }: Props) {
  const [{ t }, lang, params] = await Promise.all([getServerT(), getLang(), searchParams, requireClaims()]);

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

  const defaultTab = ["assessments", "gaps", "caps", "binders"].includes(params.tab ?? "")
    ? params.tab!
    : "assessments";
  const gapAssessments = assessments.filter((assessment) => (assessment.counts.gap ?? 0) > 0 || (assessment.counts.partial ?? 0) > 0);

  const totalChecks = assessments.length;
  const unresolved = assessments.reduce((sum, item) => sum + (item.counts.gap ?? 0) + (item.counts.partial ?? 0), 0);
  const evidenceReview = assessments.reduce((sum, item) => sum + (item.counts.unknown ?? 0) + (item.counts.pending ?? 0), 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-border bg-panel p-6 sm:p-8">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-28 size-80 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="mios-eyebrow">LINORA / ASSURANCE INTELLIGENCE</p>
            <h1 className="mios-display mt-3 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">{t.compliance.title}</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted">{t.compliance.subtitle}</p>
            <p className="mt-2 text-xs text-muted">Evidence-led assessments · Human-reviewed outcomes · Not a certification service</p>
          </div>
          <Link href="/knowledge" className="inline-flex items-center gap-2 self-start rounded-full border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition hover:bg-accent/20">Evidence library <ArrowUpRight className="size-4" /></Link>
        </div>
      </section>

      <section aria-label="Compliance overview" className="grid gap-3 sm:grid-cols-3">
        <ComplianceMetric icon={<ClipboardCheck className="size-5" />} label="Assessments" value={totalChecks} detail="Tracked review workspaces" />
        <ComplianceMetric icon={<Activity className="size-5" />} label="Open findings" value={unresolved} detail="Gap or partial evidence" />
        <ComplianceMetric icon={<FileSearch className="size-5" />} label="Awaiting evidence review" value={evidenceReview} detail="Pending or unknown requirements" />
      </section>

      <ErrorBanner className="mb-4">{error}</ErrorBanner>

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
          <div className="grid gap-5">
            {templates.length > 0 && process.env.SUPABASE_SECRET_KEY ? (
              <CreateAssessmentForm templates={templates} />
            ) : templates.length > 0 ? (
              <Panel>
                <ErrorBanner>
                  New assessment creation is temporarily unavailable. An administrator needs to
                  finish the secure compliance configuration; existing assessments remain readable.
                </ErrorBanner>
              </Panel>
            ) : null}
            <AssessmentList assessments={assessments} lang={lang} t={t} />
            <Muted>{t.compliance.humanInLoop}</Muted>
          </div>
        </TabsContent>
        <TabsContent value="gaps">
          <AssessmentList assessments={gapAssessments} lang={lang} t={t} emptyTitle={t.tabs.evidenceGaps} emptyBody={t.tabs.notYetTracked} />
        </TabsContent>
        <TabsContent value="caps">
          <AssessmentList assessments={gapAssessments} lang={lang} t={t} emptyTitle={t.tabs.caps} emptyBody={t.tabs.notYetTracked} />
        </TabsContent>
        <TabsContent value="binders">
          <AssessmentList assessments={assessments} lang={lang} t={t} emptyTitle={t.tabs.binders} emptyBody={t.compliance.emptyBody} />
        </TabsContent>
      </FeatureTabs>
    </div>
  );
}

function AssessmentList({
  assessments,
  lang,
  t,
  emptyTitle,
  emptyBody,
}: {
  assessments: AssessmentInfo[];
  lang: Lang;
  t: Dict;
  emptyTitle?: string;
  emptyBody?: string;
}) {
  return (
    <Panel>
      <PanelTitle>{t.compliance.assessments}</PanelTitle>
      {assessments.length === 0 ? (
        <EmptyState
          className="mt-4 border-0"
          title={emptyTitle ?? t.compliance.emptyTitle}
          body={emptyBody ?? t.compliance.emptyBody}
        />
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {assessments.map((assessment) => (
            <li key={assessment.id}>
              <Link
                href={`/compliance/${assessment.id}`}
                className="flex flex-wrap items-center justify-between gap-3 py-3 hover:text-fg"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-fg">{assessment.title}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {assessment.template_code}
                    {assessment.due_date
                      ? ` - ${t.compliance.dueDate}: ${formatDate(assessment.due_date, lang)}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {Object.entries(assessment.counts)
                    .filter(([, count]) => count > 0)
                    .map(([status, count]) => (
                      <Badge key={status} tone={statusTone(status)}>
                        {t.compliance.statuses[status as keyof typeof t.compliance.statuses] ?? status}: {formatInteger(count, lang)}
                      </Badge>
                    ))}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function ComplianceMetric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: number; detail: string }) {
  return (
    <div className="group rounded-2xl border border-border bg-panel p-5 transition-colors hover:border-accent/40">
      <div className="flex items-center justify-between text-muted"><span className="text-xs font-medium uppercase tracking-wider">{label}</span><span className="text-accent" aria-hidden="true">{icon}</span></div>
      <p className="mt-4 text-3xl font-semibold tabular-nums text-fg">{value.toLocaleString()}</p>
      <p className="mt-1 text-xs text-muted">{detail}</p>
    </div>
  );
}
