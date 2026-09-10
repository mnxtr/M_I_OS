import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireClaims } from "@/lib/supabase/claims";
import { getComplianceAssessmentSupabase } from "@/lib/compliance/supabase";
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
  const result = await getComplianceAssessmentSupabase(assessmentId).catch(() => undefined);
  if (result === undefined) {
    return (
      <div className="mx-auto max-w-5xl">
        <ErrorBanner>{t.common.networkError}</ErrorBanner>
      </div>
    );
  }

  if (!result) notFound();
  const { assessment, items } = result;

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

      <AssessmentWorkspace assessment={assessment} initialItems={items} />
    </div>
  );
}
