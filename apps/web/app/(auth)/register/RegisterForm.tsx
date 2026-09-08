"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/useT";
import { authErrorMessage } from "@/lib/auth-errors";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldHint, FieldError } from "@/components/ui/input";
import { Panel, PanelTitle, PanelDescription, ErrorBanner } from "@/components/ui/panel";

const schema = z.object({
  companyName: z.string().trim().min(2).max(200),
  fullName: z.string().trim().max(200),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

/**
 * Factory registration.
 *
 * Supabase creates the auth user; a database trigger creates the `profiles` row. The
 * tenant itself is created in /onboarding, because `company_name` belongs to the tenant
 * and the user may abandon the flow before that point. `company_name` is carried in
 * user_metadata purely to prefill the onboarding form — it is never trusted for tenancy.
 */
export function RegisterForm() {
  const { t } = useT();
  const router = useRouter();

  const [companyName, setCompanyName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    setFieldErrors({});

    const parsed = schema.safeParse({ companyName, fullName, email, password });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (key === "password") next[key] = t.auth.weakPassword;
        else if (key) next[key] = issue.message;
      }
      setFieldErrors(next);
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          data: {
            full_name: parsed.data.fullName,
            pending_company_name: parsed.data.companyName,
          },
          emailRedirectTo: `${window.location.origin}/callback?next=/onboarding`,
        },
      });
      if (authError) {
        setError(authErrorMessage(authError, t));
        return;
      }
      // With email confirmation enabled there is no session yet.
      if (!data.session) {
        setNotice(t.auth.checkEmailToConfirm);
        return;
      }
      router.replace("/onboarding");
    } catch (cause) {
      setError(authErrorMessage(cause, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel>
      <PanelTitle>{t.auth.registerTitle}</PanelTitle>
      <PanelDescription className="mt-1">{t.auth.registerSubtitle}</PanelDescription>

      <form onSubmit={onSubmit} className="mt-5 grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="company">{t.auth.companyName}</Label>
          <Input
            id="company"
            required
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            aria-invalid={Boolean(fieldErrors.companyName)}
          />
          <FieldHint>{t.auth.companyNameHint}</FieldHint>
          {fieldErrors.companyName ? <FieldError>{fieldErrors.companyName}</FieldError> : null}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="fullname">{t.auth.yourName}</Label>
          <Input
            id="fullname"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="email">{t.common.email}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(fieldErrors.email)}
          />
          {fieldErrors.email ? <FieldError>{fieldErrors.email}</FieldError> : null}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="password">{t.auth.passwordMin}</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(fieldErrors.password)}
          />
          {fieldErrors.password ? <FieldError>{fieldErrors.password}</FieldError> : null}
        </div>

        <ErrorBanner>{error}</ErrorBanner>
        {notice ? (
          <p role="status" className="rounded-md border border-ok/50 bg-ok/10 px-3 py-2 text-sm text-ok">
            {notice}
          </p>
        ) : null}

        <Button type="submit" disabled={busy}>
          {busy ? t.common.pleaseWait : t.common.signUp}
        </Button>
      </form>

      <p className="mt-5 text-sm text-muted">
        {t.auth.haveAccount}{" "}
        <Link href="/login" className="text-accent hover:underline">
          {t.common.signIn}
        </Link>
      </p>
    </Panel>
  );
}
