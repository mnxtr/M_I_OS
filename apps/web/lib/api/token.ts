"use client";

import { createClient } from "@/lib/supabase/client";
import { ApiError } from "./fetcher";

/**
 * Access token for a browser-side call to FastAPI.
 *
 * `getSession()` is correct here: we want the raw token to forward, not a trusted user
 * record. supabase-js refreshes it transparently when it is close to expiry.
 */
export async function getClientToken(): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new ApiError("Not authenticated", 401);
  return token;
}
