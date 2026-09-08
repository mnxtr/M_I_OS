import "server-only";

import { redirect } from "next/navigation";
import type { UserRole } from "@mios/shared";
import { createClient } from "./server";

export interface SessionClaims {
  userId: string;
  email: string;
  tenantId: string;
  role: UserRole;
}

interface RawClaims {
  sub?: string;
  email?: string;
  app_metadata?: { tenant_id?: string; mios_role?: string };
}

/**
 * Verified claims for the current request, or null when unauthenticated.
 *
 * Uses `getClaims()`: the signature is checked locally against the project's published
 * JWKS. Never `getSession()` on the server — it reads cookies without revalidating and
 * cookies can be spoofed.
 */
export async function getClaims(): Promise<SessionClaims | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) return null;

  const claims = data.claims as RawClaims;
  const tenantId = claims.app_metadata?.tenant_id;
  if (!claims.sub || !tenantId) return null;

  return {
    userId: claims.sub,
    email: claims.email ?? "",
    tenantId,
    role: (claims.app_metadata?.mios_role ?? "operator") as UserRole,
  };
}

/** Claims or a redirect. Use in every page under app/(app). */
export async function requireClaims(): Promise<SessionClaims> {
  const claims = await getClaims();
  if (!claims) redirect("/login");
  return claims;
}

/** Roles allowed to change tenant-wide configuration. */
export const ADMIN_ROLES: UserRole[] = ["owner", "admin"];

export function isAdmin(role: UserRole): boolean {
  return ADMIN_ROLES.includes(role);
}

export function isOwner(role: UserRole): boolean {
  return role === "owner";
}

/**
 * Raw access token for forwarding to FastAPI.
 *
 * This is the one legitimate use of `getSession()` — extracting the token itself rather
 * than trusting the user object embedded alongside it.
 */
export async function getAccessToken(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
