"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import type { QueryResult, TableInfo } from "@mios/shared";
import { runQuery } from "@/lib/api";
import { getClientToken } from "@/lib/api/token";
import { ApiError } from "@/lib/api/fetcher";
import { useT } from "@/lib/i18n/useT";
import { formatInteger } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input, Select, Label } from "@/components/ui/input";
import { Panel, ErrorBanner, Muted, Skeleton } from "@/components/ui/panel";
import { SqlDisclosure } from "./SqlDisclosure";
import { ResultTable } from "./ResultTable";

/**
 * NL → SQL console.
 *
 * Uses the non-streaming endpoint: the value here is the table, not a typewriter effect,
 * and a single response keeps `sql`, `rows` and `answer` consistent with each other.
 */
export function QueryConsole({ tables }: { tables: TableInfo[] }) {
  const { t, lang } = useT();
  const [question, setQuestion] = useState("");
  const [tableId, setTableId] = useState("");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || busy) return;

    setBusy(true);
    setError("");
    try {
      const token = await getClientToken();
      setResult(await runQuery({ token }, trimmed, tableId || null));
    } catch (cause) {
      setResult(null);
      setError(guardrailMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  /** Turn the API's guardrail failures into copy a production manager can act on. */
  function guardrailMessage(cause: unknown): string {
    if (!(cause instanceof ApiError)) return t.common.unknownError;
    const detail = cause.message.toLowerCase();
    if (detail.includes("timeout") || detail.includes("canceling statement")) {
      return t.analytics.errorTimeout;
    }
    if (detail.includes("no table") || detail.includes("no matching table")) {
      return t.analytics.errorNoTable;
    }
    if (
      cause.status === 400 ||
      cause.status === 422 ||
      detail.includes("reject") ||
      detail.includes("not allowed") ||
      detail.includes("read-only")
    ) {
      return t.analytics.errorRejected;
    }
    return cause.localized(t);
  }

  return (
    <div className="grid gap-4">
      <Panel>
        <form onSubmit={onSubmit} className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-[16rem_1fr]">
            <div className="grid gap-1.5">
              <Label htmlFor="table">{t.analytics.tablePicker}</Label>
              <Select
                id="table"
                value={tableId}
                onChange={(event) => setTableId(event.target.value)}
              >
                <option value="">{t.analytics.allTables}</option>
                {tables.map((table) => (
                  <option key={table.id} value={table.id}>
                    {table.name} ({formatInteger(table.row_count, lang)})
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="question">{t.analytics.title}</Label>
              <div className="flex gap-2">
                <Input
                  id="question"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder={t.analytics.placeholder}
                />
                <Button type="submit" disabled={busy || !question.trim()}>
                  <Send className="size-4" />
                  {busy ? t.common.pleaseWait : t.common.run}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Panel>

      <ErrorBanner>{error}</ErrorBanner>

      {busy ? (
        <Panel className="grid gap-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-32 w-full" />
        </Panel>
      ) : null}

      {result && !busy ? (
        <Panel className="grid gap-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-fg">{result.answer}</p>
          <SqlDisclosure sql={result.sql} />
          <ResultTable result={result} />
        </Panel>
      ) : null}

      {tables.length > 0 ? (
        <Muted>
          {t.analytics.tablesAvailable}:{" "}
          {tables
            .map((table) => `${table.name} (${formatInteger(table.row_count, lang)} ${t.common.rows})`)
            .join(", ")}
        </Muted>
      ) : null}
    </div>
  );
}
