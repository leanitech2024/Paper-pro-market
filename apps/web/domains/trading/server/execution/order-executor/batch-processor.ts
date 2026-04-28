import { db } from "@/lib/db";
import { orders } from "@paper-market/core/db";
import { logger } from "@/lib/logger";
import { ApiError } from "@/lib/errors";
import { and, asc, eq, or, sql } from "drizzle-orm";
import { OrderStateMachineService } from "@/domains/trading/server/pipeline/order-state-machine.service";
import { isTradingEnabled } from "@/lib/system-control";

export class OrderExecutionBatchProcessor {
    static async executeBatch(
        tryExecuteCallback: (order: typeof orders.$inferSelect) => Promise<boolean>
    ): Promise<number> {
        try {
            if (!isTradingEnabled()) {
                return 0;
            }

            const staleThreshold = new Date(Date.now() - 30_000);
            
            // Recover stale PROCESSING orders
            const staleProcessing = await db
                .update(orders)
                .set({ status: "OPEN", updatedAt: new Date() })
                .where(
                    and(
                        eq(orders.status, "PROCESSING"),
                        sql`${orders.updatedAt} < ${staleThreshold}`
                    )
                )
                .returning({ id: orders.id });

            if (staleProcessing.length > 0) {
                logger.warn(
                    { count: staleProcessing.length, ids: staleProcessing.map((o) => o.id) },
                    "Recovered stale PROCESSING orders back to OPEN"
                );
            }

            const batchSize = 100;
            const claimCandidates = db
                .select({ id: orders.id })
                .from(orders)
                .where(
                    and(
                        eq(orders.status, "OPEN"),
                        sql`${orders.childOrderType} IS NULL`
                    )
                )
                .orderBy(asc(orders.createdAt))
                .limit(batchSize);

            const claimedOrders = await OrderStateMachineService.batchTransition(claimCandidates, "OPEN", "PROCESSING");

            if (claimedOrders.length === 0) return 0;

            let executedCount = 0;

            const reopenOrder = async (orderId: string) => {
                try {
                    await OrderStateMachineService.transition(orderId, "PROCESSING", "OPEN");
                } catch (err) {
                    if (err instanceof ApiError && (err.code === "TRANSITION_FAILED" || err.code === "INVALID_STATE_TRANSITION")) {
                        logger.debug(
                            { err: err, orderId },
                            "Order already left PROCESSING; skipping reopen"
                        );
                        return;
                    }
                    throw err;
                }
            };

            for (const order of claimedOrders) {
                try {
                    const executed = await tryExecuteCallback(order);
                    if (executed) {
                        executedCount++;
                    } else {
                        await reopenOrder(order.id);
                    }
                } catch (err) {
                    logger.error(
                        { err: err, orderId: order.id },
                        "Failed to execute individual order"
                    );
                    await reopenOrder(order.id);
                }
            }

            return executedCount;
        } catch (err) {
            logger.error({ err: err }, "Batch processor failed");
            throw new ApiError("Batch processor failed", 500, "BATCH_PROCESSOR_FAILED");
        }
    }
}
