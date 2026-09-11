import type { Metadata } from "next";
import { getAccessToken, requireClaims } from "@/lib/supabase/claims";
import { getServerT } from "@/lib/i18n";
import { fetchUsageServer, listPaymentsServer, listPlansServer } from "@/lib/api";
import { BillingManager } from "@/components/settings/BillingManager";
import { ErrorBanner } from "@/components/ui/panel";
import type { PaymentRecord, PlanInfo, UsageInfo } from "@mios/shared";

export const metadata: Metadata = { title: "Billing & usage" };

export default async function BillingPage() {
  const [{ lang, t }, claims] = await Promise.all([getServerT(), requireClaims()]);
  let usage: UsageInfo | null = null;
  let plans: PlanInfo[] = [];
  let payments: PaymentRecord[] = [];
  let error = "";
  const token = await getAccessToken();

  if (token) {
    const results = await Promise.allSettled([
      fetchUsageServer({ token }),
      listPlansServer({ token }),
      listPaymentsServer({ token }),
    ]);
    if (results[0].status === "fulfilled") usage = results[0].value;
    if (results[1].status === "fulfilled") plans = results[1].value;
    if (results[2].status === "fulfilled") payments = results[2].value;
    if (results.some((result) => result.status === "rejected")) error = t.common.networkError;
  } else {
    error = t.common.sessionExpired;
  }

  return (
    <div className="grid gap-4">
      <div>
        <h2 className="text-lg font-semibold text-fg">{t.settings.billing.title}</h2>
        <p className="mt-1 text-sm text-muted">{t.settings.billing.subtitle}</p>
      </div>
      <ErrorBanner>{error}</ErrorBanner>
      <BillingManager
        usage={usage}
        plans={plans}
        payments={payments}
        canChangePlan={claims.role === "owner"}
        lang={lang}
      />
    </div>
  );
}
