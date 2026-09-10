import { NextResponse } from "next/server";
import { getClaims } from "@/lib/supabase/claims";
import { createClient } from "@/lib/supabase/server";
import { processKnowledgeDocument } from "@/lib/knowledge/ingest";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const claims = await getClaims();
  if (!claims) return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  const supabase = await createClient();
  const { data: document, error } = await supabase
    .from("documents")
    .select("id,tenant_id,filename,storage_path")
    .eq("id", id)
    .eq("tenant_id", claims.tenantId)
    .single();
  if (error || !document) return NextResponse.json({ detail: "Document not found" }, { status: 404 });

  try {
    const result = await processKnowledgeDocument(document);
    return NextResponse.json({ ok: true, ...result });
  } catch (cause) {
    console.error("Knowledge document processing failed", cause);
    const nested = cause instanceof Error && cause.cause instanceof Error ? `: ${cause.cause.message}` : "";
    const detail = cause instanceof Error ? `${cause.message}${nested}` : "Document processing failed";
    return NextResponse.json({ detail }, { status: 422 });
  }
}
