import { getProduct, PRODUCT_SECTIONS, type ProductSlug } from "./catalog";

/**
 * The host is untrusted request input. Accept only exact, configured public
 * product names. Never use a request-supplied Host as an authentication origin.
 */
export type ProductHostRoute =
  | { type: "rewrite"; slug: ProductSlug; destination: string }
  | { type: "not_found"; slug: ProductSlug };

export function normalizedHostname(raw: string | null | undefined): string | null {
  if (!raw || raw.length > 255) return null;
  const input = raw.trim().toLowerCase();
  if (!/^[a-z0-9.-]+(?::[0-9]{1,5})?$/.test(input)) return null;
  const hostname = input.replace(/:[0-9]{1,5}$/, "").replace(/\.$/, "");
  if (!hostname || hostname.includes("..") || hostname.startsWith(".") || hostname.endsWith(".")) return null;
  return hostname;
}

export function productFromHost(host: string | null | undefined, productDomain = "linora.ai") {
  const hostname = normalizedHostname(host);
  const apex = normalizedHostname(productDomain);
  if (!hostname || !apex || apex.includes(":")) return undefined;
  // Exact slug matching, not wildcard substring matching. app, api, docs and
  // status never resolve to customer public products.
  const suffix = "." + apex;
  if (!hostname.endsWith(suffix)) return undefined;
  const subdomain = hostname.slice(0, -suffix.length);
  if (!subdomain || subdomain.includes(".")) return undefined;
  return getProduct(subdomain);
}

export function productHostRoute(
  hostname: string | null | undefined,
  pathname: string,
  domain = "linora.ai",
): ProductHostRoute | null {
  const product = productFromHost(hostname, domain);
  if (!product) return null;

  if (pathname === "/") {
    return { type: "rewrite", slug: product.slug, destination: "/products/" + product.slug };
  }
  const section = pathname.startsWith("/") ? pathname.slice(1) : "";
  if (PRODUCT_SECTIONS.some((value) => value === section)) {
    return {
      type: "rewrite",
      slug: product.slug,
      destination: "/products/" + product.slug + "/" + section,
    };
  }
  // No API, auth, callback, private workspace, guest token, or public
  // alternative slug can be reached on a vanity product origin.
  return { type: "not_found", slug: product.slug };
}

const DEFAULT_APPLICATION_ORIGIN = "https://mios-manufacturing-pilot.vercel.app";
const ALLOWED_WORKSPACES = new Set([
  "/ask", "/knowledge", "/compliance", "/analytics",
  "/quality", "/dashboard", "/settings/connectors",
]);

export function canonicalApplicationOrigin(configured?: string): string {
  try {
    const url = new URL(configured || DEFAULT_APPLICATION_ORIGIN);
    if (
      url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))
    ) return DEFAULT_APPLICATION_ORIGIN;
    if (url.username || url.password || url.search || url.hash || url.pathname !== "/") {
      return DEFAULT_APPLICATION_ORIGIN;
    }
    return url.origin;
  } catch {
    return DEFAULT_APPLICATION_ORIGIN;
  }
}

export function workspaceSignInUrl(workspacePath: string, configuredOrigin?: string): string {
  // Only known, static app destinations are allowed. No user input is appended
  // as an absolute destination and no session token is encoded in the URL.
  const destination = ALLOWED_WORKSPACES.has(workspacePath) ? workspacePath : "/dashboard";
  const url = new URL("/login", canonicalApplicationOrigin(configuredOrigin));
  url.searchParams.set("next", destination);
  return url.toString();
}

export function defaultProductDomain() {
  return process.env.LINORA_PRODUCT_DOMAIN || "linora.ai";
}
