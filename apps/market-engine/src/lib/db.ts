import "../bootstrap-env.js";
import { createDb } from "@paper-market/core/db";
import { logger } from "./logger.js";

const connectionString = process.env.DATABASE_URL || "";
type CoreDb = ReturnType<typeof createDb>["db"];
type CorePool = ReturnType<typeof createDb>["pool"];

const connection = createDb(connectionString, {
  isDev: process.env.NODE_ENV === "development",
});
const db: CoreDb = connection.db;
const pool: CorePool = connection.pool;

export { db };

export async function checkDbConnection() {
  try {
    if (!connectionString) {
      logger.error(
        "DATABASE_URL is missing; cannot initialize market-engine database connection."
      );
      return false;
    }
    await pool.query("SELECT 1");
    logger.info("Database connection established successfully.");
    return true;
  } catch (error) {
    logger.error({ err: error }, "Failed to connect to the database.");
    return false;
  }
}
