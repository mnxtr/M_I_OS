import { NextResponse, type NextRequest } from "next/server";
import { getClaims, getAccessToken } from "@/lib/supabase/claims";
import { requestBinder } from "@/lib/api";

/**
 * Evidence binder download.
 *
 * The API writes the ZIP into the `binders` bucket and returns a short-lived signed URL;
 * we redirect to it. A 200 MB binder therefore never streams through a Vercel function.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ assessmentId: string }> },
) {
  const claims = await getClaims();
  if (!claims) return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });

  const token = await getAccessToken();
  if (!token) return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });

  const { assessmentId } = await params;

  try {
    const { url } = await requestBinder({ token }, assessmentId);
    return NextResponse.redirect(url);
  } catch (cause) {
    const status = typeof cause === "object" && cause !== null && "status" in cause
      ? Number((cause as { status: unknown }).status) || 502
      : 502;
    return NextResponse.json({ detail: "Could not prepare the binder" }, { status });
  }
}
