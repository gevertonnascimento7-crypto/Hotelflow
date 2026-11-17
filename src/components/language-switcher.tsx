"use client";

import { LOCALES, NATIVE_LANGUAGE_NAMES, SHORT_LANGUAGE_LABELS, type Locale } from "@/i18n/config";
import { cn } from "@/lib/cn";
import { useI18n } from "./providers/i18n-provider";

/** Seletor compacto de idioma (telas de login e configuração). */
export function LanguageSwitcher({ className, onChange }: { className?: string; onChange?: (l: Locale) => void }) {
  const { locale, setLocale, t } = useI18n();
  return (
    <div className={cn("flex items-center gap-1 rounded-full bg-subtle p-1", className)} role="radiogroup" aria-label={t("settings.language")}>
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={locale === l}
          title={NATIVE_LANGUAGE_NAMES[l]}
          aria-label={NATIVE_LANGUAGE_NAMES[l]}
          onClick={() => {
            setLocale(l);
            onChange?.(l);
          }}
          className={cn(
            "h-8 min-w-11 rounded-full px-3 text-xs font-semibold transition",
            locale === l ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg",
          )}
        >
          {SHORT_LANGUAGE_LABELS[l]}
        </button>
      ))}
    </div>
  );
}
