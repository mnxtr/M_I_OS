"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getClaims, getAccessToken, isAdmin } from "@/lib/supabase/claims";
import { createGuestToken, revokeGuestToken } from "@/lib/api";
import type { GuestTokenInfo } from "@mios/shared";

export type GuestActionResult =
  | { ok: true; token: GuestTokenInfo }
  | { ok: false; error: string };

const createSchema = z.object({
  label: z.string().trim().max(200).default(""),
  validDays: z.coerce.number().int().min(1).max(90),
  scopeAll: z.boolean(),
  documentIds: z.array(z.string().uuid()).max(500),
});

export async function createAuditorLink(input: {
  label: string;
  validDays: number;
  scopeAll: boolean;
  documentIds: string[];
}): Promise<GuestActionResult> {
  const claims = await getClaims();
  if (!claims) return { ok: false, error: "unauthenticated" };
  if (!isAdmin(claims.role) && claims.role !== "compliance_manager") {
    return { ok: false, error: "forbidden" };
  }

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  if (!parsed.data.scopeAll && parsed.data.documentIds.length === 0) {
    return { ok: false, error: "no_documents" };
  }

  const token = await getAccessToken();
  if (!token) return { ok: false, error: "unauthenticated" };

  try {
    const created = await createGuestToken(
      { token },
      {
        label: parsed.data.label,
        valid_days: parsed.data.validDays,
        scope_all_documents: parsed.data.scopeAll,
        document_ids: parsed.data.documentIds,
      },
    );
    revalidatePath("/settings/guest-access");
    return { ok: true, token: created };
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : "failed" };
  }
}

export async function revokeAuditorLink(guestToken: string): Promise<{ ok: boolean }> {
  const claims = await getClaims();
  if (!claims) return { ok: false };
  if (!isAdmin(claims.role) && claims.role !== "compliance_manager") return { ok: false };

  const token = await getAccessToken();
  if (!token) return { ok: false };

  try {
    await revokeGuestToken({ token }, guestToken);
    revalidatePath("/settings/guest-access");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
