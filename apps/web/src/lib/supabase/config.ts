export interface SupabaseConfig {
  url: string;
  publishableKey: string;
}

export function isTestMode(): boolean {
  return import.meta.env.VITE_MIOS_TEST_MODE === 'true';
}

export function getSupabaseConfig(): SupabaseConfig | null {
  if (isTestMode()) return null;

  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  return url && publishableKey ? { url, publishableKey } : null;
}

export function requireSupabaseConfig(): SupabaseConfig {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error(
      'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.',
    );
  }
  return config;
}
