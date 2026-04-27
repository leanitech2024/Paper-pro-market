import { db } from "@/lib/db";
import { trades } from "@paper-market/core/db";
import { eq, desc, count } from "drizzle-orm";
import { logger } from "@/lib/logger";

export interface TradeQueryParams {
    limit?: number;
    offset?: number;
}

export interface PaginatedTrades<T> {
    data: T[];
    total: number;
    hasMore: boolean;
}

export class TradeService {
    /**
     * Get trades for a user with DB-level pagination.
     * Defaults to no limit (returns all) if neither limit nor offset is supplied.
     */
    static async getUserTrades(
        userId: string,
        { limit, offset = 0 }: TradeQueryParams = {}
    ): Promise<PaginatedTrades<typeof trades.$inferSelect>> {
        try {
            const baseQuery = db
                .select()
                .from(trades)
                .where(eq(trades.userId, userId))
                .orderBy(desc(trades.executedAt));

            const [data, [countRow]] = await Promise.all([
                limit !== undefined
                    ? baseQuery.limit(limit).offset(offset)
                    : baseQuery,
                db
                    .select({ value: count() })
                    .from(trades)
                    .where(eq(trades.userId, userId)),
            ]);

            const total = countRow?.value ?? 0;

            return {
                data,
                total,
                hasMore: limit !== undefined ? offset + data.length < total : false,
            };
        } catch (err) {
            logger.error({ err: err, userId }, "Failed to get user trades");
            throw err;
        }
    }
}
