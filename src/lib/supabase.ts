"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(url && key);

let client: SupabaseClient | null = null;

/** Cliente único do navegador. A segurança vem das políticas RLS do banco. */
export function getSupabase(): SupabaseClient {
  if (!client) {
    if (!url || !key) throw new Error("Supabase não configurado");
    client = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "implicit",
        storageKey: "hotelflow-auth",
      },
      realtime: { params: { eventsPerSecond: 5 } },
    });
  }
  return client;
}
