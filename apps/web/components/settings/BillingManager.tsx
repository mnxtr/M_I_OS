"use client";

import { useState } from "react";
import type { Lang } from "@mios/shared";
import type { PaymentRecord, PlanInfo, UsageInfo } from "@mios/shared";
import { useT } from "@/lib/i18n/useT";
import { formatBdt, formatDate, formatInteger, formatUsd } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Panel, PanelDescription, PanelTitle, Badge, ErrorBanner, Muted } from "@/components/ui/panel";
import { changePlan } from "@/app/(app)/settings/billing/actions";

export function BillingManager({
  usage,
  plans,
  payments,
  canChangePlan,
  lang,
}: {
  usage: UsageInfo | null;
  plans: PlanInfo[];
  payments: PaymentRecord[];
  canChangePlan: boolean;
  lang: Lang;
}) {
  const { t } = useT();
  const [currentPlan, setCurrentPlan] = useState(usage?.plan ?? null);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function onChangePlan(plan: string) {
    setBusyPlan(plan);
    setError("");
    const result = await changePlan(plan);
    if (result.ok) setCurrentPlan(result.plan);
    else setError(result.error === "forbidden" ? t.settings.billing.ownerOnlyPlan : t.common.unknownError);
    setBusyPlan(null);
  }

  const metrics = ["chat_queries", "analytics_queries", "pages_ingested"] as const;

  return (
    <div className="grid gap-5">
      <ErrorBanner>{error}</ErrorBanner>
      <Panel>
        <PanelTitle>{t.settings.billing.currentPlan}</PanelTitle>
        <PanelDescription className="mt-1">{t.settings.billing.subtitle}</PanelDescription>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-2xl font-semibold text-fg">{currentPlan?.name ?? "—"}</p>
            {currentPlan ? <Muted className="mt-1">{currentPlan.price_usd === 0 ? t.settings.billing.free : t.settings.billing.perMonth(currentPlan.price_usd)}</Muted> : null}
          </div>
          {usage ? <Badge tone="accent">{t.settings.billing.period(usage.period)}</Badge> : null}
        </div>
      </Panel>

      <Panel>
        <PanelTitle>{t.settings.billing.changePlan}</PanelTitle>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {plans.map((plan) => {
            const selected = currentPlan?.code === plan.code;
            return (
              <div key={plan.code} className="rounded-lg border border-border p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-fg">{plan.name}</p>
                  {selected ? <Badge tone="ok">{t.settings.billing.currentPlan}</Badge> : null}
                </div>
                <p className="mt-2 text-sm text-muted">{plan.price_usd === 0 ? t.settings.billing.free : t.settings.billing.perMonth(plan.price_usd)}</p>
                {canChangePlan && !selected ? (
                  <Button className="mt-4 w-full" variant="ghost" size="sm" disabled={busyPlan !== null} onClick={() => void onChangePlan(plan.code)}>
                    {busyPlan === plan.code ? t.common.pleaseWait : t.settings.billing.changePlan}
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>
        {!canChangePlan ? <Muted className="mt-3 text-xs">{t.settings.billing.ownerOnlyPlan}</Muted> : null}
      </Panel>

      <Panel>
        <PanelTitle>{t.settings.billing.period(usage?.period ?? "")}</PanelTitle>
        {usage ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {metrics.map((metric) => {
              const used = usage.usage[metric] ?? 0;
              const limit = usage.limits[metric] ?? 0;
              return (
                <div key={metric} className="rounded-lg border border-border p-4">
                  <p className="text-sm text-muted">{t.settings.billing.metric[metric]}</p>
                  <p className="mt-2 text-xl font-semibold text-fg">{formatInteger(used, lang)}</p>
                  <p className="mt-1 text-xs text-muted">{limit < 0 ? t.settings.billing.unlimited : t.settings.billing.usedOfLimit(used, formatInteger(limit, lang))}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <Muted className="mt-3">{t.common.networkError}</Muted>
        )}
        {usage ? <p className="mt-4 text-sm text-accent">{t.settings.billing.minutesSavedValue(usage.estimated_minutes_saved)}</p> : null}
      </Panel>

      <Panel>
        <PanelTitle>{t.settings.billing.invoices}</PanelTitle>
        {payments.length === 0 ? (
          <Muted className="mt-3">{t.settings.billing.noInvoices}</Muted>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">{t.settings.billing.invoices}</caption>
              <thead className="text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th scope="col" className="pb-2 pr-3">{t.settings.billing.invoiceNo}</th>
                  <th scope="col" className="pb-2 pr-3">{t.settings.billing.amount}</th>
                  <th scope="col" className="pb-2 pr-3">{t.settings.billing.paymentStatus}</th>
                  <th scope="col" className="pb-2">{t.knowledge.uploaded}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-t border-border">
                    <td className="py-3 pr-3"><a className="text-accent hover:underline" href={`/api/payments/${payment.id}/invoice`}>{payment.invoice_no}</a></td>
                    <td className="py-3 pr-3 text-muted">{formatBdt(payment.amount_bdt, lang)} <span className="text-xs">({formatUsd(usage?.plan.price_usd ?? 0, lang)})</span></td>
                    <td className="py-3 pr-3"><Badge tone={payment.status === "succeeded" ? "ok" : payment.status === "failed" ? "danger" : "warn"}>{payment.status}</Badge></td>
                    <td className="py-3 text-muted">{formatDate(payment.created_at, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
