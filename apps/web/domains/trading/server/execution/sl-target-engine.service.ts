/**
 * SlTargetEngineService
 * Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
 * Runs periodically (called from the market-tick job) and checks every OPEN
 * child SL / Target order against the current LTP.
 *
 * Trigger logic:
 *   STOP_LOSS child (SELL for a BUY position):
 *     Triggers when LTP Ã¢â€°Â¤ limitPrice  (price fell to/below SL)
 *
 *   TARGET child (SELL for a BUY position):
 *     Triggers when LTP Ã¢â€°Â¥ limitPrice  (price rose to/above target)
 *
 *   Mirror logic applies for SELL positions:
 *   STOP_LOSS child (BUY to exit short):
 *     Triggers when LTP Ã¢â€°Â¥ limitPrice  (price rose to/above SL)
 *
 *   TARGET child (BUY to exit short):
 *     Triggers when LTP Ã¢â€°Â¤ limitPrice  (price fell to/below target)
 *
 * On trigger:
 *   1. Fills the child order at current LTP via OrderExecutorService.tryExecuteOrder.
 *   2. Cancels the sibling child (OCO) via SlTargetChildOrderService.cancelSibling.
 *
 * MIS auto-square-off:
 *   Also checks all MIS positions at market close (15:15 IST) and closes any
 *   that are still open via a MARKET exit order.
 */

import { db } from "@/lib/db";
import { orders, positions } from "@paper-market/core/db";
import { eq, and, inArray } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { OrderExecutorService } from "@/domains/trading/server/execution/order-executor/order-executor.service";
import { SlTargetChildOrderService } from "@/domains/trading/server/execution/sl-target-child-order.service";
import { priceOracle } from "@/domains/market/server/pricing/price-oracle.service";
import { isTradingEnabled } from "@/lib/system-control";
import type { Order } from "@paper-market/core/db";
import { OrderStateMachineService } from "@/domains/trading/server/pipeline/order-state-machine.service";

const IST_TZ = "Asia/Kolkata";
const MIS_SQUARE_OFF_HOUR_IST = 15;
const MIS_SQUARE_OFF_MINUTE_IST = 15;

function getNowInIST(): { hour: number; minute: number } {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: IST_TZ,
        hour: "numeric",
        minute: "numeric",
        hour12: false,
    }).formatToParts(new Date());

    const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
    const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
    return { hour, minute };
}

function isMisSquareOffTime(): boolean {
    const { hour, minute } = getNowInIST();
    return hour === MIS_SQUARE_OFF_HOUR_IST && minute >= MIS_SQUARE_OFF_MINUTE_IST;
}

function shouldTrigger(
    childOrderType: string,
    side: "BUY" | "SELL",
    limitPrice: number,
    ltp: number
): boolean {
    if (childOrderType === "STOP_LOSS") {
        // BUY position SL fires when price drops to/below SL
        // SELL position SL fires when price rises to/above SL
        return side === "SELL" ? ltp <= limitPrice : ltp >= limitPrice;
    }
    if (childOrderType === "TARGET") {
        // BUY position target fires when price rises to/above target
        // SELL position target fires when price falls to/below target
        return side === "SELL" ? ltp >= limitPrice : ltp <= limitPrice;
    }
    return false;
}

export class SlTargetEngineService {
    /**
     * Check all OPEN SL/Target child orders and fill any that have been triggered.
     * Returns the number of child orders that were filled.
     */
    static async checkAndExecute(): Promise<number> {
        if (!isTradingEnabled()) return 0;

        // Fetch all OPEN child orders in one query
        const openChildOrders = await db
            .select()
            .from(orders)
            .where(
                and(
                    eq(orders.status, "OPEN"),
                    // childOrderType IS NOT NULL Ã¢â‚¬â€ we only want SL/Target children
                    // Drizzle doesn't have isNotNull in all versions, use inArray:
                    inArray(orders.childOrderType as any, ["STOP_LOSS", "TARGET"])
                )
            );

        if (openChildOrders.length === 0) return 0;

        let triggered = 0;

        for (const childOrder of openChildOrders) {
            try {
                const limitPrice = Number(childOrder.limitPrice);
                if (!Number.isFinite(limitPrice) || limitPrice <= 0) continue;
                if (!childOrder.childOrderType) continue;

                // Resolve current LTP for this instrument
                const ltp = await priceOracle.getBestPrice(childOrder.instrumentToken, {
                    symbolHint: childOrder.symbol,
                });

                if (!Number.isFinite(ltp) || ltp <= 0) continue;

                const shouldFire = shouldTrigger(
                    childOrder.childOrderType,
                    childOrder.side,
                    limitPrice,
                    ltp
                );

                if (!shouldFire) continue;

                logger.info(
                    {
                        event: "SL_TARGET_TRIGGERED",
                        childOrderType: childOrder.childOrderType,
                        orderId: childOrder.id,
                        parentOrderId: childOrder.parentOrderId,
                        symbol: childOrder.symbol,
                        ltp,
                        limitPrice,
                        side: childOrder.side,
                    },
                    "SL_TARGET_TRIGGERED"
                );

                // Mark OPEN Ã¢â€ â€™ PROCESSING atomically so concurrent callers skip it
                try {
                    await OrderStateMachineService.transition(childOrder.id, "OPEN", "PROCESSING");
                } catch (_) {
                    continue; // another runner grabbed it first
                }

                // Execute fill via OrderExecutorService (reuses existing ledger/margin logic)
                const executed = await OrderExecutorService.tryExecuteOrder(childOrder as Order, {
                    force: true,
                    leverage: childOrder.leverage ?? 1,
                });

                if (executed) {
                    triggered++;

                    // OCO: cancel the sibling
                    if (childOrder.parentOrderId) {
                        await SlTargetChildOrderService.cancelSibling(
                            childOrder.parentOrderId,
                            childOrder.childOrderType as "STOP_LOSS" | "TARGET"
                        );
                    }
                } else {
                    // Restore to OPEN if not filled so next tick retries
                    await OrderStateMachineService.transition(childOrder.id, "PROCESSING", "OPEN");
                }
            } catch (err) {
                logger.error(
                    { err, orderId: childOrder.id, event: "SL_TARGET_EXECUTION_ERROR" },
                    "SL_TARGET_EXECUTION_ERROR"
                );
                // Restore to OPEN so it gets retried next tick
                await OrderStateMachineService.transition(childOrder.id, "PROCESSING", "OPEN").catch(() => undefined);
            }
        }

        return triggered;
    }

    /**
     * MIS auto-square-off.
     * Called once around 15:15 IST. Closes all MIS positions that are still open
     * by placing MARKET exit orders.
     *
     * Returns the number of positions squared off.
     */
    static async misSquareOff(): Promise<number> {
        if (!isMisSquareOffTime()) return 0;

        // Find all MIS positions with non-zero quantity
        const misPositions = await db
            .select()
            .from(positions)
            .where(eq(positions.productType, "MIS"));

        const openMisPositions = misPositions.filter(
            (p) => Number(p.quantity) !== 0
        );

        if (openMisPositions.length === 0) return 0;

        logger.info(
            { event: "MIS_SQUARE_OFF_START", count: openMisPositions.length },
            "MIS_SQUARE_OFF_START"
        );

        let squaredOff = 0;

        for (const position of openMisPositions) {
            try {
                const qty = Number(position.quantity);
                const exitSide = qty > 0 ? "SELL" : "BUY";
                const absQty = Math.abs(qty);

                // Place a MARKET exit order
                const [exitOrder] = await db
                    .insert(orders)
                    .values({
                        userId: position.userId,
                        symbol: position.symbol,
                        instrumentToken: position.instrumentToken,
                        side: exitSide,
                        quantity: absQty,
                        orderType: "MARKET",
                        status: "OPEN",
                        productType: "MIS",
                        leverage: position.leverage ?? 1,
                        exitReason: "MIS_SQUARE_OFF",
                        rejectionReason: null,
                    })
                    .returning();

                // Execute immediately
                const executed = await OrderExecutorService.tryExecuteOrder(exitOrder, { force: true });

                if (executed) {
                    squaredOff++;
                    logger.info(
                        {
                            event: "MIS_POSITION_SQUARED_OFF",
                            positionId: position.id,
                            symbol: position.symbol,
                            userId: position.userId,
                            qty: absQty,
                            exitSide,
                        },
                        "MIS_POSITION_SQUARED_OFF"
                    );
                }
            } catch (err) {
                logger.error(
                    { err: err, positionId: position.id, symbol: position.symbol, event: "MIS_SQUARE_OFF_ERROR" },
                    "MIS_SQUARE_OFF_ERROR"
                );
            }
        }

        logger.info(
            { event: "MIS_SQUARE_OFF_COMPLETE", squaredOff, total: openMisPositions.length },
            "MIS_SQUARE_OFF_COMPLETE"
        );

        return squaredOff;
    }
}


