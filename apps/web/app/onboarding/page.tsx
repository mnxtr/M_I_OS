import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n";
import { LangToggle } from "@/components/layout/LangToggle";
import { OnboardingForm } from "./OnboardingForm";

export const metadata: Metadata = { title: "Set up your factory" };

export default async function OnboardingPage() {
  const { t } = await getServerT();
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims as
    | { app_metadata?: { tenant_id?: string }; user_metadata?: { pending_company_name?: string } }
    | undefined;

  if (!claims) redirect("/login");
  if (claims.app_metadata?.tenant_id) redirect("/dashboard");

  // Prefill only. user_metadata is user-writable, so it may never influence tenancy —
  // the tenant is created server-side by the onboard_factory function.
  const suggestedName = claims.user_metadata?.pending_company_name ?? "";

  return (
    <div className="mios-grid-surface min-h-dvh bg-ink px-5 py-8 sm:px-6 sm:py-12">
      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-6rem)] max-w-md flex-col">
      <div className="mb-8 flex items-center justify-between">
        <span className="flex items-center gap-3 text-sm font-bold tracking-[0.2em] text-fg"><span className="grid size-9 place-items-center rounded-lg border border-accent/40 bg-panel text-accent">M</span>{t.brand.name}</span>
        <LangToggle />
      </div>
      <OnboardingForm suggestedName={suggestedName} />
      <p className="mt-4 text-sm text-muted">{t.onboarding.uploadPrompt}</p>
      </div>
    </div>
  );
}
