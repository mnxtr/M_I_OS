"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { Citation } from "@mios/shared";
import { useT } from "@/lib/i18n/useT";
import { Dialog, Drawer } from "@/components/ui/dialog";
import { citationHref } from "@/lib/citation";
import { cn } from "@/lib/utils";

/**
 * Sources drawer. Every entry deep-links to the exact page and chunk in the document
 * viewer, which is what turns "here is a citation" into "here is the evidence".
 */
export function CitationDrawer({
  citations,
  openIndex,
  onOpenChange,
}: {
  citations: Citation[];
  openIndex: number | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useT();

  return (
    <Dialog open={openIndex !== null} onOpenChange={onOpenChange}>
      <Drawer closeLabel={t.a11y.closeDrawer} aria-label={t.ask.sourcesTitle}>
        <div className="border-b border-border px-5 py-4 pr-12">
          <h2 className="text-base font-semibold text-fg">{t.ask.sourcesTitle}</h2>
          <p className="mt-0.5 text-xs text-muted">{t.ask.sources(citations.length)}</p>
        </div>

        <ol className="flex-1 divide-y divide-border overflow-y-auto">
          {citations.map((citation, index) => (
            <li
              key={`${citation.document_id}-${citation.chunk_index}`}
              id={`source-${index}`}
              className={cn(
                "px-5 py-4",
                openIndex === index && "bg-panel-raised",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium text-fg">
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-accent/50 text-xs text-accent">
                      {index + 1}
                    </span>
                    <span className="truncate" title={citation.document_name}>
                      {citation.document_name}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted">{t.ask.pageLabel(citation.page)}</p>
                </div>
                <Link
                  href={citationHref(citation)}
                  className="inline-flex shrink-0 items-center gap-1 text-xs text-accent hover:underline"
                >
                  {t.ask.openDocument}
                  <ExternalLink className="size-3" />
                </Link>
              </div>

              {/* Snippet is model-adjacent text from the user's own document: rendered as
                  text, never as HTML. */}
              <p className="mt-3 whitespace-pre-wrap break-words rounded-md bg-bg p-3 text-xs leading-relaxed text-muted">
                {citation.snippet}
              </p>
            </li>
          ))}
        </ol>
      </Drawer>
    </Dialog>
  );
}
