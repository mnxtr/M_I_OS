"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/useT";
import { authErrorMessage } from "@/lib/auth-errors";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Panel, PanelTitle, PanelDescription, ErrorBanner } from "@/components/ui/panel";

/**
 * Set a new password. Reached from the emailed recovery link via /callback, which has
 * already exchanged the code for a session — so `updateUser` is authenticated here.
 */
export function ResetPasswordForm() {
  const { t } = useT();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [mismatch, setMismatch] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (password !== confirm) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    setBusy(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.updateUser({ password });
      if (authError) {
        setError(authErrorMessage(authError, t));
        return;
      }
      setDone(true);
      setTimeout(() => router.replace("/dashboard"), 1200);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel>
      <PanelTitle>{t.auth.newPassword}</PanelTitle>
      <PanelDescription className="mt-1">{t.auth.resetSubtitle}</PanelDescription>

      {done ? (
        <p role="status" className="mt-5 rounded-md border border-ok/50 bg-ok/10 px-3 py-2 text-sm text-ok">
          {t.auth.passwordUpdated}
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-5 grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="password">{t.auth.newPassword}</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="confirm">{t.auth.confirmPassword}</Label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              aria-invalid={mismatch}
            />
            {mismatch ? <FieldError>{t.auth.passwordsDoNotMatch}</FieldError> : null}
          </div>
          <ErrorBanner>{error}</ErrorBanner>
          <Button type="submit" disabled={busy}>
            {busy ? t.common.saving : t.auth.updatePassword}
          </Button>
        </form>
      )}
    </Panel>
  );
}
