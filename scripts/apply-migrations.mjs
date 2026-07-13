#!/usr/bin/env node
/**
 * Apply SQL migrations in supabase/migrations to Supabase Postgres.
 *
 * Usage:
 *   SUPABASE_DB_URL=postgresql://... node scripts/apply-migrations.mjs
 *
 * Or set:
 *   NEXT_PUBLIC_SUPABASE_URL + SUPABASE_DB_PASSWORD
 *   (builds a direct connection string to db.<ref>.supabase.co)
 */
import { readdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function buildDbUrl() {
  if (process.env.SUPABASE_DB_URL || process.env.DATABASE_URL) {
    return process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!supabaseUrl || !password) return null;

  // https://xyzabc.supabase.co -> xyzabc
  const host = new URL(supabaseUrl).hostname; // xxx.supabase.co
  const ref = host.split(".")[0];
  const encoded = encodeURIComponent(password);
  // Direct connection (port 5432). Use session pooler if your network requires it.
  return `postgresql://postgres:${encoded}@db.${ref}.supabase.co:5432/postgres`;
}

async function main() {
  const connectionString = buildDbUrl();
  if (!connectionString) {
    console.error(
      "Missing DB URL. Set SUPABASE_DB_URL or NEXT_PUBLIC_SUPABASE_URL + SUPABASE_DB_PASSWORD",
    );
    process.exit(1);
  }

  const migrationsDir = join(root, "supabase/migrations");
  const files = (await readdir(migrationsDir))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (!files.length) {
    console.error("No migrations found");
    process.exit(1);
  }

  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  console.log(`Connecting… (${files.length} migrations)`);
  await client.connect();

  await client.query(`
    create table if not exists public.schema_migrations (
      id text primary key,
      applied_at timestamptz not null default now()
    );
  `);

  for (const file of files) {
    const { rows } = await client.query(
      "select 1 from public.schema_migrations where id = $1",
      [file],
    );
    if (rows.length) {
      console.log(`skip  ${file}`);
      continue;
    }

    const sql = await readFile(join(migrationsDir, file), "utf8");
    console.log(`apply ${file}`);
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query(
        "insert into public.schema_migrations (id) values ($1)",
        [file],
      );
      await client.query("commit");
      console.log(`  ok   ${file}`);
    } catch (e) {
      await client.query("rollback");
      console.error(`  FAIL ${file}`, e.message);
      process.exitCode = 1;
      break;
    }
  }

  await client.end();
  console.log(process.exitCode ? "Done with errors" : "All migrations applied");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
