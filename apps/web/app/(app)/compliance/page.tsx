import type { Metadata } from "next";
import Link from "next/link";
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

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-fg">{t.compliance.title}</h1>
        <p className="mt-1 text-sm text-muted">{t.compliance.subtitle}</p>
      </div>

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
            {templates.length > 0 ? <CreateAssessmentForm templates={templates} /> : null}
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
