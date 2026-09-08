"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import type { QueryResult } from "@mios/shared";
import { useT } from "@/lib/i18n/useT";
import { formatCell, formatInteger, toCsv } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrapper,
} from "@/components/ui/table";
import { Muted } from "@/components/ui/panel";

/** Rows rendered before the "export for the rest" cut-off. */
const VISIBLE_ROWS = 200;

export function ResultTable({ result }: { result: QueryResult }) {
  const { t, lang } = useT();
  const [expanded, setExpanded] = useState(false);
  const [sort, setSort] = useState<{ column: string; direction: "asc" | "desc" } | null>(null);

  const sorted = useMemo(() => {
    if (!sort) return result.rows;
    const { column, direction } = sort;
    return [...result.rows].sort((a, b) => {
      const left = a[column];
      const right = b[column];
      if (left === right) return 0;
      if (left === null || left === undefined) return 1;
      if (right === null || right === undefined) return -1;
      const comparison =
        typeof left === "number" && typeof right === "number"
          ? left - right
          : String(left).localeCompare(String(right), lang === "bn" ? "bn-BD" : "en");
      return direction === "asc" ? comparison : -comparison;
    });
  }, [result.rows, sort, lang]);

  const visible = expanded ? sorted : sorted.slice(0, VISIBLE_ROWS);

  function exportCsv() {
    // Export keeps ASCII digits and raw values so the file stays machine-readable.
    const csv = toCsv(result.columns, result.rows);
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `mios-analytics-${Date.now()}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  if (result.columns.length === 0 || result.rows.length === 0) {
    return <Muted>{t.analytics.rowCount(0)}</Muted>;
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Muted>{t.analytics.rowCount(result.row_count)}</Muted>
        <Button variant="ghost" size="sm" onClick={exportCsv}>
          <Download className="size-4" />
          {t.analytics.exportCsv}
        </Button>
      </div>

      <TableWrapper className="max-h-[28rem] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0">
            <TableRow>
              {result.columns.map((column) => (
                <TableHead key={column}>
                  <button
                    type="button"
                    onClick={() =>
                      setSort((current) =>
                        current?.column === column
                          ? { column, direction: current.direction === "asc" ? "desc" : "asc" }
                          : { column, direction: "asc" },
                      )
                    }
                    className="inline-flex items-center gap-1 hover:text-fg"
                  >
                    {column}
                    {sort?.column === column ? (
                      <span aria-hidden>{sort.direction === "asc" ? "↑" : "↓"}</span>
                    ) : null}
                  </button>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((row, index) => (
              <TableRow key={index}>
                {result.columns.map((column) => (
                  <TableCell key={column} className="whitespace-nowrap">
                    {formatCell(row[column], lang)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableWrapper>

      {!expanded && sorted.length > VISIBLE_ROWS ? (
        <div className="flex items-center gap-3">
          <Muted>{t.analytics.truncated(VISIBLE_ROWS, sorted.length)}</Muted>
          <Button variant="ghost" size="sm" onClick={() => setExpanded(true)}>
            {formatInteger(sorted.length, lang)}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
