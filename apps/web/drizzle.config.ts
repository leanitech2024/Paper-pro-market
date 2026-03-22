import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env" });
config({ path: ".env.local" });

export default defineConfig({
  schema: "../../packages/core/dist/db/schema/index.js",
  out: "../../drizzle", // migrations stay at repo root until Phase 4
  dialect: "postgresql",
  dbCredentials: {
    // Use direct (non-pooler) URL for migrations — pooler has DDL limitations
    url: process.env.DIRECT_URL || process.env.DATABASE_URL!,
  },
});
