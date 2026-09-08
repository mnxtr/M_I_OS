import { cookies } from "next/headers";
import type { Lang } from "@mios/shared";
import { LANG_COOKIE } from "./constants";
import { getDict, type Dict } from "./dictionary";

export function isLang(value: unknown): value is Lang {
  return value === "en" || value === "bn";
}

/**
 * Server-side language resolution. Reading this in the root layout is what makes
 * `<html lang>` and the font stack correct on the first byte — a client-side switch
 * would leave a screen reader announcing Bangla in an English voice until hydration.
 */
export async function getLang(): Promise<Lang> {
  const store = await cookies();
  const value = store.get(LANG_COOKIE)?.value;
  return isLang(value) ? value : "en";
}

export async function getServerT(): Promise<{ lang: Lang; t: Dict }> {
  const lang = await getLang();
  return { lang, t: getDict(lang) };
}

export type { Dict };
export { LANG_COOKIE, LEGACY_LANG_STORAGE_KEY } from "./constants";
export { getDict, en, bn } from "./dictionary";
