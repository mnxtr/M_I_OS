"use client";

import { useCallback, useEffect, useState } from "react";
import { Lang, loadLang, saveLang } from "./i18n";

export function useLang(): [Lang, (lang: Lang) => void] {
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    const saved = loadLang();
    setLang(saved);
    document.documentElement.lang = saved === "bn" ? "bn-BD" : "en";
    document.title = saved === "bn" ? "à¦²à¦¿à¦¨à§à¦°à¦¾ Â· à¦à¦¾à¦°à¦à¦¾à¦¨à¦¾ à¦à¦¨à§à¦à§à¦²à¦¿à¦à§à¦¨à§à¦¸" : "Linora Â· Factory intelligence";
  }, []);
  const change = useCallback((next: Lang) => {
    saveLang(next);
    setLang(next);
    document.documentElement.lang = next === "bn" ? "bn-BD" : "en";
    document.title = next === "bn" ? "à¦²à¦¿à¦¨à§à¦°à¦¾ Â· à¦à¦¾à¦°à¦à¦¾à¦¨à¦¾ à¦à¦¨à§à¦à§à¦²à¦¿à¦à§à¦¨à§à¦¸" : "Linora Â· Factory intelligence";
  }, []);
  return [lang, change];
}
