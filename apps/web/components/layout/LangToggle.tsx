"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Lang } from "@mios/shared";
import { useT } from "@/lib/i18n/useT";
import { LANG_COOKIE } from "@/lib/i18n/constants";
import { cn } from "@/lib/utils";

/**
 * Language toggle. Writes a cookie and refreshes so the server re-renders with the new
 * dictionary, `<html lang>` and font stack — rather than swapping strings client-side.
 */
export function LangToggle({ className }: { className?: string }) {
  const { lang, t } = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function change(next: Lang) {
    if (next === lang) return;
    // 1 year, site-wide. Not sensitive, so Lax is appropriate and survives OAuth returns.
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div
      className={cn("inline-flex items-center gap-1", className)}
      role="group"
      aria-label={t.a11y.languageToggle}
    >
      {(["en", "bn"] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => change(code)}
          disabled={pending}
          aria-pressed={lang === code}
          className={cn(
            "rounded border px-2 py-1 text-xs transition-colors",
            lang === code
              ? "border-accent text-accent"
              : "border-border text-muted hover:text-fg",
          )}
        >
          {code === "en" ? "EN" : "বাং"}
        </button>
      ))}
    </div>
  );
}
