import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { requireClaims } from "@/lib/supabase/claims";
import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n";
import { formatInteger, formatDateTime } from "@/lib/format";
import { getLang } from "@/lib/i18n";
import { parseCitationTarget } from "@/lib/citation";
import { Panel, PanelTitle, Badge, Muted } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Document" };

interface PageProps {
  params: Promise<{ documentId: string }>;
  searchParams: Promise<{ page?: string; chunk?: string }>;
}

/**
 * Document viewer. The `?page=&chunk=` query is the other half of the citation promise:
 * a source chip on /ask lands here with the cited passage highlighted.
 *
 * Chunks are read straight from Postgres under RLS — the indexed text is what the answer
 * was actually grounded in, which is more honest evidence than re-rendering the PDF.
 */
export default async function DocumentPage({ params, searchParams }: PageProps) {
  const [{ t }, lang, claims, { documentId }, query] = await Promise.all([
    getServerT(),
    getLang(),
    requireClaims(),
    params,
    searchParams,
  ]);
  void claims;

  const { page, chunk } = parseCitationTarget(query);
  const supabase = await createClient();

  const { data: document } = await supabase
    .from("documents")
    .select("id, filename, doc_type, department, status, page_count, error, created_at")
    .eq("id", documentId)
    .single();

  if (!document) notFound();

  // Show the cited page when we have one, otherwise the first page of extracted text.
  let chunkQuery = supabase
    .from("chunks")
    .select("id, chunk_index, page, content")
    .eq("document_id", documentId)
    .order("chunk_index", { ascending: true })
    .limit(60);
  if (page !== null) chunkQuery = chunkQuery.eq("page", page);

  const { data: chunks } = await chunkQuery;

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/knowledge"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" />
        {t.knowledge.title}
      </Link>

      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <PanelTitle className="break-words">{document.filename}</PanelTitle>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
              <Badge tone="neutral">{document.doc_type}</Badge>
              <Badge tone="neutral">{document.department}</Badge>
              {document.page_count > 0 ? (
                <span>
                  {formatInteger(document.page_count, lang)} {t.common.pages}
                </span>
              ) : null}
              <span>{formatDateTime(document.created_at, lang)}</span>
            </p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <a href={`/api/documents/${document.id}/download`}>
              <Download className="size-4" />
              {t.knowledge.openOriginal}
            </a>
          </Button>
        </div>

        {document.status === "failed" ? (
          <p className="mt-4 rounded-md border border-danger/50 bg-danger/10 px-3 py-2 text-sm text-danger">
            {document.error || t.knowledge.failedNote}
          </p>
        ) : null}

        {document.status === "processing" ? (
          <Muted className="mt-4">{t.knowledge.processingNote}</Muted>
        ) : null}
      </Panel>

      {chunks && chunks.length > 0 ? (
        <div className="mt-4 grid gap-3">
          {page !== null ? (
            <p className="text-sm text-muted">
              {document.page_count > 0
                ? t.knowledge.viewerPage(page, document.page_count)
                : t.ask.pageLabel(page)}
              {chunk !== null ? ` · ${t.knowledge.highlightedChunk}` : ""}
            </p>
          ) : null}

          {chunks.map((entry) => {
            const highlighted = chunk !== null && entry.chunk_index === chunk;
            return (
              <article
                key={entry.id}
                id={`chunk-${entry.chunk_index}`}
                className={
                  highlighted
                    ? "rounded-panel border border-accent bg-accent/5 p-4"
                    : "rounded-panel border border-border bg-panel p-4"
                }
              >
                <p className="mb-2 text-xs text-muted">
                  {entry.page > 0 ? t.ask.pageLabel(entry.page) : t.knowledge.type}
                </p>
                {/* Document text: rendered as text, never HTML. */}
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-fg">
                  {entry.content}
                </p>
              </article>
            );
          })}
        </div>
      ) : document.status === "ready" ? (
        <Muted className="mt-4">{t.knowledge.tabularNote(0)}</Muted>
      ) : null}
    </div>
  );
}
