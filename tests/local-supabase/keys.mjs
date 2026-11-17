// Gera as chaves JWT (anon e service_role) do Supabase local de testes.
import { createHmac } from "node:crypto";

export const JWT_SECRET = process.env.LOCAL_JWT_SECRET ?? "super-secret-jwt-token-with-at-least-32-characters-long";

function b64url(input) {
  return Buffer.from(input).toString("base64url");
}

export function sign(payload, secret = JWT_SECRET) {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

const exp = Math.floor(Date.now() / 1000) + 10 * 365 * 24 * 3600;
export const ANON_KEY = sign({ iss: "supabase-demo", role: "anon", exp });
export const SERVICE_ROLE_KEY = sign({ iss: "supabase-demo", role: "service_role", exp });

if (import.meta.url === `file://${process.argv[1]}`) {
  const what = process.argv[2];
  if (what === "anon") console.log(ANON_KEY);
  else if (what === "service") console.log(SERVICE_ROLE_KEY);
  else console.log(JSON.stringify({ JWT_SECRET, ANON_KEY, SERVICE_ROLE_KEY }, null, 2));
}
