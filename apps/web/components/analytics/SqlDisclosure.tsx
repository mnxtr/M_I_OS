"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useT } from "@/lib/i18n/useT";

/**
 * The generated SQL, verbatim.
 *
 * Non-negotiable for trust: the user must be able to see exactly what ran against their
 * data, and it makes a rejected or slow query debuggable by the person asking. Collapsed
 * by default so it does not crowd the answer.
 */
export function SqlDisclosure({ sql }: { sql: string }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);

  if (!sql) return null;

  return (
    <div className="rounded-md border border-border">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-xs text-muted hover:text-fg"
      >
        {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        {open ? t.analytics.hideSql : t.analytics.showSql}
      </button>
      {open ? (
        <div className="border-t border-border px-3 py-2">
          <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-muted">
            {sql}
          </pre>
          <p className="mt-2 text-xs text-muted">{t.analytics.sqlNote}</p>
        </div>
      ) : null}
    </div>
  );
}
