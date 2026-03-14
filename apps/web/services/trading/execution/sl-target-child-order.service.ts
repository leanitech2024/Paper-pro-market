/**
 * SlTargetChildOrderService
 * ─────────────────────────
 * When a parent entry order is FILLED and it was placed with stopLossPrice
 * and/or targetPrice, this service spawns child OPEN orders for each.
 *
 * Architecture:
 *   - Parent order row: stores stopLossPrice, targetPrice (informational).
 *   - Child STOP_LOSS order: status=OPEN, childOrderType='STOP_LOSS', parentOrderId=parent.id
 *   - Child TARGET order:    status=OPEN, childOrderType='TARGET',    parentOrderId=parent.id
 *
 * The SL/Target monitoring engine (sl-target-monitor.service.ts) watches all
 * OPEN child orders every tick and fills/cancels them when LTP crosses their
 * trigger price.
 *
 * One-cancels-other (OCO) semantics:
 *   When the SL child fires  → TARGET sibling is CANCELLED.
 *   When the TARGET child fires → SL sibling is CANCELLED.
 */

import { db } from "@/lib/db";
import { orders } from "@paper-market/core/db";
import { eq, and } from "drizzle-orm";
import { logger } from "@/lib/logger";
import type { Order } from "@paper-market/core/db";
import { OrderStateMachineService } from "@/services/trading/pipeline/order-state-machine.service";

type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class SlTargetChildOrderService {
    /**
     * Spawn SL and/or TARGET child orders for a just-filled parent.
     * Must be called *inside* the same DB transaction as the fill.
     */
    static async spawnChildOrders(
        parentOrder: Order,
        executionPrice: number,
        tx: DbTx
    ): Promise<void> {
        const stopLossPrice = parentOrder.stopLossPrice ? Number(parentOrder.stopLossPrice) : null;
        const targetPrice = parentOrder.targetPrice ? Number(parentOrder.targetPrice) : null;

        if (!stopLossPrice && !targetPrice) return;

        // The child exit side is always opposite to the parent entry side
        const exitSide = parentOrder.side === "BUY" ? "SELL" : "BUY";

        const childBase = {
            userId: parentOrder.userId,
            symbol: parentOrder.symbol,
            instrumentToken: parentOrder.instrumentToken,
            side: exitSide as "BUY" | "SELL",
            quantity: parentOrder.quantity,
            orderType: "LIMIT" as const,
            status: "OPEN" as const,
            parentOrderId: parentOrder.id,
            // Inherit productType and leverage from parent
            productType: parentOrder.productType ?? "CNC",
            leverage: parentOrder.leverage ?? 1,
        };

        const inserts: Array<typeof orders.$inferInsert> = [];

        if (stopLossPrice && stopLossPrice > 0) {
            inserts.push({
                ...childBase,
                limitPrice: stopLossPrice.toString(),
                childOrderType: "STOP_LOSS",
                exitReason: "STOP_LOSS",
            });
        }

        if (targetPrice && targetPrice > 0) {
            inserts.push({
                ...childBase,
                limitPrice: targetPrice.toString(),
                childOrderType: "TARGET",
                exitReason: "TARGET",
            });
        }

        if (inserts.length === 0) return;

        await tx.insert(orders).values(inserts);

        logger.info(
            {
                event: "CHILD_ORDERS_SPAWNED",
                parentOrderId: parentOrder.id,
                userId: parentOrder.userId,
                symbol: parentOrder.symbol,
                exitSide,
                stopLossPrice,
                targetPrice,
                childCount: inserts.length,
            },
            "CHILD_ORDERS_SPAWNED"
        );
    }

    /**
     * Cancel the sibling child order (OCO — one-cancels-other).
     * Called by the monitoring engine after one child is filled.
     */
    static async cancelSibling(
        parentOrderId: string,
        filledChildOrderType: "STOP_LOSS" | "TARGET"
    ): Promise<void> {
        const siblingType = filledChildOrderType === "STOP_LOSS" ? "TARGET" : "STOP_LOSS";

        const siblingIdsQuery = db.select({ id: orders.id })
            .from(orders)
            .where(
                and(
                    eq(orders.parentOrderId, parentOrderId),
                    eq(orders.childOrderType, siblingType),
                    eq(orders.status, "OPEN")
                )
            );

        const cancelled = await OrderStateMachineService.batchTransition(
            siblingIdsQuery,
            "OPEN",
            "CANCELLED"
        );

        if (cancelled.length > 0) {
            logger.info(
                {
                    event: "OCO_SIBLING_CANCELLED",
                    parentOrderId,
                    filledType: filledChildOrderType,
                    cancelledType: siblingType,
                    cancelledIds: cancelled.map((r) => r.id),
                },
                "OCO_SIBLING_CANCELLED"
            );
        }
    }
}

