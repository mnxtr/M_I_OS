import "server-only";

import type { DocumentRecord, TableInfo } from "@mios/shared";
import { getClaims } from "@/lib/supabase/claims";
import { createClient } from "@/lib/supabase/server";

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0) || 0;
}

export async function listDocumentsSupabase(): Promise<DocumentRecord[]> {
  const claims = await getClaims();
  if (!claims) throw new Error("Not authenticated");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("id,filename,doc_type,department,language,status,page_count,error,created_at")
    .eq("tenant_id", claims.tenantId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    filename: row.filename,
    doc_type: row.doc_type,
    department: row.department,
    language: row.language,
    status: row.status as DocumentRecord["status"],
    page_count: asNumber(row.page_count),
    error: asString(row.error),
    created_at: row.created_at,
  }));
}

export async function listTablesSupabase(): Promise<TableInfo[]> {
  const claims = await getClaims();
  if (!claims) throw new Error("Not authenticated");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("table_sources")
    .select("id,name,sheet_name,columns,row_count")
    .eq("tenant_id", claims.tenantId)
    .order("row_count", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    sheet_name: row.sheet_name,
    columns: Array.isArray(row.columns) ? row.columns as TableInfo["columns"] : [],
    row_count: asNumber(row.row_count),
  }));
}
