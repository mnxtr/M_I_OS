import Link from "next/link";
import { getServerT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Panel, PanelTitle, PanelDescription, Muted } from "@/components/ui/panel";
import { SERVER_API_URL } from "@/lib/api/fetcher";
import type { PlanInfo } from "@mios/shared";

// Plans change rarely; ISR keeps the page static for an hour.
export const revalidate = 3600;

/**
 * `/v1/tenant/plans` requires a session, so the public pricing page falls back to the
 * documented plan ladder when it cannot read the live list. The fallback is the same
 * shape, so the page never renders empty.
 */
const FALLBACK_PLANS: PlanInfo[] = [
  { code: "trial", name: "Trial", price_usd: 0 },
  { code: "starter", name: "Starter", price_usd: 99 },
  { code: "growth", name: "Growth", price_usd: 299 },
];

async function loadPlans(): Promise<PlanInfo[]> {
  try {
    const res = await fetch(`${SERVER_API_URL}/v1/tenant/plans`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return FALLBACK_PLANS;
    const plans = (await res.json()) as PlanInfo[];
    return plans.length > 0 ? plans : FALLBACK_PLANS;
  } catch {
    return FALLBACK_PLANS;
  }
}

export default async function PricingPage() {
  const [{ t }, plans] = await Promise.all([getServerT(), loadPlans()]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-3xl font-semibold text-fg">{t.marketing.pricingTitle}</h1>
      <p className="mt-3 max-w-2xl text-muted">{t.marketing.pricingBody}</p>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <Panel key={plan.code} className="flex flex-col">
            <PanelTitle>{plan.name}</PanelTitle>
            <p className="mt-3 text-2xl font-semibold text-fg">
              {plan.price_usd === 0
                ? t.settings.billing.free
                : t.settings.billing.perMonth(plan.price_usd)}
            </p>
            <PanelDescription className="mt-3 flex-1">
              {plan.code === "trial" ? t.marketing.pricingBody : t.brand.longTagline}
            </PanelDescription>
            <Button asChild className="mt-5" variant={plan.code === "trial" ? "default" : "ghost"}>
              <Link href="/register">{t.marketing.getStarted}</Link>
            </Button>
          </Panel>
        ))}
      </div>

      <Muted className="mt-8">{t.marketing.pricingContact}</Muted>
    </div>
  );
}
