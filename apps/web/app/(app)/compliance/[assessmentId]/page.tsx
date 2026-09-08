import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireClaims, getAccessToken } from "@/lib/supabase/claims";
import { getAssessmentItemsServer, listAssessmentsServer } from "@/lib/api";
import { getServerT, getLang } from "@/lib/i18n";
import { formatDate } from "@/lib/format";
import { AssessmentWorkspace } from "@/components/compliance/AssessmentWorkspace";
import { ErrorBanner } from "@/components/ui/panel";

export const metadata: Metadata = { title: "Assessment" };

export default async function AssessmentPage({
  params,
}: {
  params: Promise<{ assessmentId: string }>;
}) {
  const [{ t }, lang, { assessmentId }] = await Promise.all([
    getServerT(),
    getLang(),
    params,
    requireClaims(),
  ]);
  const token = await getAccessToken();
  if (!token) notFound();

  const [assessmentsResult, itemsResult] = await Promise.allSettled([
    listAssessmentsServer({ token }),
    getAssessmentItemsServer({ token }, assessmentId),
  ]);

  if (assessmentsResult.status === "rejected" || itemsResult.status === "rejected") {
    return (
      <div className="mx-auto max-w-5xl">
        <ErrorBanner>{t.common.networkError}</ErrorBanner>
      </div>
    );
  }

  const assessment = assessmentsResult.value.find((entry) => entry.id === assessmentId);
  if (!assessment) notFound();

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href="/compliance"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" />
        {t.compliance.assessments}
      </Link>

      <div className="mb-5">
        <h1 className="text-xl font-semibold text-fg">{assessment.title}</h1>
        <p className="mt-1 text-sm text-muted">
          {assessment.template_code}
          {assessment.due_date
            ? ` · ${t.compliance.dueDate}: ${formatDate(assessment.due_date, lang)}`
            : ""}
        </p>
      </div>

      <AssessmentWorkspace assessment={assessment} initialItems={itemsResult.value} />
    </div>
  );
}
