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
