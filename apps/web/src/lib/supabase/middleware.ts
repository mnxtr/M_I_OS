import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseConfig } from "@/lib/supabase/config";

export async function updateSupabaseSession(request: NextRequest) {
  const config = getSupabaseConfig();
  if (!config) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const hasVerifiedIdentity = Boolean(data?.claims?.sub);
  const isWorkspace = request.nextUrl.pathname.startsWith("/workspace");
  const isSignIn = request.nextUrl.pathname === "/";

  if (isWorkspace && !hasVerifiedIdentity) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("reason", "session_expired");
    return NextResponse.redirect(url);
  }

  if (isSignIn && hasVerifiedIdentity) {
    const url = request.nextUrl.clone();
    url.pathname = "/workspace";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
