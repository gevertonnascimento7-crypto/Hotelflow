// Junta todas as migrações em supabase/schema.sql (para colar no SQL Editor do Supabase).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "supabase", "migrations");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const header = `-- =====================================================================
-- HotelFlow — banco de dados completo (gerado por scripts/bundle-schema.mjs)
-- Como usar: Supabase → SQL Editor → New query → cole TODO este arquivo → Run.
-- É seguro executar novamente: o script é idempotente.
-- =====================================================================\n\n`;
const body = files.map((f) => `-- >>> ${f}\n` + fs.readFileSync(path.join(dir, f), "utf8")).join("\n\n");
fs.writeFileSync(path.join(root, "supabase", "schema.sql"), header + body);
console.log(`supabase/schema.sql gerado com ${files.length} migrações.`);
