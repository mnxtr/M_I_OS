import type { Metadata } from "next";
import Image from "next/image";
import { requireClaims } from "@/lib/supabase/claims";
import { fetchDashboardSummarySupabase } from "@/lib/dashboard/supabase";
import { getServerT } from "@/lib/i18n";
import { formatInteger } from "@/lib/format";
import { DashboardWorkspace } from "@/components/dashboard/DashboardWorkspace";
import { ErrorBanner } from "@/components/ui/panel";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const [{ t }] = await Promise.all([getServerT(), requireClaims()]);

  try {
    const summary = await fetchDashboardSummarySupabase();
    return (
      <div className="mx-auto max-w-[1480px]">
        <div className="mios-hero-image mb-6 min-h-[190px] rounded-2xl border border-line bg-panel">
          <Image src="/images/mios-factory-hero.png" alt="" fill className="object-cover opacity-35" sizes="(max-width: 1024px) 100vw, 1480px" />
          <div className="relative z-10 flex min-h-[190px] flex-col justify-end gap-2 p-6 sm:p-8">
            <p className="mios-eyebrow">Aster Textiles · Plant 1 · live workspace</p>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div><h1 className="mios-display text-4xl font-semibold leading-none text-fg sm:text-5xl">{t.dashboard.title}</h1><p className="mt-3 max-w-xl text-sm text-muted sm:text-base">{t.dashboard.subtitle}</p></div>
              <div className="hidden border-l border-line pl-5 text-right sm:block"><p className="text-xs text-muted">today&apos;s output</p><p className="mt-1 text-2xl font-semibold text-accent">{formatInteger(summary.production.output_qty, "en")} <span className="text-xs font-normal text-muted">units</span></p></div>
            </div>
          </div>
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
