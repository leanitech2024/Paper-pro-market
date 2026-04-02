import "dotenv/config";
import { Client } from "pg";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as dotenv from 'dotenv';

const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../apps/web/.env.local');
dotenv.config({ path: envPath });

async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  // We don't quote onboardingCompleted so postgres lowercases it, or we quote it exactly. Drizzle usually quotes camelCase.
  try {
      const res = await c.query('SELECT id, email, "onboardingCompleted" FROM users LIMIT 1');
      console.log("User onboardingCompleted state:", res.rows[0]);
  } catch (_) { console.error(e) }
  await c.end();
}
main();
