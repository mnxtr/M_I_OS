import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireClaims } from "@/lib/supabase/claims";
import { getServerT } from "@/lib/i18n";
import { FeatureTabs, TabsContent } from "@/components/navigation/FeatureTabs";
import { EmptyState } from "@/components/ui/panel";

export const metadata: Metadata = { title: "Quality intelligence" };

type Props = { searchParams: Promise<{ tab?: string }> };

export default async function QualityPage({ searchParams }: Props) {
  if (process.env.NEXT_PUBLIC_FEATURE_QUALITY !== "true") notFound();

  const [{ t }, params] = await Promise.all([getServerT(), searchParams, requireClaims()]);
  const defaultTab = ["pareto", "similar", "trends", "actions"].includes(params.tab ?? "")
    ? params.tab!
    : "pareto";

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-5 text-xl font-semibold text-fg">{t.quality.title}</h1>
      <FeatureTabs
        defaultValue={defaultTab}
        tabs={[
          { value: "pareto", label: t.tabs.defectPareto },
          { value: "similar", label: t.tabs.similarDefects },
          { value: "trends", label: t.tabs.lineTrends },
          { value: "actions", label: t.tabs.correctiveActions },
        ]}
      >
        <TabsContent value="pareto"><EmptyState title={t.tabs.defectPareto} body={t.quality.comingSoon} /></TabsContent>
        <TabsContent value="similar"><EmptyState title={t.tabs.similarDefects} body={t.quality.comingSoon} /></TabsContent>
        <TabsContent value="trends"><EmptyState title={t.tabs.lineTrends} body={t.quality.comingSoon} /></TabsContent>
        <TabsContent value="actions"><EmptyState title={t.tabs.correctiveActions} body={t.tabs.notYetTracked} /></TabsContent>
      </FeatureTabs>
    </div>
  );
}
