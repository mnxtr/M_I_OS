"use client";

import type { Citation } from "@mios/shared";
import { useT } from "@/lib/i18n/useT";
import { cn } from "@/lib/utils";

/**
 * Numbered citation chip. Clicking opens the sources drawer at this entry.
 *
 * Citations are the product's core promise ("no answer without a traceable source"),
 * so this is a real control with a hover preview — not decoration.
 */
export function CitationChip({
  index,
  citation,
  onSelect,
  active,
}: {
  index: number;
  citation: Citation;
  onSelect: (index: number) => void;
  active?: boolean;
}) {
  const { t } = useT();
  return (
    <button
      type="button"
      onClick={() => onSelect(index)}
      title={`${citation.document_name} · ${t.ask.pageLabel(citation.page)}`}
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded border px-1 text-xs transition-colors",
        active
          ? "border-accent bg-accent/15 text-accent"
          : "border-border text-muted hover:border-accent hover:text-accent",
      )}
    >
      {index + 1}
    </button>
  );
}
