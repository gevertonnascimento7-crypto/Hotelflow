import type { MessageKey } from "@/i18n/types";
import { ptBR } from "@/i18n/messages/pt-BR";

/** Converte erros do Supabase/RPC (ex.: "HF:forbidden") em chaves de tradução. */
export function errorKey(error: unknown): MessageKey {
  const message =
    typeof error === "string"
      ? error
      : error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message)
        : "";
  const code = error && typeof error === "object" && "code" in error ? String((error as { code: unknown }).code) : "";

  const match = message.match(/HF:([a-z_]+)/);
  if (match && match[1] in ptBR.errors) return `errors.${match[1]}` as MessageKey;
  if (message in ptBR.errors) return `errors.${message}` as MessageKey;
  if (code === "42501" || /row-level security|permission denied/i.test(message)) return "errors.forbidden";
  if (/Failed to fetch|NetworkError|network|Load failed/i.test(message)) return "errors.network";
  if (/JWT expired|invalid JWT|not authenticated/i.test(message)) return "errors.not_authenticated";
  return "errors.generic";
}

export function isMissingSchemaError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  return e.code === "42P01" || e.code === "PGRST205" || e.code === "PGRST202" || /schema cache|does not exist/i.test(e.message ?? "");
}
