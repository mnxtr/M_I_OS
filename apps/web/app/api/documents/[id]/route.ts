import { NextResponse, type NextRequest } from "next/server";
import { getClaims } from "@/lib/supabase/claims";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

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
  if (error || !document) {
    return NextResponse.json({ detail: "Document not found" }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data: sources, error: sourcesError } = await admin
    .from("table_sources")
    .select("id")
    .eq("tenant_id", claims.tenantId)
    .eq("document_id", id);
  if (sourcesError) {
    return NextResponse.json({ detail: sourcesError.message }, { status: 502 });
  }

  const sourceIds = (sources ?? []).map((source) => source.id);
  if (sourceIds.length) {
    const { error: rowsError } = await admin
      .from("table_rows")
      .delete()
      .eq("tenant_id", claims.tenantId)
      .in("table_source_id", sourceIds);
    if (rowsError) {
      return NextResponse.json({ detail: rowsError.message }, { status: 502 });
    }
  }

  const [{ error: tablesError }, { error: chunksError }, { error: documentError }] =
    await Promise.all([
      admin.from("table_sources").delete().eq("tenant_id", claims.tenantId).eq("document_id", id),
      admin.from("chunks").delete().eq("tenant_id", claims.tenantId).eq("document_id", id),
      admin.from("documents").delete().eq("tenant_id", claims.tenantId).eq("id", id),
    ]);

  if (tablesError || chunksError || documentError) {
    return NextResponse.json(
      {
        detail:
          tablesError?.message ??
          chunksError?.message ??
          documentError?.message ??
          "Could not delete document",
      },
      { status: 502 },
    );
  }

  if (document.storage_path) {
    const { error: storageError } = await admin.storage
      .from("documents")
      .remove([document.storage_path]);
    if (storageError) {
      return NextResponse.json({ detail: storageError.message }, { status: 502 });
    }
  }

  return new NextResponse(null, { status: 204 });
}
