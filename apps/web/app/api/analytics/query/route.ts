import { NextResponse } from "next/server";
import type { QueryResult } from "@mios/shared";
import { getClaims } from "@/lib/supabase/claims";
import { createClient } from "@/lib/supabase/server";
import { explainAnalytics } from "@/lib/groq";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const claims = await getClaims();
  if (!claims) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const question = typeof body.question === "string" ? body.question.trim() : "";
  const tableId = typeof body.table_id === "string" && body.table_id ? body.table_id : null;
  if (!question) return NextResponse.json({ error: "Question is required" }, { status: 400 });

  const supabase = await createClient();
  let sourceQuery = supabase.from("table_sources").select("id,name,sheet_name,columns,row_count").eq("tenant_id", claims.tenantId);
  if (tableId) sourceQuery = sourceQuery.eq("id", tableId);
  const { data: sources, error: sourceError } = await sourceQuery;
  if (sourceError) return NextResponse.json({ error: sourceError.message }, { status: 500 });
  if (!sources?.length) return NextResponse.json({ error: "No matching table" }, { status: 400 });

  const ids = sources.map((source) => source.id);
  const { data: rows, error: rowError } = await supabase.from("table_rows").select("data,row_number,table_source_id").eq("tenant_id", claims.tenantId).in("table_source_id", ids).order("row_number").limit(5000);
  if (rowError) return NextResponse.json({ error: rowError.message }, { status: 500 });

  const words = question.toLowerCase().split(/\s+/).filter((word: string) => word.length > 2);
  const ranked = (rows ?? []).map((row) => {
    const text = JSON.stringify(row.data).toLowerCase();
    return { row, score: words.reduce((score: number, word: string) => score + (text.includes(word) ? 1 : 0), 0) };
  }).sort((a, b) => b.score - a.score);
  const selected = (ranked.some((entry) => entry.score > 0) ? ranked.filter((entry) => entry.score > 0) : ranked).slice(0, 100).map(({ row }) => row.data as Record<string, unknown>);
  const columns = selected.length ? Object.keys(selected[0] ?? {}) : ((sources[0]?.columns ?? []) as Array<{ name?: string }>).map((column) => column.name ?? "column");
  const names = sources.map((source) => source.name).join(", ");
  let answer = `${selected.length} matching rows found in ${names}.`;
  try {
    answer = await explainAnalytics(question, names, selected);
  } catch {
    // The relational result remains useful if the optional explanation call is unavailable.
  }
  const result: QueryResult = { answer, sql: `SELECT data FROM public.table_rows WHERE tenant_id = '${claims.tenantId}'${tableId ? ` AND table_source_id = '${tableId}'` : ""} LIMIT 100;`, columns, rows: selected, row_count: selected.length };
  return NextResponse.json(result);
}
