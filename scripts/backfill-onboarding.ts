import "dotenv/config";
import { Client } from "pg";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as dotenv from 'dotenv';

const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../apps/web/.env.local');
dotenv.config({ path: envPath });

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing in .env.local");
  }
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const res = await client.query('UPDATE public.users SET "onboardingCompleted" = true RETURNING id, email');
    console.log(`Backfilled onboardingCompleted = true for ${res.rowCount} users.`);
    console.log("Affected users:", res.rows.map(r => r.email));
  } catch (_) {
    console.error("Failed to backfill database:", error);
  } finally {
    await client.end();
  }
}
main();
