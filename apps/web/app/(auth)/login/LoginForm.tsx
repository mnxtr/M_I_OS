"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/useT";
import { authErrorMessage } from "@/lib/auth-errors";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Panel, PanelTitle, PanelDescription, ErrorBanner } from "@/components/ui/panel";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/primitives";

/**
 * Sign-in. Two modes: password, and email OTP.
 *
 * The OTP path is decision D-5 ("OTP-first auth, passwords optional") — it was planned
 * as custom FastAPI endpoints for Phase B and comes free with Supabase Auth.
 */
export function LoginForm() {
  const { t } = useT();
  const router = useRouter();
  const params = useSearchParams();
  const nextPath = params.get("next");

  const [mode, setMode] = useState<"password" | "otp">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function signInWithPassword(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError(authErrorMessage(authError, t));
        return;
      }
      // The proxy decides between /onboarding and the workspace from the tenant claim.
      router.replace(nextPath && nextPath.startsWith("/") ? nextPath : "/dashboard");
    } catch (cause) {
      setError(authErrorMessage(cause, t));
    } finally {
      setBusy(false);
    }
  }

  async function sendCode(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });
      if (authError) {
        setError(authErrorMessage(authError, t));
        return;
      }
      const query = new URLSearchParams({ email });
      if (nextPath) query.set("next", nextPath);
      router.push(`/verify?${query.toString()}`);
    } catch (cause) {
      setError(authErrorMessage(cause, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel>
      <PanelTitle>{t.auth.signInTitle}</PanelTitle>
      <PanelDescription className="mt-1">{t.auth.signInSubtitle}</PanelDescription>

      <Tabs
        value={mode}
        onValueChange={(value) => {
          setMode(value as "password" | "otp");
          setError("");
        }}
        className="mt-5"
      >
        <TabsList className="w-full">
          <TabsTrigger value="password" className="flex-1">
            {t.auth.withPassword}
          </TabsTrigger>
          <TabsTrigger value="otp" className="flex-1">
            {t.auth.withCode}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="password">
          <form onSubmit={signInWithPassword} className="grid gap-4">
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
            <div className="grid gap-1.5">
              <Label htmlFor="password">{t.common.password}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <ErrorBanner>{error}</ErrorBanner>
            <Button type="submit" disabled={busy}>
              {busy ? t.common.pleaseWait : t.common.signIn}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="otp">
          <form onSubmit={sendCode} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="otp-email">{t.common.email}</Label>
              <Input
                id="otp-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <ErrorBanner>{error}</ErrorBanner>
            <Button type="submit" disabled={busy}>
              {busy ? t.auth.sendingCode : t.auth.sendCode}
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      <div className="mt-5 flex flex-wrap justify-between gap-2 text-sm">
        <Link href="/forgot-password" className="text-accent hover:underline">
          {t.auth.forgotPassword}
        </Link>
        <span className="text-muted">
          {t.auth.noAccount}{" "}
          <Link href="/register" className="text-accent hover:underline">
            {t.common.signUp}
          </Link>
        </span>
      </div>
    </Panel>
  );
}
