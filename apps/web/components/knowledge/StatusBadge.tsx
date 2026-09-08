"use client";

import type { DocStatus } from "@mios/shared";
import { useT } from "@/lib/i18n/useT";
import { Badge } from "@/components/ui/panel";
import { Tooltip } from "@/components/ui/primitives";

const TONE: Record<DocStatus, "ok" | "warn" | "danger"> = {
  ready: "ok",
  processing: "warn",
  failed: "danger",
};

export function StatusBadge({ status, error }: { status: DocStatus; error?: string }) {
  const { t } = useT();
  const label =
    status === "ready" ? t.knowledge.ready : status === "processing" ? t.knowledge.processing : t.knowledge.failed;

  const badge = <Badge tone={TONE[status]}>{label}</Badge>;

  // The ingestion error is the only place a user learns why a document failed.
  return error && status === "failed" ? <Tooltip content={error}>{badge}</Tooltip> : badge;
}
