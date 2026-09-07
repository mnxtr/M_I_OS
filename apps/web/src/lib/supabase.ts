import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const supabaseEnabled = Boolean(url && key);
export const supabase = supabaseEnabled ? createClient(url, key) : null;

// Retain the existing API token key while Supabase owns persistence and refresh.
supabase?.auth.onAuthStateChange((_event, session) => {
  if (session) localStorage.setItem("mios_token", session.access_token);
  else localStorage.removeItem("mios_token");
});

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
