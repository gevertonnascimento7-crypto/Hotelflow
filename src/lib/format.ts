import type { Locale } from "@/i18n/config";

/** Datas no formato YYYY-MM-DD no fuso local (sem conversão para UTC). */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseISODate(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function startOfWeek(date: Date): Date {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = copy.getDay(); // 0 = domingo
  const diff = day === 0 ? -6 : 1 - day; // semana começa na segunda
  return addDays(copy, diff);
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function formatDate(value: string | Date, locale: Locale, opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" }): string {
  const date = typeof value === "string" ? (value.length <= 10 ? parseISODate(value) : new Date(value)) : value;
  return new Intl.DateTimeFormat(locale, opts).format(date);
}

export function capitalizeFirst(text: string): string {
  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}

export function formatWeekday(value: string | Date, locale: Locale): string {
  return capitalizeFirst(formatDate(value, locale, { weekday: "short", day: "2-digit", month: "short" }));
}

export function formatDateTime(value: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function formatTime(value: string | null | undefined): string {
  return value ? value.slice(0, 5) : "";
}

/** Tempo relativo curto: "há 5 min", "5 min ago", "hace 5 min". */
export function formatRelative(value: string, locale: Locale): string {
  const diff = (new Date(value).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 7) return rtf.format(Math.round(diff / 86400), "day");
  return formatDate(value, locale);
}

/** 150 → "+2h30", -60 → "−1h", 0 → "0h". */
export function formatMinutes(total: number, signed = true): string {
  const sign = total > 0 ? (signed ? "+" : "") : total < 0 ? "−" : "";
  const abs = Math.abs(total);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}h${m ? String(m).padStart(2, "0") : ""}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}
