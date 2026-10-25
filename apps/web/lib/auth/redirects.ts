/**
 * All post-auth navigation stays within authenticated Linora application routes.
 *
 * The redirect parameter is untrusted (query strings and magic links may be edited).
 * Use this in the proxy, the callback route and client-side auth forms so a stale
 * or crafted "next" cannot bounce visitors to an external host or internal API.
 */
const RETURN_ROUTES = new Set([
  "dashboard",
  "knowledge",
  "ask",
  "analytics",
  "compliance",
  "quality",
  "settings",
  "onboarding",
]);

const VALIDATION_ORIGIN = "https://linora.invalid";

export function safeReturnPath(raw: string | null | undefined): string {
  if (
    !raw ||
    raw.length > 2048 ||
    !raw.startsWith("/") ||
    raw.startsWith("//") ||
    /[\\\u0000-\u001f\u007f]/.test(raw)
  ) {
    return "/dashboard";
  }

  // WHATWG URLs can interpret encoded separators and backslashes unexpectedly.
  const pathPart = raw.split(/[?#]/, 1)[0] ?? "";
  if (/%(?:2f|5c|00)/i.test(pathPart)) return "/dashboard";

  try {
    const url = new URL(raw, VALIDATION_ORIGIN);
    if (url.origin !== VALIDATION_ORIGIN || url.hash) return "/dashboard";
    const firstSegment = url.pathname.split("/")[1];
    if (!firstSegment || !RETURN_ROUTES.has(firstSegment)) {
      return "/dashboard";
    }
    return url.pathname + url.search;
  } catch {
    return "/dashboard";
  }
}

/**
 * Email confirmation and recovery links should return to the single canonical
 * production hostname, not an SSO-protected preview deployment or legacy site.
 */
export function authCallbackUrl(browserOrigin: string, nextPath: string): string {
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL || browserOrigin;
  let origin: string;
  try {
    const candidate = new URL(configuredOrigin);
    if (!["https:", "http:"].includes(candidate.protocol)) {
      throw new Error("Unsupported site URL scheme");
    }
    origin = candidate.origin;
  } catch {
    origin = new URL(browserOrigin).origin;
  }
  const url = new URL("/callback", origin);
  url.searchParams.set("next", safeReturnPath(nextPath));
  return url.toString();
}
