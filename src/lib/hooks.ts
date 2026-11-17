"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { useToast } from "@/components/providers/toast-provider";
import type { MessageKey } from "@/i18n/types";
import { errorKey } from "./errors";
import { dispatchPush } from "./push";
import { getSupabase } from "./supabase";
import type { Profile } from "./types";

/** Colaboradores do hotel (a RLS só devolve o próprio hotel). */
export function useMembers(includeInactive = false) {
  const { hotel } = useAuth();
  const query = useQuery({
    queryKey: ["members", hotel?.id],
    enabled: Boolean(hotel),
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from("profiles")
        .select("id, hotel_id, full_name, role, department, locale, theme, active, created_at")
        .eq("hotel_id", hotel!.id)
        .order("full_name");
      if (error) throw error;
      return data as Profile[];
    },
  });
  const members = useMemo(() => (query.data ?? []).filter((m) => includeInactive || m.active), [query.data, includeInactive]);
  const byId = useMemo(() => new Map((query.data ?? []).map((m) => [m.id, m])), [query.data]);
  const nameOf = useCallback((id: string | null | undefined) => (id ? byId.get(id)?.full_name || "—" : "—"), [byId]);
  return { ...query, members, byId, nameOf };
}

/**
 * Executa uma ação no servidor com feedback padronizado:
 * mostra erro traduzido, mensagem de sucesso, atualiza as listas e dispara push.
 */
export function useAction() {
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);

  const run = useCallback(
    async <T,>(
      fn: () => Promise<T>,
      opts: { success?: MessageKey; invalidate?: string[][]; push?: boolean } = {},
    ): Promise<{ ok: true; data: T } | { ok: false }> => {
      setPending(true);
      try {
        const data = await fn();
        if (opts.success) toast(t(opts.success), "success");
        for (const key of opts.invalidate ?? []) await queryClient.invalidateQueries({ queryKey: key });
        if (opts.push !== false) dispatchPush();
        return { ok: true, data };
      } catch (err) {
        console.error(err);
        toast(t(errorKey(err)), "error");
        return { ok: false };
      } finally {
        setPending(false);
      }
    },
    [queryClient, t, toast],
  );

  return { run, pending };
}

/** Lança o erro do Supabase (para usar dentro de useAction/useQuery). */
export async function must<T>(promise: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  const { data, error } = await promise;
  if (error) throw error;
  return data;
}
