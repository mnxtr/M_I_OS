"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAccessToken, getClaims, isOwner } from "@/lib/supabase/claims";
import { switchPlan as switchPlanApi } from "@/lib/api";

const planSchema = z.string().trim().min(1).max(30);

export type BillingActionResult =
  | { ok: true; plan: Awaited<ReturnType<typeof switchPlanApi>> }
  | { ok: false; error: string };

export async function changePlan(plan: string): Promise<BillingActionResult> {
  const claims = await getClaims();
  if (!claims) return { ok: false, error: "unauthenticated" };
  if (!isOwner(claims.role)) return { ok: false, error: "forbidden" };

  const parsed = planSchema.safeParse(plan);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const token = await getAccessToken();
  if (!token) return { ok: false, error: "unauthenticated" };

  try {
    const updated = await switchPlanApi({ token }, parsed.data);
    revalidatePath("/settings/billing");
    revalidatePath("/dashboard");
    return { ok: true, plan: updated };
  } catch {
    return { ok: false, error: "failed" };
  }
}
