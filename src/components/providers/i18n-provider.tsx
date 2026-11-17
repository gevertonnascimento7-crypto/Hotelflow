"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, normalizeLocale, type Locale } from "@/i18n/config";
import { createTranslator, type Translator } from "@/i18n/translate";

interface I18nValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translator;
}

const I18nContext = createContext<I18nValue | null>(null);

function readStoredLocale(): Locale {
  try {
    return normalizeLocale(localStorage.getItem(LOCALE_STORAGE_KEY));
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      /* armazenamento indisponível: a preferência continua salva na conta */
    }
  }, []);

  const value = useMemo(() => ({ locale, setLocale, t: createTranslator(locale) }), [locale, setLocale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n fora do I18nProvider");
  return ctx;
}
