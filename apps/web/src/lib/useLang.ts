import { useCallback, useEffect, useState } from "react";
import { Lang, loadLang, saveLang } from "./i18n";

export function useLang(): [Lang, (lang: Lang) => void] {
  const [lang, setLang] = useState<Lang>(loadLang);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const change = useCallback((next: Lang) => {
    saveLang(next);
    setLang(next);
  }, []);
  return [lang, change];
}
