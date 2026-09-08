import type { Lang } from "@mios/shared";

const BENGALI_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

/**
 * Localise digits for display only.
 *
 * Factory staff read `৭` for Line 7, but SQL, citation refs, checklist refs and
 * document ids must stay in ASCII — localising those breaks copy/paste, sorting and
 * the API contract. Use this for table cells, KPI tiles and counts; never for
 * identifiers or anything sent back to the server.
 */
export function toBengaliDigits(value: string): string {
  return value.replace(/\d/g, (d) => BENGALI_DIGITS[Number(d)]!);
}

export function formatNumber(value: number, lang: Lang, options?: Intl.NumberFormatOptions): string {
  const formatted = new Intl.NumberFormat(lang === "bn" ? "bn-BD" : "en-US", options).format(value);
  return formatted;
}

export function formatInteger(value: number, lang: Lang): string {
  return formatNumber(Math.round(value), lang, { maximumFractionDigits: 0 });
}

export function formatBdt(amount: number, lang: Lang): string {
  return formatNumber(amount, lang, {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  });
}

export function formatUsd(amount: number, lang: Lang): string {
  return formatNumber(amount, lang, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

/** Absolute date, e.g. "3 Sep 2026" / "৩ সেপ্টেম্বর ২০২৬". */
export function formatDate(iso: string, lang: Lang): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(lang === "bn" ? "bn-BD" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(iso: string, lang: Lang): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(lang === "bn" ? "bn-BD" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** Relative time for ingestion timestamps, e.g. "4 minutes ago". */
export function formatRelative(iso: string, lang: Lang): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(lang === "bn" ? "bn-BD" : "en-GB", { numeric: "auto" });
  const divisions: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.34524, "week"],
    [12, "month"],
    [Number.POSITIVE_INFINITY, "year"],
  ];
  let value = seconds;
  for (const [amount, unit] of divisions) {
    if (Math.abs(value) < amount) return rtf.format(Math.round(value), unit);
    value /= amount;
  }
  return rtf.format(Math.round(value), "year");
}

export function formatBytes(bytes: number, lang: Lang): string {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${formatNumber(value, lang, { maximumFractionDigits: value < 10 && unit > 0 ? 1 : 0 })} ${units[unit]}`;
}

/**
 * Render a cell value from an analytics result. Values arrive as unknown JSON scalars.
 * Numbers are localised; everything else is stringified without interpretation.
 */
export function formatCell(value: unknown, lang: Lang): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") return formatNumber(value, lang, { maximumFractionDigits: 2 });
  if (typeof value === "boolean") return value ? "✓" : "✗";
  return String(value);
}

/** RFC 4180 CSV. Values keep ASCII digits so the file stays machine-readable. */
export function toCsv(columns: string[], rows: Record<string, unknown>[]): string {
  const escape = (value: unknown) => {
    if (value === null || value === undefined) return "";
    const text = String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [
    columns.map(escape).join(","),
    ...rows.map((row) => columns.map((column) => escape(row[column])).join(",")),
  ].join("\r\n");
}
