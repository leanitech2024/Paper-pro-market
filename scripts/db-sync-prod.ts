import fs from "fs";
import path from "path";
import { Client } from "pg";

type EnvMap = Record<string, string>;

type Phase = "pre" | "post" | "verify";

const ROOT = process.cwd();

const PRE_SYNC_TABLES = [
  "users",
  "account",
  "session",
  "verificationToken",
  "subscriptions",
  "upstox_tokens",
  "watchlists",
  "wallets",
  "transactions",
  "instrument_sync_logs",
];

const POST_SYNC_TABLES = [
  "watchlist_items",
  "orders",
  "positions",
  "trades",
  "ledger_accounts",
  "ledger_entries",
  "ledger_account_balances",
  "write_ahead_journal",
];

const ALL_TABLES = [
  ...PRE_SYNC_TABLES,
  "instruments",
  ...POST_SYNC_TABLES,
];

const SEQUENCE_COLUMNS: Array<{ table: string; column: string }> = [
  { table: "instrument_sync_logs", column: "id" },
  { table: "write_ahead_journal", column: "id" },
  { table: "ledger_entries", column: "globalSequence" },
];

function parseEnvFile(filePath: string): EnvMap {
  const fullPath = path.resolve(ROOT, filePath);
  const text = fs.readFileSync(fullPath, "utf8");
  const env: EnvMap = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    env[key] = value;
  }
  return env;
}

function pickDbUrl(env: EnvMap): string {
  return env.DATABASE_URL || env.DIRECT_URL || "";
}

function maskUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.host;
    const db = u.pathname.replace(/^\//, "");
    return `${u.protocol}//***@${host}/${db}`;
  } catch {
    return "(invalid url)";
  }
}

function q(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

async function withClient(url: string, fn: (client: Client) => Promise<void>): Promise<void> {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await fn(client);
  } finally {
    await client.end();
  }
}

async function truncateAll(prod: Client): Promise<void> {
  const tableList = ALL_TABLES.map(q).join(", ");
  const sql = `TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE;`;
  await prod.query(sql);
}

async function copyTable(local: Client, prod: Client, table: string, batchSize = 500): Promise<number> {
  const tableName = q(table);
  const result = await local.query(`SELECT * FROM ${tableName};`);
  const rows = result.rows;
  if (!rows.length) return 0;

  const columns = Object.keys(rows[0]);
  const colList = columns.map(q).join(", ");

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const values: any[] = [];
    let paramIndex = 1;

    const valuePlaceholders = batch
      .map((row) => {
        const placeholders = columns.map((col) => {
          values.push(row[col]);
          return `$${paramIndex++}`;
        });
        return `(${placeholders.join(", ")})`;
      })
      .join(", ");

    const sql = `INSERT INTO ${tableName} (${colList}) VALUES ${valuePlaceholders};`;
    await prod.query(sql, values);
  }

  return rows.length;
}

async function resetSequences(prod: Client): Promise<void> {
  for (const { table, column } of SEQUENCE_COLUMNS) {
    const seqRes = await prod.query(
      "SELECT pg_get_serial_sequence($1, $2) AS seq",
      [table, column]
    );
    const seq = seqRes.rows[0]?.seq as string | null;
    if (!seq) continue;
    const maxRes = await prod.query(
      `SELECT COALESCE(MAX(${q(column)}), 0) AS max FROM ${q(table)};`
    );
    const maxValue = Number(maxRes.rows[0]?.max ?? 0);
    if (maxValue <= 0) {
      await prod.query(`SELECT setval('${seq}', 1, false);`);
    } else {
      await prod.query(`SELECT setval('${seq}', ${maxValue}, true);`);
    }
  }
}

async function getCounts(client: Client, tables: string[]): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const table of tables) {
    const res = await client.query(`SELECT COUNT(*)::int AS count FROM ${q(table)};`);
    counts[table] = res.rows[0]?.count ?? 0;
  }
  return counts;
}

async function verifyFkConstraints(prod: Client): Promise<Array<{ conname: string; conrelid: string }>> {
  const res = await prod.query(
    "SELECT conname, conrelid::regclass::text AS conrelid FROM pg_constraint WHERE contype = 'f' AND NOT convalidated;"
  );
  return res.rows;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const phaseArg = args.find((a) => a.startsWith("--phase="));
  const phase = (phaseArg?.split("=")[1] as Phase | undefined) || "pre";
  const doTruncate = args.includes("--truncate");
  const skipCopy = args.includes("--skip-copy");

  const localEnv = parseEnvFile(".env.local");
  const prodEnv = parseEnvFile(".env.production");

  const localUrl = pickDbUrl(localEnv);
  const prodUrl = pickDbUrl(prodEnv);

  if (!localUrl || !prodUrl) {
    console.error("Missing DATABASE_URL in .env.local or .env.production");
    process.exit(1);
  }

  if (localUrl === prodUrl) {
    console.error("Local and prod DATABASE_URL are identical. Aborting.");
    process.exit(1);
  }

  console.log("Local:", maskUrl(localUrl));
  console.log("Prod:", maskUrl(prodUrl));

  if (phase === "verify") {
    await withClient(localUrl, async (local) => {
      await withClient(prodUrl, async (prod) => {
        const tables = ALL_TABLES;
        const [localCounts, prodCounts] = await Promise.all([
          getCounts(local, tables),
          getCounts(prod, tables),
        ]);

        console.log("Row counts (local vs prod):");
        for (const table of tables) {
          const l = localCounts[table] ?? 0;
          const p = prodCounts[table] ?? 0;
          const marker = table === "instruments" ? "(skip match)" : l === p ? "OK" : "MISMATCH";
          console.log(`${table}: ${l} vs ${p} ${marker}`);
        }

        const fkIssues = await verifyFkConstraints(prod);
        if (fkIssues.length === 0) {
          console.log("FK validation: OK (no unvalidated constraints)");
        } else {
          console.log("FK validation issues:");
          for (const row of fkIssues) {
            console.log(`${row.conname} on ${row.conrelid}`);
          }
        }
      });
    });
    return;
  }

  const tablesToCopy = phase === "pre" ? PRE_SYNC_TABLES : POST_SYNC_TABLES;

  await withClient(localUrl, async (local) => {
    await withClient(prodUrl, async (prod) => {
      if (doTruncate) {
        console.log("Truncating all prod tables...");
        await truncateAll(prod);
        console.log("Truncate complete.");
      }

      if (!skipCopy) {
        console.log(`Copying tables (${phase})...`);
        for (const table of tablesToCopy) {
          const count = await copyTable(local, prod, table);
          console.log(`${table}: ${count} rows copied`);
        }
      }

      if (phase === "post") {
        console.log("Resetting sequences...");
        await resetSequences(prod);
      }
    });
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
