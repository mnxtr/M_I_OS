import { NextResponse, type NextRequest } from "next/server";
import { getClaims } from "@/lib/supabase/claims";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const SIGNED_URL_TTL_SECONDS = 60;

/**
 * Redirect to a short-lived signed URL for the stored object.
 *
 * The row is read through the RLS-enforcing client first — that is what proves the
 * document belongs to the caller's tenant — and only then does the service-role client
 * sign the object. Never sign a path taken from the request.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const claims = await getClaims();
  if (!claims) return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });

  const { id } = await params;

  const supabase = await createClient();
  const { data: document, error } = await supabase
    .from("documents")
    .select("id, filename, storage_path")
    .eq("id", id)
    .single();

  if (error || !document?.storage_path) {
    return NextResponse.json({ detail: "Document not found" }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data: signed, error: signError } = await admin.storage
    .from("documents")
    .createSignedUrl(document.storage_path, SIGNED_URL_TTL_SECONDS, {
      download: document.filename ?? undefined,
    });

  if (signError || !signed) {
    return NextResponse.json({ detail: "Could not sign the document URL" }, { status: 502 });
  }

  return NextResponse.redirect(signed.signedUrl);
}

/** Delete a document and all tenant-scoped derived knowledge safely. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const claims = await getClaims();
  if (!claims) return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  const supabase = await createClient();
  const { data: document, error } = await supabase
    .from("documents")
    .select("id,tenant_id,storage_path")
    .eq("id", id)
    .eq("tenant_id", claims.tenantId)
    .single();
  if (error || !document) return NextResponse.json({ detail: "Document not found" }, { status: 404 });

  const admin = createAdminClient();
  const { data: sources, error: sourcesError } = await admin
    .from("table_sources")
    .select("id")
    .eq("tenant_id", claims.tenantId)
    .eq("document_id", id);
  if (sourcesError) return NextResponse.json({ detail: sourcesError.message }, { status: 502 });
  const sourceIds = (sources ?? []).map((source) => source.id);
  if (sourceIds.length) {
    const { error: rowsError } = await admin.from("table_rows").delete().eq("tenant_id", claims.tenantId).in("table_source_id", sourceIds);
    if (rowsError) return NextResponse.json({ detail: rowsError.message }, { status: 502 });
  }
  const [{ error: tablesError }, { error: chunksError }, { error: documentError }] = await Promise.all([
    admin.from("table_sources").delete().eq("tenant_id", claims.tenantId).eq("document_id", id),
    admin.from("chunks").delete().eq("tenant_id", claims.tenantId).eq("document_id", id),
    admin.from("documents").delete().eq("tenant_id", claims.tenantId).eq("id", id),
  ]);
  if (tablesError || chunksError || documentError) return NextResponse.json({ detail: tablesError?.message ?? chunksError?.message ?? documentError?.message ?? "Could not delete document" }, { status: 502 });
  if (document.storage_path) await admin.storage.from("documents").remove([document.storage_path]);
  return new NextResponse(null, { status: 204 });
}
