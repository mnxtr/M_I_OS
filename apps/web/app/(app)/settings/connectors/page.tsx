import type { Metadata } from "next";
import { getAccessToken, requireClaims, isAdmin } from "@/lib/supabase/claims";
import { getServerT } from "@/lib/i18n";
import { getConnectorSecret } from "@/lib/api";
import { API_URL } from "@/lib/api/fetcher";
import { ConnectorManager } from "@/components/settings/ConnectorManager";
import { ErrorBanner } from "@/components/ui/panel";

export const metadata: Metadata = { title: "Connectors" };

export default async function ConnectorsPage() {
  const [{ t }, claims] = await Promise.all([getServerT(), requireClaims()]);
  let secret: string | null = null;
  let error = "";
  const token = await getAccessToken();

  if (token) {
    try {
      secret = (await getConnectorSecret({ token })).connector_secret;
    } catch {
      error = t.common.networkError;
    }
  } else {
    error = t.common.sessionExpired;
  }

  return (
    <div className="grid gap-4">
      <div>
        <h2 className="text-lg font-semibold text-fg">{t.settings.connectors.title}</h2>
        <p className="mt-1 text-sm text-muted">{t.settings.connectors.subtitle}</p>
      </div>
      <ErrorBanner>{error}</ErrorBanner>
      <ConnectorManager
        endpoint={`${API_URL}/v1/connectors/email/inbound`}
        initialSecret={secret}
        canRotate={isAdmin(claims.role)}
      />
    </div>
  );
}
