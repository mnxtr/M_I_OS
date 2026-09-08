"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import type { Lang } from "@mios/shared";
import { LangProvider, buildLangValue } from "@/lib/i18n/useT";
import { TooltipProvider } from "@/components/ui/primitives";

/**
 * React Query is scoped to the interactive surfaces (ask, analytics, compliance).
 * First-paint lists come from Server Components, so nothing here re-fetches what RSC
 * already delivered.
 */
export function Providers({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <LangProvider value={buildLangValue(lang)}>
        <TooltipProvider>
          {children}
          <Toaster theme="dark" position="bottom-right" richColors />
        </TooltipProvider>
      </LangProvider>
    </QueryClientProvider>
  );
}
