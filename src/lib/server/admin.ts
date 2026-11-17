import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { generateVAPIDKeys } from "web-push";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

export const isPushConfigured = Boolean(url && serviceKey);

let admin: SupabaseClient | null = null;

/** Cliente com service_role: SOMENTE no servidor. Nunca expor ao navegador. */
export function getAdmin(): SupabaseClient {
  if (!url || !serviceKey) throw new Error("service role não configurada");
  if (!admin) admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return admin;
}

/** Valida o token do usuário que chamou a rota. */
export async function getCaller(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await getAdmin().auth.getUser(token);
  return error ? null : data.user;
}

let vapid: { publicKey: string; privateKey: string } | null = null;

/** Chaves VAPID geradas uma única vez e guardadas no banco (tabela sem acesso público). */
export async function getVapidKeys() {
  if (vapid) return vapid;
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    vapid = { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
    return vapid;
  }
  const db = getAdmin();
  const read = async () => {
    const { data } = await db.from("app_secrets").select("key, value").in("key", ["vapid_public", "vapid_private"]);
    const map = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
    return map.vapid_public && map.vapid_private ? { publicKey: map.vapid_public, privateKey: map.vapid_private } : null;
  };
  let keys = await read();
  if (!keys) {
    const generated = generateVAPIDKeys();
    await db.from("app_secrets").upsert(
      [
        { key: "vapid_public", value: generated.publicKey },
        { key: "vapid_private", value: generated.privateKey },
      ],
      { onConflict: "key", ignoreDuplicates: true },
    );
    keys = (await read()) ?? generated;
  }
  vapid = keys;
  return keys;
}
