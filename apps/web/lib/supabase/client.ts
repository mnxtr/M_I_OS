import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client. `createBrowserClient` is already a singleton internally,
 * so calling this from any client component is safe.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
