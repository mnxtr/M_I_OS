import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth / magic-link / recovery callback: exchanges the code in the URL for a session
 * and writes the auth cookies, then redirects.
 *
 * Only same-origin relative paths are honoured for `next`, so a crafted link cannot use
 * this endpoint as an open redirect.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const rawNext = searchParams.get("next") ?? "/dashboard";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "email" | "recovery" | "invite" | "email_change",
    });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  const failure = new URL("/login", origin);
  failure.searchParams.set("error", "callback");
  return NextResponse.redirect(failure);
}
