import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client. Bypasses RLS, so every caller MUST establish the tenant from a
 * verified JWT claim first and scope its own queries.
 *
 * `server-only` makes importing this from a client component a build error, and
 * eslint.config.mjs additionally restricts imports to app/api/** and *.actions.ts.
 */
export function createAdminClient() {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) {
    throw new Error("SUPABASE_SECRET_KEY is not set — server-side Supabase calls are disabled.");
  }
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
