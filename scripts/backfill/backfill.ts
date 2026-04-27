import "dotenv/config";
import { Client } from "pg";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as dotenv from 'dotenv';

const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../apps/web/.env.local');
dotenv.config({ path: envPath });

async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try {
      console.log("Adding column if not exists...");
      await c.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "onboardingCompleted" boolean DEFAULT false NOT NULL;');

      console.log("Backfilling one user...");
      const update = await c.query('UPDATE "users" SET "onboardingCompleted" = true WHERE id IN (SELECT id FROM "users" LIMIT 1) RETURNING email');
      console.log(`Updated user: ${update.rows[0]?.email}`);

      const verify = await c.query('SELECT id, email, "onboardingCompleted" FROM "users" WHERE "onboardingCompleted" = true LIMIT 1');
      console.log("VERIFIED ROW:", verify.rows[0]);
  } catch (e) {
      console.error("DB Error:", e);
  } finally {
      await c.end();
  }
}
main();
