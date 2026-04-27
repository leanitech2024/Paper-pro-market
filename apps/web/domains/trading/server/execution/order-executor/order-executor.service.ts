import { db } from "@/lib/db";
import { orders, positions, trades } from "@paper-market/core/db";
import { type NewTrade, type ProductType, type PlaceOrder } from "@paper-market/core";
import { logger } from "@/lib/logger";
import { ApiError } from "@/lib/errors";
import { performance } from "node:perf_hooks";
import { mtmEngineService } from "@/domains/trading/server/valuation/mtm-engine.service";
import { MarginCalculatorService } from "@/domains/trading/server/margin/margin-calculator.service";
import { and, asc, eq, ne, or, sql } from "drizzle-orm";
import { requireInstrumentTokenForIdentityLookup } from "@/domains/trading/lib/token-identity-guard";
import { FillEngineService } from "@/domains/trading/server/execution/fill-engine.service";
import { assertTradingEnabled, isTradingEnabled } from "@/lib/system-control";
import { LedgerService } from "@/domains/platform/server/accounting/ledger/ledger.service";
import { WriteAheadJournalService } from "@/domains/platform/server/accounting/ledger/write-ahead-journal.service";
import { instrumentStore } from "@/domains/market/stores/instrument.store";
import { eventBus } from "@/lib/event-bus";
import { resolveEffectiveLeverage } from "@paper-market/core";
import { SlTargetChildOrderService } from "@/domains/trading/server/execution/sl-target-child-order.service";
import { resolveLedgerReferenceType } from "@/domains/trading/server/pipeline/order-ledger-keys";
import { OrderStateMachineService } from "@/domains/trading/server/pipeline/order-state-machine.service";

import {
    calculateMarginDeltas,
    calculateOpeningClosingQuantities,
    calculateOptionMarginDeltas,
    calculateRealizedPnl,
    round2,
} from "@/domains/trading/server/execution/order-executor/fee-calculation";
import {
    buildExecutionOrderPayload,
    buildNewTradeRecord,
    buildPlannedLedgerKeys,
} from "@/domains/trading/server/execution/order-executor/order-mapper";
import { executeInstrumentSettlement } from "@/domains/trading/server/execution/order-executor/execution-engine";
import {
    resolveOptionPremiumReferenceType,
    resolveWajOperationType,
} from "@/domains/trading/server/execution/order-executor/validation";

export class OrderExecutorService {
    private static round2(value: number): number {
        return round2(value);
    }

    private static resolveWajOperationType(
        order: typeof orders.$inferSelect
    ) {
        return resolveWajOperationType(order);
    }

    private static resolveOptionPremiumReferenceType(
        side: "BUY" | "SELL",
        closingQuantity: number,
        openingQuantity: number
    ) {
        return resolveOptionPremiumReferenceType(side, closingQuantity, openingQuantity);
    }

    static async executeOpenOrders(): Promise<number> {
        try {
            if (!isTradingEnabled()) {
                return 0;
            }

            const staleThreshold = new Date(Date.now() - 30_000);
            const candidates = await db
                .select({ id: orders.id })
                .from(orders)
                .where(
                    or(
                        eq(orders.status, "OPEN"),
                        and(
                            eq(orders.status, "PROCESSING"),
                            sql`${orders.updatedAt} < ${staleThreshold}`
                        )
                    )
                )
                .limit(1);

            if (candidates.length === 0) {
                return 0;
            }

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
                    const executed = await this.tryExecuteOrder(order);
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

            if (executedCount > 0) {
                logger.info({ executedCount }, "Orders executed");
            }

            return executedCount;
        } catch (err) {
            logger.error({ err: err }, "Failed to execute open orders");
            throw new ApiError("Execution engine failed", 500, "EXECUTION_FAILED");
        }
    }

    static async tryExecuteOrder(
        order: typeof orders.$inferSelect,
        options: { force?: boolean; leverage?: number } = {}
    ): Promise<boolean> {
        const startMs = performance.now();
        let marginMs = 0;
        let ledgerMs = 0;
        let executionMs = 0;

        assertTradingEnabled({ force: options.force, context: "OrderExecutorService.tryExecuteOrder" });
        const instrumentToken = requireInstrumentTokenForIdentityLookup({
            context: "OrderExecutorService.tryExecuteOrder",
            instrumentToken: order.instrumentToken,
            symbol: order.symbol,
        });

        if (!instrumentStore.isReady()) {
            await instrumentStore.initialize();
        }
        if (!instrumentStore.isReady()) {
            throw new ApiError("Instrument store not ready", 503, "INSTRUMENT_STORE_NOT_READY");
        }
        const instrument = instrumentStore.getByToken(instrumentToken);
        if (!instrument) {
            throw new ApiError(`Instrument not found: ${instrumentToken}`, 404, "INSTRUMENT_NOT_FOUND");
        }

        const fillDecision = await FillEngineService.resolveFill(order, instrument);
        if (process.env.NODE_ENV !== "production" && fillDecision.resolvedBy !== "FILL_ENGINE_V1") {
            throw new Error("OrderExecutorService fill price must come from FillEngineService");
        }

        const executionPrice = fillDecision.executionPrice;
        const fillQuantity = fillDecision.fillableQuantity;
        const priceSource = String(fillDecision.source || "NONE");

        const fillable = Boolean(executionPrice && fillQuantity > 0) && fillDecision.shouldFill;
        if (!fillable) {
            logger.debug(
                {
                    orderId: order.id,
                    symbol: order.symbol,
                    reason: fillDecision.reason,
                    source: fillDecision.source,
                    tickPrice: fillDecision.tickPrice,
                },
                "Order not fillable on current tick"
            );
            return false;
        }

        if (process.env.NODE_ENV !== "production" && fillQuantity !== order.quantity) {
            throw new Error("OrderExecutorService partial fills are not enabled yet; expected full fill quantity");
        }
        const finalExecutionPrice = Number(executionPrice);

        try {
            const transactionStartMs = performance.now();
            await db.transaction(async (tx) => {
                const resolvedLeverage = resolveEffectiveLeverage(
                    (order as any).leverage ?? options.leverage
                );
                const resolvedProductType: ProductType =
                    order.productType === "MIS" ? "MIS" : "CNC";

                const orderPayload = buildExecutionOrderPayload({
                    instrumentToken,
                    order,
                    fillQuantity,
                    executionPrice: finalExecutionPrice,
                    resolvedProductType,
                    resolvedLeverage,
                });

                const [existingPositionBefore] = await tx
                    .select({
                        quantity: positions.quantity,
                        averagePrice: positions.averagePrice,
                    })
                    .from(positions)
                    .where(
                        and(
                            eq(positions.userId, order.userId),
                            eq(positions.instrumentToken, instrumentToken)
                        )
                    )
                    .for('update')
                    .limit(1);

                const marginStartMs = performance.now();
                const marginRequired = await MarginCalculatorService.calculateRequiredMargin(
                    orderPayload,
                    instrument
                );
                marginMs = performance.now() - marginStartMs;
                const ledgerReferenceType = resolveLedgerReferenceType(order);
                const reservedMargin = Number(order.reservedMargin ?? 0);

                const previousQuantity = Number(existingPositionBefore?.quantity ?? 0);
                const previousAveragePrice = Number(existingPositionBefore?.averagePrice ?? finalExecutionPrice);
                const tradeDelta = order.side === "BUY" ? fillQuantity : -fillQuantity;
                const {
                    openingQuantity,
                    closingQuantity,
                    projectedQuantity,
                } = calculateOpeningClosingQuantities(previousQuantity, tradeDelta);

                const {
                    marginToRelease,
                    marginBlockDelta,
                    marginReserveReleaseDelta,
                } = calculateMarginDeltas({
                    fillQuantity,
                    marginRequired,
                    openingQuantity,
                    closingQuantity,
                    reservedMargin,
                });

                const { realizedPnl } = calculateRealizedPnl({
                    finalExecutionPrice,
                    previousAveragePrice,
                    previousQuantity,
                    closingQuantity,
                });

                const {
                    optionMarginToBlock,
                    optionMarginToRelease,
                    optionMarginBlockDelta,
                    optionReserveReleaseDelta,
                } = await calculateOptionMarginDeltas({
                    instrument,
                    previousQuantity,
                    projectedQuantity,
                    finalExecutionPrice,
                    reservedMargin,
                });

                const plannedLedgerKeys = buildPlannedLedgerKeys({
                    order,
                    instrumentType: instrument.instrumentType,
                    orderSide: order.side,
                    marginBlockDelta,
                    marginReserveReleaseDelta,
                    marginToRelease,
                    closingQuantity,
                    realizedPnl,
                    optionMarginBlockDelta,
                    optionReserveReleaseDelta,
                    optionMarginToRelease,
                });

                const preparedJournal = await WriteAheadJournalService.prepare(
                    {
                        journalId: order.id,
                        operationType: this.resolveWajOperationType(order),
                        userId: order.userId,
                        referenceId: order.id,
                        payload: {
                            orderId: order.id,
                            userId: order.userId,
                            instrumentToken,
                            side: order.side,
                            orderType: order.orderType,
                            fillQuantity,
                            executionPrice: finalExecutionPrice,
                            priceSource,
                            marginRequired,
                            exitReason: order.exitReason,
                            rejectionReason: order.rejectionReason,
                            idempotencyKeys: plannedLedgerKeys,
                        },
                    },
                    tx
                );

                try {
                    const ledgerStartMs = performance.now();
                    const ledgerSequences: number[] = [];
                    const newTrade: NewTrade = buildNewTradeRecord({
                        order,
                        instrumentToken,
                        fillQuantity,
                        finalExecutionPrice,
                    });

                    await OrderStateMachineService.transition(order.id, "PROCESSING", "FILLED", tx, {
                        executionPrice: finalExecutionPrice.toString(),
                        executedAt: new Date(),
                    });

                    const [trade] = await tx.insert(trades).values(newTrade).returning();

                    await executeInstrumentSettlement({
                        tx,
                        order,
                        instrument,
                        trade,
                        finalExecutionPrice,
                        fillQuantity,
                        ledgerReferenceType,
                        reservedMargin,
                        marginRequired,
                        closingQuantity,
                        openingQuantity,
                        realizedPnl,
                        marginBlockDelta,
                        marginReserveReleaseDelta,
                        marginToRelease,
                        optionMarginBlockDelta,
                        optionReserveReleaseDelta,
                        optionMarginToRelease,
                        ledgerSequences,
                    });

                    if (!order.childOrderType && (order.stopLossPrice || order.targetPrice)) {
                        await SlTargetChildOrderService.spawnChildOrders(
                            { ...order, executionPrice: finalExecutionPrice.toString() },
                            finalExecutionPrice,
                            tx
                        );
                    }
                    ledgerMs = performance.now() - ledgerStartMs;
                    await WriteAheadJournalService.commit(preparedJournal.journalId, tx, {
                        ledgerSequences,
                        mutationMeta: {
                            orderId: order.id,
                            tradeId: trade.id,
                            priceSource,
                        },
                    });
                } catch (mutationError) {
                    await WriteAheadJournalService.abort(
                        preparedJournal.journalId,
                        undefined,
                        mutationError instanceof Error ? mutationError.message : "EXECUTION_MUTATION_FAILED"
                    );
                    throw mutationError;
                }
            });
            executionMs = performance.now() - transactionStartMs;

            logger.info(
                {
                    orderId: order.id,
                    symbol: order.symbol,
                    side: order.side,
                    quantity: fillQuantity,
                    price: finalExecutionPrice,
                    source: priceSource,
                    priceSource,
                    slippageBps: fillDecision.slippageBps,
                },
                "Order executed"
            );
            eventBus.emit("order.executed", {
                orderId: order.id,
                userId: order.userId,
                instrumentToken,
                quantity: fillQuantity,
                price: finalExecutionPrice,
            });
            eventBus.emit("position.changed", {
                userId: order.userId,
                instrumentToken,
                reason: "ORDER_EXECUTED",
            });
            try {
                await mtmEngineService.refreshUserNow(order.userId);
            } catch (refreshError) {
                logger.warn(
                    { err: refreshError, orderId: order.id, userId: order.userId },
                    "MTM refresh after execution failed"
                );
            }

            const totalMs = performance.now() - startMs;
            const metricsPayload = {
                event: "ORDER_EXECUTION_TIMING",
                orderId: order.id,
                userId: order.userId,
                instrumentToken,
                order_validation_ms: 0,
                margin_ms: Number(marginMs.toFixed(2)),
                ledger_ms: Number(ledgerMs.toFixed(2)),
                execution_ms: Number(executionMs.toFixed(2)),
                total_ms: Number(totalMs.toFixed(2)),
            };
            
            if (totalMs > 500) {
                logger.error(metricsPayload, "ORDER_EXECUTION_TIMING");
            } else if (totalMs > 250) {
                logger.warn(metricsPayload, "ORDER_EXECUTION_TIMING");
            } else if (Math.random() < 0.1) {
                logger.info(metricsPayload, "ORDER_EXECUTION_TIMING");
            }
            return true;
        } catch (err: unknown) {
            const apiErr = err instanceof ApiError ? err : null;
            if (apiErr?.code === "INSUFFICIENT_FUNDS") {
                logger.warn({ orderId: order.id }, "Execution failed: Insufficient Funds");
                await OrderStateMachineService.transition(order.id, "PROCESSING", "REJECTED");
                return false;
            }
            if (apiErr?.code === "TRANSITION_FAILED" || apiErr?.code === "INVALID_STATE_TRANSITION") {
                logger.debug(
                    { err: err, orderId: order.id },
                    "Order already left PROCESSING; skipping execution"
                );
                return false;
            }

            logger.error(
                { err: err, orderId: order.id },
                "Unexpected execution error ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â restoring order to OPEN for retry"
            );
            await db.update(orders)
                .set({
                    status: "OPEN",
                    updatedAt: new Date(),
                })
                .where(and(eq(orders.id, order.id), eq(orders.status, "PROCESSING")))
                .catch((restoreErr) =>
                    logger.error({ err: restoreErr, orderId: order.id }, "Failed to restore PROCESSING order to OPEN")
                );
            throw err;
        }
    }

    static async maybeExecute(
        order: typeof orders.$inferSelect,
        payload: PlaceOrder,
        context: { stageAfterHours: boolean },
        options: { force?: boolean }
    ): Promise<void> {
        if (payload.orderType !== "MARKET" || context.stageAfterHours) return;

        const requiresImmediateSettlementFill = payload.exitReason === "EXPIRY";
        try {
            if (order.status === "OPEN") {
                await OrderStateMachineService.transition(order.id, "OPEN", "PROCESSING");
            }
            logger.info({ orderId: order.id }, "Executing MARKET order immediately");
            const executed = await this.tryExecuteOrder(order, {
                force: options.force,
                leverage: payload.leverage,
            });
            if (requiresImmediateSettlementFill && !executed) {
                throw new ApiError("Expiry settlement execution failed", 503, "EXPIRY_EXECUTION_FAILED");
            }
        } catch (err) {
            logger.error({ err: err, orderId: order.id }, "Failed to execute MARKET order");
            await db.update(orders)
                .set({ status: "OPEN", updatedAt: new Date() })
                .where(and(eq(orders.id, order.id), eq(orders.status, "PROCESSING")))
                .catch((restoreErr) =>
                    logger.error({ err: restoreErr, orderId: order.id }, "Failed to restore order to OPEN")
                );
            if (requiresImmediateSettlementFill) {
                throw err;
            }
        }
    }
}
