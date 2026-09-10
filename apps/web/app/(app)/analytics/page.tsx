import type { Metadata } from "next";
import Link from "next/link";
import { requireClaims } from "@/lib/supabase/claims";
import { listTablesSupabase } from "@/lib/knowledge/supabase";
import { getServerT } from "@/lib/i18n";
import { QueryConsole } from "@/components/analytics/QueryConsole";
import { FeatureTabs, TabsContent } from "@/components/navigation/FeatureTabs";
import { EmptyState, ErrorBanner, Panel, PanelTitle, Muted } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import type { TableInfo } from "@mios/shared";

export const metadata: Metadata = { title: "Analytics" };

type Props = { searchParams: Promise<{ tab?: string }> };

export default async function AnalyticsPage({ searchParams }: Props) {
  const [{ t }, params] = await Promise.all([getServerT(), searchParams, requireClaims()]);
  let tables: TableInfo[] = [];
  let error = "";
  try {
    tables = await listTablesSupabase();
  } catch {
    error = t.common.networkError;
  }

  const defaultTab = ["query", "dashboards", "tables", "saved"].includes(params.tab ?? "")
    ? params.tab!
    : "query";

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-fg">{t.analytics.title}</h1>
        <p className="mt-1 text-sm text-muted">{t.analytics.subtitle}</p>
      </div>

      <ErrorBanner className="mb-4">{error}</ErrorBanner>

      <FeatureTabs
        defaultValue={defaultTab}
        tabs={[
          { value: "query", label: t.tabs.queryConsole },
          { value: "dashboards", label: t.tabs.dashboards },
          { value: "tables", label: t.tabs.tables },
          { value: "saved", label: t.tabs.savedQueries },
        ]}
      >
        <TabsContent value="query">
          {tables.length === 0 && !error ? (
            <EmptyState
              title={t.analytics.emptyTitle}
              body={t.analytics.emptyBody}
              action={<Button asChild variant="ghost"><Link href="/knowledge?tab=uploads">{t.analytics.goToKnowledge}</Link></Button>}
            />
          ) : (
            <QueryConsole tables={tables} />
          )}
        </TabsContent>
        <TabsContent value="dashboards">
          <Panel>
            <PanelTitle>{t.tabs.dashboards}</PanelTitle>
            <Muted className="mt-2">{t.dashboard.productionTrendBody}</Muted>
            <Button asChild className="mt-4"><Link href="/dashboard">{t.nav.dashboard}</Link></Button>
          </Panel>
        </TabsContent>
        <TabsContent value="tables">
          <div className="grid gap-3">
            {tables.map((table) => (
              <Panel key={table.id}>
                <PanelTitle>{table.name}</PanelTitle>
                <Muted className="mt-1">{table.sheet_name || t.analytics.allTables} - {table.row_count} {t.common.rows}</Muted>
              </Panel>
            ))}
            {tables.length === 0 ? <EmptyState title={t.tabs.tables} body={t.analytics.emptyBody} /> : null}
          </div>
        </TabsContent>
        <TabsContent value="saved">
          <EmptyState title={t.tabs.savedQueries} body={t.tabs.notYetTracked} />
        </TabsContent>
      </FeatureTabs>
    </div>
  );
}
