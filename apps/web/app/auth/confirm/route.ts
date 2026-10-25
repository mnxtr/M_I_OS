import { NextResponse, type NextRequest } from "next/server";

/**
 * Compatibility with older Supabase email templates and existing bookmarks.
 * Verification happens only in /callback, which validates the code/token.
 */
export function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/callback";
  return NextResponse.redirect(url, { status: 307 });
}
