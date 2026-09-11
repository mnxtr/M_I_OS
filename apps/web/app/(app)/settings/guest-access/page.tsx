import type { Metadata } from "next";
import { requireClaims, getAccessToken } from "@/lib/supabase/claims";
import { getServerT } from "@/lib/i18n";
import { listDocumentsSupabase } from "@/lib/knowledge/supabase";
import { listGuestTokensServer } from "@/lib/api";
import { GuestAccessManager } from "@/components/settings/GuestAccessManager";
import { ErrorBanner } from "@/components/ui/panel";
import type { DocumentRecord, GuestTokenInfo } from "@mios/shared";

export const metadata: Metadata = { title: "Auditor links" };

export default async function GuestAccessPage() {
  const [{ t }, claims] = await Promise.all([getServerT(), requireClaims()]);
  let documents: DocumentRecord[] = [];
  let links: GuestTokenInfo[] = [];
  let error = "";

  const [documentResult, linkResult] = await Promise.allSettled([
    listDocumentsSupabase(),
    (async () => {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      return listGuestTokensServer({ token });
    })(),
  ]);

  if (documentResult.status === "fulfilled") documents = documentResult.value;
  if (linkResult.status === "fulfilled") links = linkResult.value;
  if (documentResult.status === "rejected" || linkResult.status === "rejected") {
    error = t.common.networkError;
  }

  return (
    <div className="grid gap-4">
      <div>
        <h2 className="text-lg font-semibold text-fg">{t.settings.guest.title}</h2>
        <p className="mt-1 text-sm text-muted">{t.settings.guest.subtitle}</p>
      </div>
      <ErrorBanner>{error}</ErrorBanner>
      <GuestAccessManager
        links={links}
        documents={documents}
        siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}
      />
    </div>
  );
}
