import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, CircleAlert, FileCheck2, ShieldCheck } from "lucide-react";
import { requireClaims } from "@/lib/supabase/claims";
import { getComplianceAssessmentSupabase } from "@/lib/compliance/supabase";
import { complianceOverview } from "@/lib/compliance/summary";
import { getServerT, getLang } from "@/lib/i18n";
import { formatDate } from "@/lib/format";
import { AssessmentWorkspace } from "@/components/compliance/AssessmentWorkspace";
import { ErrorBanner } from "@/components/ui/panel";

export const metadata: Metadata = { title: "Evidence Review | Linora" };

export default async function AssessmentPage({
  params,
}: {
  params: Promise<{ assessmentId: string }>;
}) {
  const [{ t }, lang, { assessmentId }] = await Promise.all([
    getServerT(), getLang(), params, requireClaims(),
  ]);
  const result = await getComplianceAssessmentSupabase(assessmentId).catch(() => undefined);
  if (result === undefined) {
    return <div className="mx-auto max-w-5xl"><ErrorBanner>{t.common.networkError}</ErrorBanner></div>;
  }

  if (!result) notFound();
  const { assessment, items } = result;
  const overview = complianceOverview([assessment]);

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-12">
      <Link href="/compliance" className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[.12em] text-muted hover:text-accent">
        <ArrowLeft className="size-4" /> All compliance reviews
      </Link>

      <section className="relative overflow-hidden rounded-[26px] border border-accent/20 bg-panel p-6 sm:p-8">
        <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-20 size-80 rounded-full bg-accent/10 blur-[80px]" />
        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <p className="mios-eyebrow flex items-center gap-2"><ShieldCheck className="size-4" /> evidence review / {assessment.template_code}</p>
            <h1 className="mios-display mt-3 max-w-3xl text-3xl font-semibold leading-tight text-fg sm:text-4xl">{assessment.title}</h1>
            <p className="mt-3 text-sm text-muted">{assessment.due_date
              ? `${t.compliance.dueDate}: ${formatDate(assessment.due_date, lang)}`
              : "No due date recorded"} · {assessment.status}</p>
          </div>
          <Link href="/knowledge" className="inline-flex items-center gap-2 rounded-lg border border-border bg-bg/60 px-4 py-2 text-sm text-fg hover:border-accent/40">
            View source records <ArrowUpRight className="size-4" />
          </Link>
        </div>
        <div className="relative mt-7 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-bg/60 p-4">
            <p className="text-xs uppercase tracking-widest text-muted">Requirements</p>
            <p className="mt-2 font-mono text-3xl font-semibold text-fg">{overview.requirements}</p>
            <p className="text-xs text-muted">Versioned checklist rows</p>
          </div>
          <div className="rounded-xl border border-border bg-bg/60 p-4">
            <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted"><FileCheck2 className="size-4 text-accent" /> Status coverage</p>
            <p className="mt-2 font-mono text-3xl font-semibold text-fg">{overview.completionPercent}%</p>
            <p className="text-xs text-muted">Items with recorded outcomes, including AI suggestions</p>
          </div>
          <div className="rounded-xl border border-border bg-bg/60 p-4">
            <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted"><CircleAlert className="size-4 text-warn" /> Attention</p>
            <p className="mt-2 font-mono text-3xl font-semibold text-fg">{overview.attention}</p>
            <p className="text-xs text-muted">Gaps, partial or unassessed items</p>
          </div>
        </div>
        <div className="relative mt-5 h-1.5 overflow-hidden rounded-full bg-border" role="progressbar"
          aria-label="Checklist status coverage" aria-valuenow={overview.completionPercent} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-accent" style={{ width: `${overview.completionPercent}%` }} />
        </div>
        <p className="relative mt-3 text-xs text-muted">Status coverage is not legal certification. Human review remains mandatory.</p>
      </section>

      <AssessmentWorkspace assessment={assessment} initialItems={items} />
    </div>
  );
}
