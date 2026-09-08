"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/useT";
import { onboardFactory } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, FieldHint } from "@/components/ui/input";
import { Panel, PanelTitle, PanelDescription, ErrorBanner } from "@/components/ui/panel";

/**
 * Step 1 of onboarding: create the tenant, then force a token refresh.
 *
 * The refresh is not optional. `tenant_id` reaches the app as a JWT claim written by the
 * custom access token hook, and the token in hand was minted before the tenant existed.
 * Navigating without refreshing lands the user on an empty workspace — the single most
 * common bug in this architecture.
 */
export function OnboardingForm({ suggestedName }: { suggestedName: string }) {
  const { t, lang } = useT();
  const router = useRouter();

  const [name, setName] = useState(suggestedName);
  const [location, setLocation] = useState("");
  const [lines, setLines] = useState("");
  const [language, setLanguage] = useState<"en" | "bn">(lang);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await onboardFactory({ name, location, lines: lines || 0, language });
      if (!result.ok) {
        if (result.error === "already_onboarded") {
          router.replace("/dashboard");
          return;
        }
        setError(result.error === "invalid" ? t.common.unknownError : t.common.unknownError);
        return;
      }

      // Pick up the new tenant_id claim before any tenant-scoped read.
      const supabase = createClient();
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        // The tenant exists; a re-login will pick up the claim. Do not strand the user.
        setError(t.common.sessionExpired);
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError(t.common.unknownError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel>
      <PanelDescription>{t.onboarding.stepOf(1, 3)}</PanelDescription>
      <PanelTitle className="mt-1">{t.onboarding.title}</PanelTitle>

      <form onSubmit={onSubmit} className="mt-5 grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="name">{t.onboarding.factoryName}</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
          <FieldHint>{t.auth.companyNameHint}</FieldHint>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="location">{t.onboarding.location}</Label>
          <Input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <FieldHint>{t.onboarding.locationHint}</FieldHint>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="lines">{t.onboarding.productionLines}</Label>
          <Input
            id="lines"
            type="number"
            min={0}
            max={500}
            inputMode="numeric"
            value={lines}
            onChange={(e) => setLines(e.target.value)}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="language">{t.onboarding.primaryLanguage}</Label>
          <Select
            id="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value as "en" | "bn")}
          >
            <option value="en">English</option>
            <option value="bn">বাংলা</option>
          </Select>
        </div>

        <ErrorBanner>{error}</ErrorBanner>

        <Button type="submit" disabled={busy || name.trim().length < 2}>
          {busy ? t.onboarding.creating : t.onboarding.createWorkspace}
        </Button>
      </form>
    </Panel>
  );
}
