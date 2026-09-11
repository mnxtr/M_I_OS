"use server";

import { revalidatePath } from "next/cache";
import { getAccessToken, getClaims, isAdmin } from "@/lib/supabase/claims";
import { rotateConnectorSecret } from "@/lib/api";

export type ConnectorActionResult =
  | { ok: true; connectorSecret: string }
  | { ok: false; error: string };

export async function rotateEmailSecret(): Promise<ConnectorActionResult> {
  const claims = await getClaims();
  if (!claims) return { ok: false, error: "unauthenticated" };
  if (!isAdmin(claims.role)) return { ok: false, error: "forbidden" };

  const token = await getAccessToken();
  if (!token) return { ok: false, error: "unauthenticated" };

  try {
    const result = await rotateConnectorSecret({ token });
    revalidatePath("/settings/connectors");
    return { ok: true, connectorSecret: result.connector_secret };
  } catch {
    return { ok: false, error: "failed" };
  }
}
