"use client";

import type { ItemStatus } from "@mios/shared";
import { useT } from "@/lib/i18n/useT";
import { Badge } from "@/components/ui/panel";

const TONE: Record<ItemStatus, "ok" | "warn" | "danger" | "neutral" | "accent"> = {
  compliant: "ok",
  partial: "warn",
  gap: "danger",
  pending: "neutral",
  unknown: "neutral",
  not_applicable: "neutral",
};

export function StatusPill({ status }: { status: ItemStatus }) {
  const { t } = useT();
  return <Badge tone={TONE[status] ?? "neutral"}>{t.compliance.statuses[status]}</Badge>;
}

export function statusTone(status: string): "ok" | "warn" | "danger" | "neutral" | "accent" {
  return TONE[status as ItemStatus] ?? "neutral";
}
