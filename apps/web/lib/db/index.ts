import { createDb } from "@paper-market/core/db";
import { config } from "../config";
import { logger } from "../logger";

// Initialize DB using the shared core utility
const { db: drizzleDb, pool: dbPool } = createDb(config.db.url, { isDev: config.isDev });

export const db = drizzleDb;
export const pool = dbPool;

// Simple connectivity check (can be used in health checks)
export async function checkDbConnection() {
    try {
        await dbPool.query('SELECT 1');
        logger.info("Database connection established successfully.");
        return true;
    } catch (error) {
        logger.error({ err: error }, "Failed to connect to the database.");
        return false;
    }
}
