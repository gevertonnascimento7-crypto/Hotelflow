import { en } from "./messages/en";
import { es } from "./messages/es";
import { ptBR } from "./messages/pt-BR";
import type { Locale } from "./config";
import type { MessageKey, Messages, Vars } from "./types";

export const dictionaries: Record<Locale, Messages> = { "pt-BR": ptBR, en, es };

function lookup(dict: unknown, key: string): string | undefined {
  let node: unknown = dict;
  for (const part of key.split(".")) {
    if (node && typeof node === "object" && part in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof node === "string" ? node : undefined;
}

export function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = vars[name];
    return value === undefined || value === null ? match : String(value);
  });
}

/** Tradução com fallback para pt-BR (nunca mostra a chave crua ao usuário). */
export function translate(locale: Locale, key: MessageKey | string, vars?: Vars): string {
  const text = lookup(dictionaries[locale], key) ?? lookup(ptBR, key) ?? key;
  return interpolate(text, vars);
}

export function hasMessage(locale: Locale, key: string): boolean {
  return lookup(dictionaries[locale], key) !== undefined;
}

export type Translator = (key: MessageKey, vars?: Vars) => string;

export function createTranslator(locale: Locale): Translator {
  return (key, vars) => translate(locale, key, vars);
}
