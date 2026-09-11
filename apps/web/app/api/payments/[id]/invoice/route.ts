import { NextResponse, type NextRequest } from "next/server";
import { getAccessToken, getClaims } from "@/lib/supabase/claims";
import { SERVER_API_URL } from "@/lib/api/fetcher";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const claims = await getClaims();
  if (!claims) return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const response = await fetch(`${SERVER_API_URL}/v1/payments/${encodeURIComponent(id)}/invoice`, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    return NextResponse.json({ detail: "Invoice not found" }, { status: response.status });
  }

  return new NextResponse(await response.arrayBuffer(), {
    status: 200,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/pdf",
      "Content-Disposition": response.headers.get("content-disposition") ?? `attachment; filename="${id}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
