export const LOCALES = ["pt-BR", "en", "es"] as const;
export type Locale = (typeof LOCALES)[number];

/** Português brasileiro é sempre o idioma padrão. */
export const DEFAULT_LOCALE: Locale = "pt-BR";

/** Nome de cada idioma no próprio idioma (usado no seletor). */
export const NATIVE_LANGUAGE_NAMES: Record<Locale, string> = {
  "pt-BR": "Português (Brasil)",
  en: "English",
  es: "Español",
};

export const SHORT_LANGUAGE_LABELS: Record<Locale, string> = {
  "pt-BR": "PT",
  en: "EN",
  es: "ES",
};

/** Código BCP-47 para síntese de voz (pronúncia). */
export const SPEECH_LANG: Record<Locale, string> = {
  "pt-BR": "pt-BR",
  en: "en-US",
  es: "es-ES",
};

export const LOCALE_STORAGE_KEY = "hf-locale";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function normalizeLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
