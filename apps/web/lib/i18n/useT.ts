"use client";

import { createContext, useContext } from "react";
import type { Lang } from "@mios/shared";
import { en, getDict, type Dict } from "./dictionary";

interface LangContextValue {
  lang: Lang;
  t: Dict;
}

const LangContext = createContext<LangContextValue>({ lang: "en", t: en });

export const LangProvider = LangContext.Provider;

/** Client-side dictionary access. The value is seeded server-side, so there is no flash. */
export function useT(): LangContextValue {
  return useContext(LangContext);
}

export function buildLangValue(lang: Lang): LangContextValue {
  return { lang, t: getDict(lang) };
}
