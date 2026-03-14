import { Pool } from "pg";
import * as schema from "./schema/index.js";
export declare function shouldEnableSsl(databaseUrl: string): boolean;
export declare function createDb(connectionString: string, options?: {
    isDev?: boolean;
}): {
    db: import("drizzle-orm/node-postgres").NodePgDatabase<typeof schema> & {
        $client: Pool;
    };
    pool: Pool;
};
export * from "./schema/index.js";
//# sourceMappingURL=index.d.ts.map