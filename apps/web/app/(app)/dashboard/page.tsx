import type { Metadata } from "next";
import { requireClaims, getAccessToken } from "@/lib/supabase/claims";
import { fetchDashboardSummaryServer } from "@/lib/api";
import { getServerT } from "@/lib/i18n";
import { DashboardWorkspace } from "@/components/dashboard/DashboardWorkspace";
import { ErrorBanner } from "@/components/ui/panel";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const [{ t }] = await Promise.all([getServerT(), requireClaims()]);
  const token = await getAccessToken();

  if (!token) {
    return <ErrorBanner>{t.common.sessionExpired}</ErrorBanner>;
  }

  try {
    const summary = await fetchDashboardSummaryServer({ token });
    return (
      <div className="mx-auto max-w-7xl">
        <div className="mb-5">
          <h1 className="text-xl font-semibold text-fg">{t.dashboard.title}</h1>
          <p className="mt-1 text-sm text-muted">{t.dashboard.subtitle}</p>
        </div>
        <DashboardWorkspace initialSummary={summary} />
      </div>
    );
  } catch {
    return (
      <div className="mx-auto max-w-5xl">
        <ErrorBanner>{t.common.networkError}</ErrorBanner>
      </div>
    );
  }
}
