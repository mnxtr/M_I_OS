"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { USER_ROLES, type UserRole } from "@mios/shared";
import { getClaims, isAdmin, isOwner } from "@/lib/supabase/claims";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type ActionResult = { ok: true } | { ok: false; error: string };

const inviteSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(USER_ROLES),
});

/**
 * Invite a teammate into this tenant.
 *
 * `tenant_id` is stamped into the invited user's `app_metadata` at creation time, so the
 * access-token hook has something to read the moment they accept — they skip onboarding
 * and land in the right workspace. app_metadata is server-writable only, which is exactly
 * why tenancy lives there and never in user_metadata.
 */
export async function inviteTeammate(input: { email: string; role: string }): Promise<ActionResult> {
  const claims = await getClaims();
  if (!claims) return { ok: false, error: "unauthenticated" };
  if (!isAdmin(claims.role)) return { ok: false, error: "forbidden" };

  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  // Only an owner may mint another owner.
  if (parsed.data.role === "owner" && !isOwner(claims.role)) {
    return { ok: false, error: "forbidden" };
  }

  const admin = createAdminClient();
  const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/callback?next=/dashboard`;

  const { data, error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    redirectTo,
    data: { invited_tenant_id: claims.tenantId, invited_role: parsed.data.role },
  });

  if (error || !data?.user) return { ok: false, error: error?.message ?? "failed" };

  // The handle_new_user trigger created the profile; attach it to this tenant.
  const { error: profileError } = await admin
    .from("profiles")
    .update({ tenant_id: claims.tenantId, role: parsed.data.role })
    .eq("id", data.user.id);

  if (profileError) return { ok: false, error: profileError.message };

  await admin.auth.admin.updateUserById(data.user.id, {
    app_metadata: { tenant_id: claims.tenantId, mios_role: parsed.data.role },
  });

  revalidatePath("/settings/team");
  return { ok: true };
}

const roleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(USER_ROLES),
});

export async function changeRole(input: { userId: string; role: string }): Promise<ActionResult> {
  const claims = await getClaims();
  if (!claims) return { ok: false, error: "unauthenticated" };
  if (!isOwner(claims.role)) return { ok: false, error: "forbidden" };

  const parsed = roleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  if (parsed.data.userId === claims.userId) return { ok: false, error: "cannot_change_self" };

  const admin = createAdminClient();

  // Scope the write by tenant as well as id: the service-role client bypasses RLS, so the
  // tenant check has to be explicit here.
  const { data, error } = await admin
    .from("profiles")
    .update({ role: parsed.data.role })
    .eq("id", parsed.data.userId)
    .eq("tenant_id", claims.tenantId)
    .select("id")
    .maybeSingle();

  if (error || !data) return { ok: false, error: error?.message ?? "not_found" };

  // Keep the JWT claim in step, or the next token still carries the old role.
  await admin.auth.admin.updateUserById(parsed.data.userId, {
    app_metadata: { tenant_id: claims.tenantId, mios_role: parsed.data.role },
  });

  revalidatePath("/settings/team");
  return { ok: true };
}

export async function setActive(input: {
  userId: string;
  isActive: boolean;
}): Promise<ActionResult> {
  const claims = await getClaims();
  if (!claims) return { ok: false, error: "unauthenticated" };
  if (!isAdmin(claims.role)) return { ok: false, error: "forbidden" };
  if (input.userId === claims.userId) return { ok: false, error: "cannot_change_self" };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update({ is_active: input.isActive })
    .eq("id", input.userId)
    .eq("tenant_id", claims.tenantId)
    .select("id")
    .maybeSingle();

  if (error || !data) return { ok: false, error: error?.message ?? "not_found" };

  revalidatePath("/settings/team");
  return { ok: true };
}

export interface TeamMember {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

/** Team list, read under RLS so it can only ever return this tenant's members. */
export async function listTeam(): Promise<TeamMember[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, is_active, created_at")
    .order("created_at", { ascending: true });
  return (data ?? []) as TeamMember[];
}
