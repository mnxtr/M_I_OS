import { requireClaims, getAccessToken } from "@/lib/supabase/claims";
import { fetchUsageServer } from "@/lib/api";
import { getServerT } from "@/lib/i18n";
import { TenantHeader } from "@/components/layout/TenantHeader";
import { Sidebar } from "@/components/layout/Sidebar";
import { LangMigration } from "@/components/layout/LangMigration";
import type { UsageInfo } from "@mios/shared";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [claims, { t }] = await Promise.all([requireClaims(), getServerT()]);
  const token = await getAccessToken();

  // The shell must render even when the API is down — the usage meter is not load-bearing.
  let usage: UsageInfo | null = null;
  if (token) {
    try {
      usage = await fetchUsageServer({ token });
    } catch {
      usage = null;
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <LangMigration />
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-panel focus:px-3 focus:py-2 focus:text-sm"
      >
        {t.a11y.skipToContent}
      </a>

      <TenantHeader email={claims.email} role={claims.role} usage={usage} />

      <div className="flex flex-1 flex-col lg:flex-row">
        <div className="overflow-x-auto border-b border-border p-2 lg:w-56 lg:shrink-0 lg:overflow-visible lg:border-b-0 lg:border-r lg:p-4">
          <Sidebar
            role={claims.role}
            showQuality={process.env.NEXT_PUBLIC_FEATURE_QUALITY === "true"}
          />
        </div>

        <main id="content" className="min-w-0 flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
