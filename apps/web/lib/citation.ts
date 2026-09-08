import type { Citation } from "@mios/shared";

/**
 * Deep link from a citation to the exact evidence in the document viewer.
 *
 * `page` and `chunk` stay ASCII: they are identifiers, not display numbers, so they are
 * never passed through the Bangla numeral formatter.
 */
export function citationHref(citation: Pick<Citation, "document_id" | "page" | "chunk_index">): string {
  const params = new URLSearchParams();
  if (citation.page > 0) params.set("page", String(citation.page));
  params.set("chunk", String(citation.chunk_index));
  return `/knowledge/${citation.document_id}?${params.toString()}`;
}

/** Parse the viewer's query string back into a target. */
export function parseCitationTarget(searchParams: {
  page?: string | string[];
  chunk?: string | string[];
}): { page: number | null; chunk: number | null } {
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  const pageRaw = first(searchParams.page);
  const chunkRaw = first(searchParams.chunk);
  const page = pageRaw !== undefined && /^\d+$/.test(pageRaw) ? Number(pageRaw) : null;
  const chunk = chunkRaw !== undefined && /^\d+$/.test(chunkRaw) ? Number(chunkRaw) : null;
  return { page, chunk };
}
