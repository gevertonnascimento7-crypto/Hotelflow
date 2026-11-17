"use client";

import { useQuery } from "@tanstack/react-query";
import { useMember } from "@/components/providers/auth-provider";
import { must } from "@/lib/hooks";
import { getSupabase } from "@/lib/supabase";
import type { TrainingModuleRow, TrainingProgress } from "@/lib/types";

export function useCustomModules() {
  return useQuery({
    queryKey: ["training", "modules"],
    queryFn: async () => (await must(getSupabase().from("training_modules").select("*").order("created_at"))) as TrainingModuleRow[],
  });
}

/** Progresso do usuário (e da equipe, para gestores — a RLS decide). */
export function useProgress() {
  const { userId } = useMember();
  return useQuery({
    queryKey: ["training", "progress", userId],
    queryFn: async () => (await must(getSupabase().from("training_progress").select("user_id, module_key, score, completed_at"))) as TrainingProgress[],
  });
}

export const routeKey = (moduleKey: string) => moduleKey.replace("builtin:", "").replace("custom:", "custom-");
export const moduleKeyFromRoute = (key: string) => (key.startsWith("custom-") ? `custom:${key.slice(7)}` : `builtin:${key}`);
