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

async function checkUser(url: string, label: string, email: string) {
  const client = new Client({ connectionString: url });
  await client.connect();
  const res = await client.query('SELECT id, email FROM "users" WHERE email = $1', [email]);
  console.log(label, res.rows.length > 0 ? `found ${email}` : `missing ${email}`);
  await client.end();
}

async function main() {
  const local = parseEnv(".env.local");
  const prod = parseEnv(".env.production");
  await checkUser(local.DATABASE_URL, "local", "john@gmail.com");
  await checkUser(prod.DATABASE_URL, "prod", "john@gmail.com");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
