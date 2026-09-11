"use client";

import { useState } from "react";
import { Copy, Eye, EyeOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/useT";
import { Button } from "@/components/ui/button";
import { Panel, PanelDescription, PanelTitle, ErrorBanner, Muted } from "@/components/ui/panel";
import { rotateEmailSecret } from "@/app/(app)/settings/connectors/actions";

export function ConnectorManager({
  endpoint,
  initialSecret,
  canRotate,
}: {
  endpoint: string;
  initialSecret: string | null;
  canRotate: boolean;
}) {
  const { t } = useT();
  const [secret, setSecret] = useState(initialSecret);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t.common.copied);
    } catch {
      toast.error(t.common.unknownError);
    }
  }

  async function rotate() {
    if (!window.confirm(t.settings.connectors.rotateWarning)) return;
    setBusy(true);
    setError("");
    const result = await rotateEmailSecret();
    if (result.ok) {
      setSecret(result.connectorSecret);
      setVisible(true);
      toast.success(t.settings.connectors.rotated);
    } else {
      setError(result.error === "forbidden" ? t.settings.connectors.adminOnly : t.common.unknownError);
    }
    setBusy(false);
  }

  return (
    <Panel>
      <PanelTitle>{t.settings.connectors.emailTitle}</PanelTitle>
      <PanelDescription className="mt-1">{t.settings.connectors.emailBody}</PanelDescription>

      <div className="mt-5 grid gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t.settings.connectors.endpoint}</p>
          <div className="mt-1 flex items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded-md bg-panel-raised px-3 py-2 text-xs text-fg">{endpoint}</code>
            <Button variant="ghost" size="icon" onClick={() => void copy(endpoint)} aria-label={t.common.copy}>
              <Copy />
            </Button>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t.settings.connectors.secret}</p>
          {secret ? (
            <div className="mt-1 flex items-center gap-2">
              <code className="min-w-0 flex-1 break-all rounded-md bg-panel-raised px-3 py-2 text-xs text-fg">
                {visible ? secret : "•".repeat(Math.min(secret.length, 24))}
              </code>
              <Button variant="ghost" size="icon" onClick={() => setVisible((current) => !current)} aria-label={visible ? t.settings.connectors.hideSecret : t.settings.connectors.revealSecret}>
                {visible ? <EyeOff /> : <Eye />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => void copy(secret)} aria-label={t.common.copy}>
                <Copy />
              </Button>
            </div>
          ) : (
            <Muted className="mt-1">{t.common.networkError}</Muted>
          )}
        </div>

        <ErrorBanner>{error}</ErrorBanner>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" onClick={() => void rotate()} disabled={!canRotate || busy}>
            <RefreshCw />
            {busy ? t.common.pleaseWait : t.settings.connectors.rotateSecret}
          </Button>
          {!canRotate ? <Muted className="text-xs">{t.settings.connectors.adminOnly}</Muted> : null}
        </div>
      </div>
    </Panel>
  );
}
