import type { Metadata } from "next";
import { Download } from "lucide-react";
import type { GuestDocument } from "@mios/shared";
import { API_URL, SERVER_API_URL } from "@/lib/api/fetcher";
import { getServerT } from "@/lib/i18n";
import { formatDate, formatInteger } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Panel, PanelTitle, EmptyState, Muted } from "@/components/ui/panel";

export const metadata: Metadata = { title: "Shared documents" };

type LinkError = "expired" | "invalid";

/**
 * Auditor-facing document list.
 *
 * Fetched server-side with the path token. The auditor never receives a Supabase session
 * or any credential, so there is no way to escalate from this page into the tenant —
 * `/knowledge` and everything else redirects to /login for them.
 */
export default async function GuestPage({ params }: { params: Promise<{ token: string }> }) {
  const [{ t, lang }, { token }] = await Promise.all([getServerT(), params]);
  const encoded = encodeURIComponent(token);

  const [documentsResult, link] = await Promise.all([
    fetchGuestDocuments(encoded),
    fetchGuestLink(encoded),
  ]);

  if (documentsResult.error) {
    const expired = documentsResult.error === "expired";
    return (
      <Panel>
        <EmptyState
          className="border-0"
          title={expired ? t.guest.expiredTitle : t.guest.invalidTitle}
          body={expired ? t.guest.expiredBody : t.guest.invalidBody}
        />
      </Panel>
    );
  }

  const documents = documentsResult.documents;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {link.factoryName ? (
          <Muted>{t.guest.sharedBy(link.factoryName)}</Muted>
        ) : (
          <span />
        )}
        {link.expiresAt ? (
          <Muted role="status">{t.guest.expiresOn(formatDate(link.expiresAt, lang))}</Muted>
        ) : null}
      </div>

      <Panel>
        <PanelTitle>{t.guest.title}</PanelTitle>

        {documents.length === 0 ? (
          <EmptyState className="mt-4 border-0" title={t.guest.title} body={t.guest.emptyBody} />
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {documents.map((document) => (
              <li
                key={document.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-fg" title={document.filename}>
                    {document.filename}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {document.doc_type}
                    {document.department ? ` · ${document.department}` : ""}
                    {document.page_count > 0
                      ? ` · ${formatInteger(document.page_count, lang)} ${t.common.pages}`
                      : ""}
                  </p>
                </div>
                <Button asChild variant="ghost" size="sm">
                  {/* Straight to the API's token-scoped endpoint: no session, no proxy hop. */}
                  <a href={`${API_URL}/v1/guest/documents/${document.id}?token=${encoded}`}>
                    <Download className="size-4" />
                    {t.guest.download}
                  </a>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

async function fetchGuestDocuments(
  token: string,
): Promise<{ documents: GuestDocument[]; error: LinkError | null }> {
  try {
    const res = await fetch(`${SERVER_API_URL}/v1/guest/documents?token=${token}`, {
      cache: "no-store",
    });
    if (res.status === 403) return { documents: [], error: "expired" };
    if (!res.ok) return { documents: [], error: "invalid" };
    return { documents: (await res.json()) as GuestDocument[], error: null };
  } catch {
    return { documents: [], error: "invalid" };
  }
}

/** Expiry and factory name for the banner. Absent metadata simply hides the banner. */
async function fetchGuestLink(
  token: string,
): Promise<{ expiresAt: string | null; factoryName: string | null }> {
  try {
    const res = await fetch(`${SERVER_API_URL}/v1/guest/link?token=${token}`, {
      cache: "no-store",
    });
    if (!res.ok) return { expiresAt: null, factoryName: null };
    const data = (await res.json()) as { expires_at?: string; factory_name?: string };
    return {
      expiresAt: data.expires_at ?? null,
      factoryName: data.factory_name ?? null,
    };
  } catch {
    return { expiresAt: null, factoryName: null };
  }
}
