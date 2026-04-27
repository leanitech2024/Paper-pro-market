import fs from "fs";
import { Client } from "pg";

function parseEnv(file: string) {
  const text = fs.readFileSync(file, "utf8");
  const env: Record<string, string> = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return env;
}

async function check(url: string, label: string) {
  const client = new Client({ connectionString: url });
  await client.connect();
  const res = await client.query("select to_regclass('public.subscriptions') as name");
  console.log(label, res.rows[0]?.name ?? null);
  await client.end();
}

async function main() {
  const local = parseEnv(".env.local");
  const prod = parseEnv(".env.production");
  await check(local.DATABASE_URL, "local");
  await check(prod.DATABASE_URL, "prod");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
