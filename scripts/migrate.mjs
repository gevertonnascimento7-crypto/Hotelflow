// Aplica as migrações de supabase/migrations no Postgres do Supabase.
// Roda automaticamente no build (Vercel) quando há uma URL de banco disponível,
// por exemplo a POSTGRES_URL_NON_POOLING criada pela integração Supabase da Vercel.
// Sem URL, apenas avisa: o banco pode ser criado colando supabase/schema.sql no SQL Editor.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const required = process.argv.includes("--required");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "supabase", "migrations");

const raw =
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.SUPABASE_DB_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL;

function done(code) {
  process.exit(code);
}

if (!raw) {
  console.log("[hotelflow] Nenhuma URL de banco definida: migrações não aplicadas automaticamente.");
  console.log("[hotelflow] Crie o banco colando supabase/schema.sql no SQL Editor do Supabase.");
  done(required ? 1 : 0);
}

const url = new URL(raw);
for (const p of ["sslmode", "supa", "pgbouncer", "sslrootcert"]) url.searchParams.delete(p);
const local = ["localhost", "127.0.0.1"].includes(url.hostname);

const client = new pg.Client({
  connectionString: url.toString(),
  ssl: local ? false : { rejectUnauthorized: false },
  connectionTimeoutMillis: 20000,
  statement_timeout: 120000,
});

try {
  await client.connect();
  await client.query(`
    create schema if not exists hotelflow_meta;
    create table if not exists hotelflow_meta.migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    );
  `);
  const { rows } = await client.query("select name from hotelflow_meta.migrations");
  const applied = new Set(rows.map((r) => r.name));
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  let count = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    process.stdout.write(`[hotelflow] aplicando ${file}... `);
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query("insert into hotelflow_meta.migrations (name) values ($1)", [file]);
      await client.query("commit");
      console.log("ok");
      count++;
    } catch (err) {
      await client.query("rollback");
      throw err;
    }
  }
  console.log(count ? `[hotelflow] ${count} migração(ões) aplicada(s).` : "[hotelflow] Banco já está atualizado.");
  await client.end();
  done(0);
} catch (err) {
  console.warn(`[hotelflow] Não foi possível aplicar as migrações: ${err.message}`);
  console.warn("[hotelflow] Alternativa: cole supabase/schema.sql no SQL Editor do Supabase.");
  try {
    await client.end();
  } catch {}
  done(required ? 1 : 0);
}
