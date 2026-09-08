"use client";

import { useState } from "react";
import { Copy, Link2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { DocumentRecord, GuestTokenInfo } from "@mios/shared";
import { useT } from "@/lib/i18n/useT";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Panel, PanelTitle, PanelDescription, Badge, ErrorBanner, Muted } from "@/components/ui/panel";
import { createAuditorLink, revokeAuditorLink } from "@/app/(app)/settings/guest-access/actions";

const VALID_DAY_CHOICES = [7, 14, 30, 90];

export function GuestAccessManager({
  links,
  documents,
  siteUrl,
}: {
  links: GuestTokenInfo[];
  documents: DocumentRecord[];
  siteUrl: string;
}) {
  const { t, lang } = useT();

  const [label, setLabel] = useState("");
  const [validDays, setValidDays] = useState(14);
  const [scopeAll, setScopeAll] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function guestUrl(token: string) {
    return `${siteUrl}/guest/${encodeURIComponent(token)}`;
  }

  async function copy(token: string) {
    try {
      await navigator.clipboard.writeText(guestUrl(token));
      toast.success(t.common.copied);
    } catch {
      toast.error(t.common.unknownError);
    }
  }

  async function onCreate(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await createAuditorLink({
        label,
        validDays,
        scopeAll,
        documentIds: scopeAll ? [] : selected,
      });
      if (!result.ok) {
        setError(
          result.error === "no_documents"
            ? t.settings.guest.pickDocuments
            : result.error === "forbidden"
              ? t.common.forbidden
              : t.common.unknownError,
        );
        return;
      }
      setLabel("");
      setSelected([]);
      await copy(result.token.token);
    } finally {
      setBusy(false);
    }
  }

  async function onRevoke(token: string) {
    if (!window.confirm(t.settings.guest.revokeConfirm)) return;
    const result = await revokeAuditorLink(token);
    if (!result.ok) toast.error(t.common.unknownError);
  }

  const readyDocuments = documents.filter((doc) => doc.status === "ready");

  return (
    <div className="grid gap-5">
      <Panel>
        <PanelTitle>{t.settings.guest.create}</PanelTitle>
        <PanelDescription className="mt-1">{t.settings.guest.subtitle}</PanelDescription>

        <form onSubmit={onCreate} className="mt-4 grid gap-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
            <div className="grid gap-1.5">
              <Label htmlFor="label">{t.settings.guest.label}</Label>
              <Input
                id="label"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder={t.settings.guest.labelExample}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="valid">{t.settings.guest.validFor}</Label>
              <Select
                id="valid"
                value={validDays}
                onChange={(event) => setValidDays(Number(event.target.value))}
              >
                {VALID_DAY_CHOICES.map((days) => (
                  <option key={days} value={days}>
                    {t.settings.guest.days(days)}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium text-fg">{t.settings.guest.pickDocuments}</legend>
            <label className="flex items-center gap-2 text-sm text-muted">
              <input
                type="radio"
                name="scope"
                checked={scopeAll}
                onChange={() => setScopeAll(true)}
              />
              {t.settings.guest.scopeAll}
            </label>
            <label className="flex items-center gap-2 text-sm text-muted">
              <input
                type="radio"
                name="scope"
                checked={!scopeAll}
                onChange={() => setScopeAll(false)}
              />
              {t.settings.guest.scopePick}
            </label>
          </fieldset>

          {!scopeAll ? (
            <div className="max-h-56 overflow-y-auto rounded-md border border-border p-3">
              {readyDocuments.length === 0 ? (
                <Muted className="text-xs">{t.knowledge.emptyBody}</Muted>
              ) : (
                <ul className="grid gap-1.5">
                  {readyDocuments.map((doc) => (
                    <li key={doc.id}>
                      <label className="flex items-start gap-2 text-sm text-muted">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={selected.includes(doc.id)}
                          onChange={(event) =>
                            setSelected((current) =>
                              event.target.checked
                                ? [...current, doc.id]
                                : current.filter((id) => id !== doc.id),
                            )
                          }
                        />
                        <span className="break-words">{doc.filename}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
              <Muted className="mt-2 text-xs">{t.settings.guest.selectedCount(selected.length)}</Muted>
            </div>
          ) : null}

          <ErrorBanner>{error}</ErrorBanner>

          <div>
            <Button type="submit" disabled={busy}>
              <Link2 className="size-4" />
              {busy ? t.common.pleaseWait : t.settings.guest.createLink}
            </Button>
          </div>
        </form>
      </Panel>

      <Panel>
        <PanelTitle>{t.settings.guest.activeLinks}</PanelTitle>
        {links.length === 0 ? (
          <Muted className="mt-3">{t.settings.guest.noLinks}</Muted>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {links.map((link) => {
              const expired = new Date(link.expires_at).getTime() < Date.now();
              return (
                <li key={link.token} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-fg">
                      {link.label || t.settings.guest.title}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                      {expired ? (
                        <Badge tone="danger">{t.settings.guest.expired}</Badge>
                      ) : (
                        <span>{t.settings.guest.expiresOn(formatDate(link.expires_at, lang))}</span>
                      )}
                      <span>
                        {link.scope_all_documents
                          ? t.settings.guest.scopeAll
                          : t.settings.guest.selectedCount(link.document_ids.length)}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => void copy(link.token)}>
                      <Copy className="size-3.5" />
                      {t.settings.guest.copyLink}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => void onRevoke(link.token)}>
                      <Trash2 className="size-3.5" />
                      {t.settings.guest.revoke}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
