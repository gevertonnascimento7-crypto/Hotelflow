"use client";

import { useQuery } from "@tanstack/react-query";
import { must } from "@/lib/hooks";
import { getSupabase } from "@/lib/supabase";
import type { ServiceScriptRow } from "@/lib/types";

export function useCustomScripts() {
  return useQuery({
    queryKey: ["scripts"],
    queryFn: async () => (await must(getSupabase().from("service_scripts").select("*").order("created_at"))) as ServiceScriptRow[],
  });
}
