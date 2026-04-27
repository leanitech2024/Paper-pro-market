import "dotenv/config";
import { Client } from "pg";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as dotenv from 'dotenv';

const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../apps/web/.env.local');
dotenv.config({ path: envPath });

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("No DATABASE_URL");
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try {
      console.log("Creating admin_audit_logs table if not exists...");
      await c.query(`
        CREATE TABLE IF NOT EXISTS "admin_audit_logs" (
            "id" text PRIMARY KEY NOT NULL,
            "adminId" text NOT NULL,
            "targetUserId" text,
            "action" text NOT NULL,
            "details" jsonb NOT NULL,
            "createdAt" timestamp DEFAULT now() NOT NULL
        );
      `);

      await c.query(`CREATE INDEX IF NOT EXISTS "idx_admin_audit_logs_admin_id" ON "admin_audit_logs" USING btree ("adminId");`);
      await c.query(`CREATE INDEX IF NOT EXISTS "idx_admin_audit_logs_target_user_id" ON "admin_audit_logs" USING btree ("targetUserId");`);
      await c.query(`CREATE INDEX IF NOT EXISTS "idx_admin_audit_logs_created_at" ON "admin_audit_logs" USING btree ("createdAt");`);

      await c.query(`
        DO $$ BEGIN
         ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_adminId_users_id_fk" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
        EXCEPTION
         WHEN duplicate_object THEN null;
        END $$;
      `);

      await c.query(`
        DO $$ BEGIN
         ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_targetUserId_users_id_fk" FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
        EXCEPTION
         WHEN duplicate_object THEN null;
        END $$;
      `);

      console.log("admin_audit_logs table created successfully.");
  } catch (e) {
      console.error("DB Error:", e);
  } finally {
      await c.end();
  }
}
main();
