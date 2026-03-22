import "dotenv/config";
import { Client } from "pg";
import path from "node:path";
import * as dotenv from 'dotenv';
import { fileURLToPath } from "node:url";

const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../apps/web/.env.local');
dotenv.config({ path: envPath });

async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try {
      const res = await c.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='users'
      `);
      console.log("Columns:", res.rows.map(r => r.column_name).join(", "));
  } catch(e) { console.error(e) }
  await c.end();
}
main();
