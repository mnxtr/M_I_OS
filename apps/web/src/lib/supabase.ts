import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const supabaseEnabled = Boolean(url && key);
export const supabase = supabaseEnabled ? createClient(url, key) : null;

export async function getAccessToken(): Promise<string | null> {
  if (!supabase) return localStorage.getItem("mios_token");
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return null;
  // This retrieves a token only. Authorization is verified by the backend.
  return data.session.access_token;
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut();
  localStorage.removeItem("mios_token");
}

/** Persist only the legacy API token when Supabase is intentionally disabled. */
export function persistLegacyToken(token: string) {
  if (!supabase) localStorage.setItem("mios_token", token);
}

/** Clear the legacy token without copying Supabase access tokens into app storage. */
export function clearLegacyToken() {
  localStorage.removeItem("mios_token");
}
