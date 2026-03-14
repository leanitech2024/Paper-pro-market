import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema/index.js";
export function shouldEnableSsl(databaseUrl) {
    return databaseUrl.toLowerCase().includes("neon.tech");
}
export function createDb(connectionString, options = {}) {
    const useSsl = shouldEnableSsl(connectionString);
    const pool = new Pool({
        connectionString,
        ssl: useSsl ? { rejectUnauthorized: true } : false,
    });
    const db = drizzle(pool, {
        schema,
        logger: options.isDev
    });
    return { db, pool };
}
export * from "./schema/index.js";
