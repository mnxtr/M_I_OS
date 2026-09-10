"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  name: z.string().trim().min(2).max(200),
  location: z.string().trim().max(200).default(""),
  lines: z.coerce.number().int().min(0).max(500).default(0),
  language: z.enum(["en", "bn"]).default("en"),
});

export type OnboardResult =
  | { ok: true; tenantId: string }
  | { ok: false; error: "invalid" | "already_onboarded" | "failed" };

/**
 * Create the tenant and attach the caller's profile to it.
 *
 * Delegates to the `onboard_factory` SECURITY DEFINER function rather than inserting
 * directly: the function is the only path that may set `profiles.tenant_id`, and it
 * refuses when the caller already has one. That keeps a user from re-pointing their
 * profile at another factory's tenant — which the JWT hook would then hand them as a
 * claim, defeating RLS entirely.
 */
export async function onboardFactory(input: {
  name: string;
  location: string;
  lines: string | number;
  language: string;
}): Promise<OnboardResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("onboard_factory", {
    p_name: parsed.data.name,
    p_location: parsed.data.location,
    p_lines: parsed.data.lines,
    p_language: parsed.data.language,
  });

  if (error) {
    if (error.message.includes("already onboarded")) return { ok: false, error: "already_onboarded" };
    return { ok: false, error: "failed" };
  }
  if (typeof data !== "string") return { ok: false, error: "failed" };

  // Keep the session claim in sync with the profile row. The access-token hook should
  // derive this from profiles, but syncing app_metadata here also makes the handoff
  // deterministic when a project has not enabled that hook yet.
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { ok: false, error: "failed" };

  const admin = createAdminClient();
  const { error: metadataError } = await admin.auth.admin.updateUserById(userData.user.id, {
    app_metadata: {
      ...userData.user.app_metadata,
      tenant_id: data,
    },
  });
  if (metadataError) return { ok: false, error: "failed" };

  return { ok: true, tenantId: data };
}
