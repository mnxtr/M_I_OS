"use client";

import Link from "next/link";
import type { UsageInfo } from "@mios/shared";
import { useT } from "@/lib/i18n/useT";
import { formatInteger } from "@/lib/format";
import { Tooltip } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

/**
 * Usage meter — the "ROI visible daily" principle in the header.
 *
 * Shows the chat-query quota (the metric users hit first) plus the minutes-saved ledger,
 * and turns amber then red as the limit approaches so a quota block is never a surprise.
 */
export function UsageMeter({ usage }: { usage: UsageInfo | null }) {
  const { t, lang } = useT();
  if (!usage) return null;

  const used = usage.usage.chat_queries ?? 0;
  const limit = usage.limits.chat_queries ?? 0;
  const unlimited = limit < 0;
  const percent = unlimited ? 0 : Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));

  const tone =
    percent >= 100 ? "bg-danger" : percent >= 85 ? "bg-warn" : "bg-ok";

  return (
    <Link
      href="/settings/billing"
      className="flex items-center gap-3 rounded-md px-2 py-1 text-xs text-muted hover:bg-panel-raised"
    >
      <span className="rounded-full border border-border px-2 py-0.5">{usage.plan.name}</span>

      <Tooltip content={t.settings.billing.minutesSavedNote}>
        <span className="hidden whitespace-nowrap sm:inline">
          {t.settings.billing.minutesSavedValue(usage.estimated_minutes_saved)}
        </span>
      </Tooltip>

      <span className="flex items-center gap-2">
        <span className="whitespace-nowrap">
          {formatInteger(used, lang)}
          {unlimited ? " / ∞" : ` / ${formatInteger(limit, lang)}`}
        </span>
        {unlimited ? null : (
          <span className="h-1.5 w-16 overflow-hidden rounded-full bg-border">
            <span
              className={cn("block h-full transition-[width]", tone)}
              style={{ width: `${percent}%` }}
            />
          </span>
        )}
      </span>
    </Link>
  );
}
