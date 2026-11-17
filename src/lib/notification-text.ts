import type { Locale } from "@/i18n/config";
import { hasMessage, translate } from "@/i18n/translate";
import { formatDate, formatMinutes } from "./format";

/** Monta título e texto de um aviso no idioma do destinatário (cliente e servidor). */
export function renderNotification(locale: Locale, type: string, data: Record<string, unknown>): { title: string; body: string } {
  const base = hasMessage(locale, `notifications.types.${type}.title`) ? `notifications.types.${type}` : "notifications.types.default";
  const vars: Record<string, string> = {};
  for (const [k, v] of Object.entries(data ?? {})) vars[k] = v === null || v === undefined ? "" : String(v);

  if (typeof data?.date === "string") vars.date = formatDate(data.date, locale, { day: "2-digit", month: "short" });
  if (typeof data?.end === "string") vars.end = formatDate(data.end, locale, { day: "2-digit", month: "short" });
  if (typeof data?.minutes === "number") vars.hours = formatMinutes(data.minutes);
  if (typeof data?.status === "string") vars.status = translate(locale, `maintenance.statuses.${data.status}`);

  return { title: translate(locale, `${base}.title`, vars), body: translate(locale, `${base}.body`, vars) };
}
