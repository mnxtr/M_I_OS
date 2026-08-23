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
    <span style={{ display: "inline-flex", gap: 4 }}>
      <button
        className="btn btn-ghost"
        style={{
          padding: "4px 10px",
          fontSize: 12,
          ...(lang === "en" ? { borderColor: "var(--accent)", color: "var(--accent)" } : {}),
        }}
        onClick={() => onChange("en")}
      >
        EN
      </button>
      <button
        className="btn btn-ghost"
        style={{
          padding: "4px 10px",
          fontSize: 12,
          ...(lang === "bn" ? { borderColor: "var(--accent)", color: "var(--accent)" } : {}),
        }}
        onClick={() => onChange("bn")}
      >
        বাং
      </button>
    </span>
  );
}
