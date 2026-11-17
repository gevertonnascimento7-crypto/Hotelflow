import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost:54321";
export const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const admin = () => createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
export const anon = () => createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

let seq = 0;
export const PASSWORD = "senha-de-teste-123";

export interface TestUser {
  id: string;
  email: string;
  client: SupabaseClient;
  token: string;
}

/** Cria um usuário confirmado e devolve um cliente autenticado como ele. */
export async function newUser(name: string, locale = "pt-BR"): Promise<TestUser> {
  const email = `${name.toLowerCase().replace(/\W/g, "")}.${Date.now()}.${++seq}@hotelflow.test`;
  const { data, error } = await admin().auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: name, locale },
  });
  if (error) throw error;
  const client = anon();
  const { data: s, error: e2 } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (e2) throw e2;
  return { id: data.user.id, email, client, token: s.session!.access_token };
}

export async function createHotel(user: TestUser, name: string) {
  const { data, error } = await user.client.rpc("create_hotel", { p_name: name, p_city: "Florianópolis" });
  if (error) throw error;
  const { data: code } = await user.client.rpc("get_invite_code");
  return { hotelId: data as string, code: code as string };
}

export async function join(user: TestUser, code: string, department = "reception") {
  const { data, error } = await user.client.rpc("join_hotel", { p_code: code, p_department: department });
  if (error) throw error;
  return data as string;
}

export function isoDate(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
