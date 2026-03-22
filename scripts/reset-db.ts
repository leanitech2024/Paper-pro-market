/* 
$env:DATABASE_URL="<db_url>";
 pnpm exec tsx scripts/reset-db.ts --yes
*/

import "dotenv/config";
import { Client } from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as dotenv from "dotenv";

type ResetMode = "truncate" | "drop-schemas";

function resolveRepoRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
}

function loadEnvFromCandidates() {
  const repoRoot = resolveRepoRoot();
  const candidates = [
    process.env.ENV_FILE,
    path.join(repoRoot, ".env.production"),
    path.join(repoRoot, ".env.local"),
    path.join(repoRoot, "apps", "web", ".env.local"),
  ].filter(Boolean) as string[];

  for (const envPath of candidates) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
      console.log(`Loaded env: ${envPath}`);
      return;
    }
  }
}

function parseArgs() {
  const args = new Set(process.argv.slice(2));
  return {
    yes: args.has("--yes"),
    includeDrizzle: args.has("--include-drizzle"),
    dryRun: args.has("--dry-run"),
    mode: (args.has("--drop-schemas") ? "drop-schemas" : "truncate") as ResetMode,
  };
}

function safeDbLabel(connectionString: string) {
  try {
    const u = new URL(connectionString);
    const db = u.pathname.replace(/^\//, "") || "(unknown-db)";
    const user = u.username || "(unknown-user)";
    const host = u.host || "(unknown-host)";
    return `${user}@${host}/${db}`;
  } catch {
    return "(unparsable DATABASE_URL)";
  }
}

async function main() {
  loadEnvFromCandidates();

  const { yes, includeDrizzle, dryRun, mode } = parseArgs();
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL (or DIRECT_URL) is missing.");
  }

  const target = safeDbLabel(connectionString);
  console.log(`Target DB: ${target}`);

  if (!yes) {
    console.error("Refusing to reset database without explicit confirmation.");
    console.error("Re-run with: npx tsx scripts/reset-db.ts --yes");
    process.exit(1);
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    const { rows: schemaRows } = await client.query<{ schema_name: string }>(`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema')
        AND schema_name NOT LIKE 'pg_toast%'
        AND schema_name NOT LIKE 'pg_temp_%'
        AND schema_name NOT LIKE 'pg_toast_temp_%'
      ORDER BY schema_name
    `);

    const schemaNames = schemaRows
      .map((r) => r.schema_name)
      .filter((s) => (includeDrizzle ? true : s !== "drizzle"));

    if (schemaNames.length === 0) {
      console.log("No user schemas found. Nothing to reset.");
      return;
    }

    if (mode === "drop-schemas") {
      console.log(`Reset mode: drop schemas (${schemaNames.join(", ")})`);
      if (dryRun) {
        console.log("Dry run enabled. No changes made.");
        return;
      }

      await client.query("BEGIN");
      for (const schema of schemaNames) {
        await client.query(`DROP SCHEMA "${schema}" CASCADE`);
      }
      await client.query(`CREATE SCHEMA IF NOT EXISTS "public"`);
      await client.query(`GRANT ALL ON SCHEMA "public" TO public`);
      await client.query(`GRANT ALL ON SCHEMA "public" TO current_user`);
      await client.query("COMMIT");

      console.log("Schemas dropped and public schema recreated.");
      return;
    }

    const { rows: tableRows } = await client.query<{ schemaname: string; tablename: string }>(
      `
        SELECT schemaname, tablename
        FROM pg_tables
        WHERE schemaname = ANY($1)
        ORDER BY schemaname, tablename
      `,
      [schemaNames]
    );

    if (tableRows.length === 0) {
      console.log("No tables found to truncate.");
      return;
    }

    const qualifiedTables = tableRows
      .map((r) => `"${r.schemaname}"."${r.tablename}"`)
      .join(", ");

    console.log(`Reset mode: truncate (${tableRows.length} tables)`);
    if (dryRun) {
      console.log("Dry run enabled. No changes made.");
      return;
    }

    await client.query(`TRUNCATE TABLE ${qualifiedTables} RESTART IDENTITY CASCADE`);
    console.log("All tables truncated successfully.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Reset failed:", err);
  process.exit(1);
});
