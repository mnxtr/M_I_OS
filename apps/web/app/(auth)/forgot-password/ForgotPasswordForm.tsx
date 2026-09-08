"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/useT";
import { authErrorMessage } from "@/lib/auth-errors";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Panel, PanelTitle, PanelDescription, ErrorBanner } from "@/components/ui/panel";

export function ForgotPasswordForm() {
  const { t } = useT();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/callback?next=/reset`,
      });
      // Do not distinguish "no such user" — that would confirm account existence.
      if (authError && authError.status === 429) {
        setError(authErrorMessage(authError, t));
        return;
      }
      setSent(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel>
      <PanelTitle>{t.auth.resetTitle}</PanelTitle>
      <PanelDescription className="mt-1">{t.auth.resetSubtitle}</PanelDescription>

      {sent ? (
        <p role="status" className="mt-5 rounded-md border border-ok/50 bg-ok/10 px-3 py-2 text-sm text-ok">
          {t.auth.resetLinkSent}
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-5 grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="email">{t.common.email}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <ErrorBanner>{error}</ErrorBanner>
          <Button type="submit" disabled={busy}>
            {busy ? t.common.pleaseWait : t.auth.sendResetLink}
          </Button>
        </form>
      )}

      <p className="mt-5 text-sm">
        <Link href="/login" className="text-accent hover:underline">
          {t.common.back}
        </Link>
      </p>
    </Panel>
  );
}
