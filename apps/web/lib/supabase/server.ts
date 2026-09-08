import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Request-scoped Supabase client for Server Components, Server Actions and Route
 * Handlers. Create a fresh one per request — it closes over that request's cookies.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components cannot write cookies. proxy.ts refreshes the session
            // and writes cookies on every request, so swallowing this is correct.
          }
        },
      },
    },
  );
}
