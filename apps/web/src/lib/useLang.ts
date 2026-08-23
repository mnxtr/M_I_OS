"use client";

import { useCallback, useEffect, useState } from "react";
import { Lang, loadLang, saveLang } from "./i18n";

export function useLang(): [Lang, (lang: Lang) => void] {
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    setLang(loadLang());
  }, []);
  const change = useCallback((next: Lang) => {
    saveLang(next);
    setLang(next);
  }, []);
  return [lang, change];
}
