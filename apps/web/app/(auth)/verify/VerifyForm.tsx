"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/useT";
import { authErrorMessage } from "@/lib/auth-errors";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Panel, PanelTitle, PanelDescription, ErrorBanner } from "@/components/ui/panel";

const RESEND_COOLDOWN_SECONDS = 45;

/** Email OTP verification (D-5). Six digits, `type: "email"`. */
export function VerifyForm() {
  const { t } = useT();
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const nextPath = params.get("next");

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function onVerify(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.verifyOtp({
        email,
        token: code.trim(),
        type: "email",
      });
      if (authError) {
        setError(authErrorMessage(authError, t));
        return;
      }
      router.replace(nextPath && nextPath.startsWith("/") ? nextPath : "/dashboard");
    } catch (cause) {
      setError(authErrorMessage(cause, t));
    } finally {
      setBusy(false);
    }
  }

  async function onResend() {
    setError("");
    setBusy(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });
      if (authError) setError(authErrorMessage(authError, t));
      else setCooldown(RESEND_COOLDOWN_SECONDS);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel>
      <PanelTitle>{t.auth.enterCode}</PanelTitle>
      <PanelDescription className="mt-1">{t.auth.codeSentTo(email)}</PanelDescription>

      <form onSubmit={onVerify} className="mt-5 grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="code">{t.auth.enterCode}</Label>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="text-center text-lg tracking-[0.4em]"
          />
        </div>
        <ErrorBanner>{error}</ErrorBanner>
        <Button type="submit" disabled={busy || code.length < 6}>
          {busy ? t.auth.verifying : t.auth.verify}
        </Button>
      </form>

      <div className="mt-4 text-sm text-muted">
        {cooldown > 0 ? (
          t.auth.resendIn(cooldown)
        ) : (
          <button type="button" onClick={onResend} className="text-accent hover:underline">
            {t.auth.resendCode}
          </button>
        )}
      </div>
    </Panel>
  );
}
