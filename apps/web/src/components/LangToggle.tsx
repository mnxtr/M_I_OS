"use client";

import { Lang } from "@/lib/i18n";

export default function LangToggle({
  lang,
  onChange,
}: {
  lang: Lang;
  onChange: (lang: Lang) => void;
}) {
  return (
    <span className="lang-toggle" role="group" aria-label="Language / ভাষা">
      <button
        type="button"
        className={lang === "en" ? "is-active" : ""}
        aria-pressed={lang === "en"}
        onClick={() => onChange("en")}
      >
        EN
      </button>
      <button
        type="button"
        className={lang === "bn" ? "is-active" : ""}
        aria-pressed={lang === "bn"}
        onClick={() => onChange("bn")}
      >
        বাং
      </button>
    </span>
  );
}
