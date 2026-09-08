import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Session refresh + route guard.
 *
 * Next 16 renamed the `middleware.ts` convention to `proxy.ts`. This runs on every
 * matched request and is the only place that can write refreshed auth cookies, because
 * Server Components cannot set cookies.
 */

/** Prefixes reachable without a session. */
const PUBLIC_PREFIXES = [
  "/pricing",
  "/login",
  "/register",
  "/verify",
  "/forgot-password",
  "/reset",
  "/callback",
  "/guest",
  "/auth",
];

function isPublic(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        /**
         * @supabase/ssr >= 0.12 passes cache headers as a second argument. They MUST be
         * copied onto the response: without them a CDN can cache a response carrying a
         * refreshed Set-Cookie and sign the next visitor in as this user.
         */
        setAll(cookiesToSet, headers?: Record<string, string>) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          for (const [key, value] of Object.entries(headers ?? {})) {
            response.headers.set(key, value);
          }
        },
      },
    },
  );

  // getClaims() verifies the JWT signature locally against the project's JWKS.
  // Never getSession() here — it does not revalidate, and cookies can be spoofed.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims as
    | { sub?: string; app_metadata?: { tenant_id?: string } }
    | undefined;

  const { pathname } = request.nextUrl;
  const publicRoute = isPublic(pathname);

  if (!claims?.sub) {
    if (publicRoute) return response;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const tenantId = claims.app_metadata?.tenant_id;

  // Onboarding gate: authenticated but no tenant claim yet. Anything tenant-scoped
  // would render an empty workspace, so send them to finish setup first.
  if (!tenantId && pathname !== "/onboarding" && !publicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/onboarding";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Fully onboarded users have no reason to sit on the auth screens.
  if (tenantId && (pathname === "/login" || pathname === "/register" || pathname === "/onboarding")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export default proxy;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2|ico)$).*)",
  ],
};
