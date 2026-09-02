import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireSupabaseConfig } from "@/lib/supabase/config";

let browserClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (browserClient) return browserClient;
  const { url, publishableKey } = requireSupabaseConfig();
  browserClient = createBrowserClient(url, publishableKey);
  return browserClient;
}
