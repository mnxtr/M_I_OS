"use client";

import { useEffect } from "react";
import { LANG_COOKIE, LEGACY_LANG_STORAGE_KEY } from "@/lib/i18n/constants";

/**
 * One-time migration of the legacy SPA's localStorage language preference to the cookie
 * the server reads. Runs once per browser; a no-op afterwards. Remove once the legacy
 * origin has been retired long enough that no user carries the old key.
 */
export function LangMigration() {
  useEffect(() => {
    try {
      const legacy = localStorage.getItem(LEGACY_LANG_STORAGE_KEY);
      if (legacy !== "bn" && legacy !== "en") return;
      const hasCookie = document.cookie.split("; ").some((c) => c.startsWith(`${LANG_COOKIE}=`));
      if (hasCookie) {
        localStorage.removeItem(LEGACY_LANG_STORAGE_KEY);
        return;
      }
      document.cookie = `${LANG_COOKIE}=${legacy}; path=/; max-age=31536000; samesite=lax`;
      localStorage.removeItem(LEGACY_LANG_STORAGE_KEY);
      if (legacy === "bn") window.location.reload();
    } catch {
      // Private mode or blocked storage — the cookie default (en) is fine.
    }
  }, []);

  return null;
}
