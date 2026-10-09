import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { requireSupabaseConfig } from '@/lib/supabase/config';

let browserClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (browserClient) return browserClient;

  const { url, publishableKey } = requireSupabaseConfig();
  browserClient = createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
      persistSession: true,
    },
  });
  return browserClient;
}
