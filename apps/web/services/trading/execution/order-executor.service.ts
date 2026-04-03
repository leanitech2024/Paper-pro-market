import { db } from "@/lib/db";
import { orders, positions, trades } from "@paper-market/core/db";
import { type NewTrade, type LedgerReferenceType, type WriteAheadOperationType, type ProductType, type PlaceOrder } from "@paper-market/core";
import { logger } from "@/lib/logger";
import { ApiError } from "@/lib/errors";
import { performance } from "node:perf_hooks";
import { mtmEngineService } from "@/services/trading/valuation/mtm-engine.service";
import { PositionService } from "@/services/trading/positions/position.service";
import { MarginCalculatorService } from "@/services/trading/margin/margin-calculator.service";
import { and, asc, eq, ne, sql } from "drizzle-orm";
import { requireInstrumentTokenForIdentityLookup } from "@/lib/trading/token-identity-guard";
import { FillEngineService } from "@/services/trading/execution/fill-engine.service";
import { assertTradingEnabled, isTradingEnabled } from "@/lib/system-control";
import { LedgerService } from "@/services/accounting/ledger/ledger.service";
import { WriteAheadJournalService } from "@/services/accounting/ledger/write-ahead-journal.service";
import { instrumentStore } from "@/stores/instrument.store";
import { eventBus } from "@/lib/event-bus";
import { resolveEffectiveLeverage } from "@paper-market/core";
import { SlTargetChildOrderService } from "@/services/trading/execution/sl-target-child-order.service";
import { buildLedgerIdempotencyKey, resolveLedgerReferenceType } from "@/services/trading/pipeline/order-ledger-keys";
import { WalletService } from "@/services/accounting/wallet/wallet.service";
import { OrderStateMachineService } from "@/services/trading/pipeline/order-state-machine.service";

export class OrderExecutorService {
    private static round2(value: number): number {
        return Math.round(value * 100) / 100;
    }

    private static resolveWajOperationType(
        order: typeof orders.$inferSelect
    ): WriteAheadOperationType {
        if (order.rejectionReason === "FORCED_LIQUIDATION") return "LIQUIDATION";
        if (order.exitReason === "EXPIRY") return "EXPIRY_SETTLEMENT";
        return "TRADE_EXECUTION";
    }

    private static resolveOptionPremiumReferenceType(
        side: "BUY" | "SELL",
        closingQuantity: number,
        openingQuantity: number
    ): LedgerReferenceType {
        // Keep lifecycle observability explicit: opening premium legs vs realized close legs.
        if (closingQuantity > 0 && openingQuantity === 0) {
            return "OPTION_REALIZED_PNL";
        }
        return side === "BUY" ? "OPTION_PREMIUM_DEBIT" : "OPTION_PREMIUM_CREDIT";
    }

    /**
     * Execute all open orders by checking market conditions.
     * This should be called periodically (e.g., every tick).
     *
     * C-8 FIX: Orders are claimed atomically via UPDATE status='PROCESSING'
     * before execution. Concurrent callers (tick events, cron) will each see a
     * disjoint set of orders and can never double-fill the same order.
     */
    static async executeOpenOrders(): Promise<number> {
        try {
            if (!isTradingEnabled()) {
                return 0;
            }

            // Recovery: reset any orders that have been stuck in PROCESSING for
            // more than 30 seconds back to OPEN so they can be retried. This handles
            // cases where a previous execution attempt crashed mid-flight (e.g. a
            // process restart, or a trading halt that was subsequently cleared).
            const staleThreshold = new Date(Date.now() - 30_000);
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

            // Atomically claim a batch of OPEN orders by flipping them to
            // PROCESSING. Only this caller will see these exact rows; any
            // concurrent caller will skip them (they are no longer OPEN).
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
                        // Not fillable right now -- restore to OPEN so the next
                        // tick can retry.
                        await reopenOrder(order.id);
                    }
                } catch (err) {
                    logger.error(
                        { err: err, orderId: order.id },
                        "Failed to execute individual order"
                    );
                    // Restore to OPEN on unexpected error so the order is not
                    // silently dropped.
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

    /**
     * Try to execute a single order based on market conditions.
     */
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
                // Prefer the persisted order.leverage (set at placement time by the user).
                // Fall back to options.leverage for forced/liquidation/expiry paths that
                // construct synthetic orders without a persisted leverage value.
                const resolvedLeverage = resolveEffectiveLeverage(
                    (order as any).leverage ?? options.leverage
                );
                const resolvedProductType: ProductType =
                    order.productType === "MIS" ? "MIS" : "CNC";

                const orderPayload = order.orderType === "LIMIT"
                    ? {
                        instrumentToken,
                        symbol: order.symbol,
                        side: order.side,
                        quantity: fillQuantity,
                        orderType: "LIMIT" as const,
                        limitPrice: Number(order.limitPrice || executionPrice),
                        productType: resolvedProductType,
                            leverage: resolvedLeverage,
                    }
                    : {
                        instrumentToken,
                        symbol: order.symbol,
                        side: order.side,
                        quantity: fillQuantity,
                        orderType: "MARKET" as const,
                        productType: resolvedProductType,
                            leverage: resolvedLeverage,
                    };

                // ─── ACQUIRE ROW-LEVEL LOCK FIRST ────────────────────────────
                // This must be the very first DB operation inside the transaction.
                // Both the margin calculation and PnL calculation below depend on
                // previousQuantity/averagePrice — locking here prevents concurrent
                // fills (tick executor + liquidation) from reading stale position data
                // and computing incorrect closingQty / realizedPnl / marginDelta.
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
                const projectedQuantity = previousQuantity + tradeDelta;

                let openingQuantity = 0;
                let closingQuantity = 0;
                if (previousQuantity === 0 || Math.sign(previousQuantity) === Math.sign(tradeDelta)) {
                    openingQuantity = Math.abs(tradeDelta);
                } else {
                    closingQuantity = Math.min(Math.abs(previousQuantity), Math.abs(tradeDelta));
                    openingQuantity = Math.max(0, Math.abs(tradeDelta) - Math.abs(previousQuantity));
                }

                const marginPerUnit = fillQuantity > 0 ? marginRequired / fillQuantity : 0;
                const marginToBlock = Math.max(0, this.round2(marginPerUnit * openingQuantity));
                const marginToRelease = Math.max(0, this.round2(marginPerUnit * closingQuantity));
                const marginBlockDelta = Math.max(0, this.round2(marginToBlock - reservedMargin));
                const marginReserveReleaseDelta = Math.max(0, this.round2(reservedMargin - marginToBlock));

                // D-1 FIX: Use LedgerService BigInt arithmetic for PnL so the result
                // matches the precision of the ledger itself. Floating-point
                // Math.round((price - avg) * qty * 100) / 100 can produce systematic
                // rounding error on large price × quantity products (e.g. options premiums).
                const realizedPnlString: string = (() => {
                    if (closingQuantity <= 0) return "0";
                    const direction = previousQuantity > 0 ? 1 : -1;
                    const priceDelta = LedgerService.subtract(
                        finalExecutionPrice.toString(),
                        previousAveragePrice.toString()
                    );
                    const gross = LedgerService.multiplyByInteger(priceDelta, closingQuantity);
                    // Apply direction: long position profit = positive delta, short = negative delta
                    return direction === 1 ? gross : LedgerService.subtract("0", gross);
                })();
                const realizedPnl = parseFloat(realizedPnlString);

                let optionMarginToBlock = 0;
                let optionMarginToRelease = 0;
                if (instrument.instrumentType === "OPTION") {
                    const previousShortQty = Math.max(0, -previousQuantity);
                    const nextShortQty = Math.max(0, -projectedQuantity);
                    const previousShortMargin = await MarginCalculatorService.calculateOptionShortMarginForQuantity(
                        instrument,
                        previousShortQty,
                        finalExecutionPrice
                    );
                    const nextShortMargin = await MarginCalculatorService.calculateOptionShortMarginForQuantity(
                        instrument,
                        nextShortQty,
                        finalExecutionPrice
                    );
                    optionMarginToBlock = Math.max(0, this.round2(nextShortMargin - previousShortMargin));
                    optionMarginToRelease = Math.max(0, this.round2(previousShortMargin - nextShortMargin));
                }
                const optionMarginBlockDelta = Math.max(0, this.round2(optionMarginToBlock - reservedMargin));
                const optionReserveReleaseDelta = Math.max(0, this.round2(reservedMargin - optionMarginToBlock));

                const plannedLedgerKeys: string[] = [];

                if (instrument.instrumentType === "FUTURE") {
                    if (marginBlockDelta > 0) {
                        plannedLedgerKeys.push(buildLedgerIdempotencyKey(order, "MARGIN_BLOCK_OPEN"));
                    }
                    if (marginReserveReleaseDelta > 0) {
                        plannedLedgerKeys.push(buildLedgerIdempotencyKey(order, "MARGIN_RELEASE_RESERVE"));
                    }
                    if (marginToRelease > 0) {
                        plannedLedgerKeys.push(buildLedgerIdempotencyKey(order, "MARGIN_RELEASE_CLOSE"));
                    }
                    if (closingQuantity > 0 && realizedPnl > 0) {
                        plannedLedgerKeys.push(buildLedgerIdempotencyKey(order, "REALIZED_PNL_CREDIT"));
                    }
                    if (closingQuantity > 0 && realizedPnl < 0) {
                        plannedLedgerKeys.push(buildLedgerIdempotencyKey(order, "REALIZED_PNL_DEBIT"));
                    }
                    plannedLedgerKeys.push(buildLedgerIdempotencyKey(order, "MARGIN_RELEASE_REMAINDER"));
                } else if (instrument.instrumentType === "OPTION") {
                    const premiumLeg = order.side === "BUY"
                        ? "OPTION_PREMIUM_DEBIT"
                        : "OPTION_PREMIUM_CREDIT";
                    plannedLedgerKeys.push(buildLedgerIdempotencyKey(order, premiumLeg));
                    if (optionMarginBlockDelta > 0) {
                        plannedLedgerKeys.push(buildLedgerIdempotencyKey(order, "OPTION_MARGIN_BLOCK"));
                    }
                    if (optionReserveReleaseDelta > 0) {
                        plannedLedgerKeys.push(buildLedgerIdempotencyKey(order, "MARGIN_RELEASE_RESERVE"));
                    }
                    if (optionMarginToRelease > 0) {
                        plannedLedgerKeys.push(buildLedgerIdempotencyKey(order, "OPTION_MARGIN_RELEASE"));
                    }
                } else if (order.side === "BUY") {
                    plannedLedgerKeys.push(buildLedgerIdempotencyKey(order, "BUY_DEBIT"));
                } else if (instrument.instrumentType === "EQUITY") {
                    plannedLedgerKeys.push(buildLedgerIdempotencyKey(order, "SELL_PROCEEDS"));
                }

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
                    const newTrade: NewTrade = {
                        orderId: order.id,
                        userId: order.userId,
                        symbol: order.symbol,
                        instrumentToken,
                        side: order.side,
                        quantity: fillQuantity,
                        price: finalExecutionPrice.toString(),
                        executedAt: new Date(),
                    };

                    await OrderStateMachineService.transition(order.id, "PROCESSING", "FILLED", tx, {
                        executionPrice: finalExecutionPrice.toString(),
                        executedAt: new Date(),
                    });

                    const [trade] = await tx.insert(trades).values(newTrade).returning();

                    if (instrument.instrumentType === "FUTURE") {
                        if (marginBlockDelta > 0) {
                            await WalletService.debitBalance(
                                order.userId,
                                marginBlockDelta,
                                "MARGIN_BLOCK",
                                trade.id,
                                tx,
                                `Margin Block ${order.symbol}`,
                                {
                                    ledgerReferenceType,
                                    skipWaj: true,
                                    skipWalletSync: true,
                                    sequenceCollector: ledgerSequences,
                                    idempotencyKey: buildLedgerIdempotencyKey(order, "MARGIN_BLOCK_OPEN"),
                                }
                            );
                        }
                        if (marginReserveReleaseDelta > 0) {
                            await WalletService.releaseMarginBlock(
                                order.userId,
                                marginReserveReleaseDelta,
                                trade.id,
                                tx,
                                `Margin Release (Reserve Adjust) ${order.symbol}`,
                                {
                                    ledgerReferenceType,
                                    skipWaj: true,
                                    skipWalletSync: true,
                                    sequenceCollector: ledgerSequences,
                                    idempotencyKey: buildLedgerIdempotencyKey(order, "MARGIN_RELEASE_RESERVE"),
                                }
                            );
                        }

                        await PositionService.updatePosition(tx, trade);

                        if (marginToRelease > 0) {
                            await WalletService.releaseMarginBlock(
                                order.userId,
                                marginToRelease,
                                trade.id,
                                tx,
                                `Margin Release ${order.symbol}`,
                                {
                                    ledgerReferenceType,
                                    skipWaj: true,
                                    skipWalletSync: true,
                                    sequenceCollector: ledgerSequences,
                                    idempotencyKey: buildLedgerIdempotencyKey(order, "MARGIN_RELEASE_CLOSE"),
                                }
                            );
                        }

                        if (closingQuantity > 0 && Math.abs(realizedPnl) > 0) {
                            const realizedAmount = Math.abs(realizedPnl);
                            if (realizedPnl > 0) {
                                await WalletService.creditBalance(
                                    order.userId,
                                    realizedAmount,
                                    "TRADE",
                                    trade.id,
                                    `Realized PnL Credit ${order.symbol}`,
                                    tx,
                                    {
                                        ledgerReferenceType,
                                        skipWaj: true,
                                        skipWalletSync: true,
                                        sequenceCollector: ledgerSequences,
                                        idempotencyKey: buildLedgerIdempotencyKey(order, "REALIZED_PNL_CREDIT"),
                                    }
                                );
                            } else {
                                await WalletService.debitBalance(
                                    order.userId,
                                    realizedAmount,
                                    "TRADE",
                                    trade.id,
                                    tx,
                                    `Realized PnL Debit ${order.symbol}`,
                                    {
                                        ledgerReferenceType,
                                        skipWaj: true,
                                        skipWalletSync: true,
                                        sequenceCollector: ledgerSequences,
                                        idempotencyKey: buildLedgerIdempotencyKey(order, "REALIZED_PNL_DEBIT"),
                                        isSettlement: true,
                                    }
                                );
                            }
                        }

                        const [remainingOpenPosition] = await tx
                            .select({ id: positions.id })
                            .from(positions)
                            .where(
                                and(
                                    eq(positions.userId, order.userId),
                                    ne(positions.quantity, 0)
                                )
                            )
                            .limit(1);

                        if (!remainingOpenPosition) {
                            const snapshot = await LedgerService.reconstructUserEquity(order.userId, tx);
                            if (LedgerService.compare(snapshot.marginBlocked, "0") > 0) {
                                await WalletService.releaseMarginBlock(
                                    order.userId,
                                    snapshot.marginBlocked,
                                    trade.id,
                                    tx,
                                    "Margin Release All After Full Exit",
                                    {
                                        ledgerReferenceType,
                                        skipWaj: true,
                                        skipWalletSync: true,
                                        sequenceCollector: ledgerSequences,
                                        idempotencyKey: buildLedgerIdempotencyKey(order, "MARGIN_RELEASE_REMAINDER"),
                                    }
                                );
                            }
                        }
                    } else if (instrument.instrumentType === "EQUITY") {
                        if (order.side === "BUY") {
                            if (reservedMargin > 0) {
                                await WalletService.releaseMarginBlock(
                                    order.userId,
                                    reservedMargin,
                                    trade.id,
                                    tx,
                                    `Margin Release (Consume) ${order.symbol}`,
                                    {
                                        ledgerReferenceType,
                                        skipWaj: true,
                                        skipWalletSync: true,
                                        sequenceCollector: ledgerSequences,
                                        idempotencyKey: buildLedgerIdempotencyKey(order, "MARGIN_RELEASE_RESERVE"),
                                    }
                                );
                            }
                            await WalletService.debitBalance(
                                order.userId,
                                marginRequired,
                                "TRADE",
                                trade.id,
                                tx,
                                `Buy ${order.symbol}`,
                                {
                                    ledgerReferenceType,
                                    skipWaj: true,
                                    skipWalletSync: true,
                                    sequenceCollector: ledgerSequences,
                                    idempotencyKey: buildLedgerIdempotencyKey(order, "BUY_DEBIT"),
                                }
                            );
                        } else {
                            const proceeds = LedgerService.multiplyByInteger(
                                finalExecutionPrice.toString(),
                                fillQuantity
                            );
                            await WalletService.creditProceeds(
                                order.userId,
                                proceeds,
                                trade.id,
                                tx,
                                `Sell ${order.symbol}`,
                                {
                                    ledgerReferenceType,
                                    skipWaj: true,
                                    skipWalletSync: true,
                                    sequenceCollector: ledgerSequences,
                                    idempotencyKey: buildLedgerIdempotencyKey(order, "SELL_PROCEEDS"),
                                }
                            );
                        }

                        await PositionService.updatePosition(tx, trade);
                    } else if (instrument.instrumentType === "OPTION") {
                        const premiumAmount = LedgerService.multiplyByInteger(
                            finalExecutionPrice.toString(),
                            fillQuantity
                        );
                        const premiumLeg = order.side === "BUY"
                            ? "OPTION_PREMIUM_DEBIT"
                            : "OPTION_PREMIUM_CREDIT";
                        const premiumReferenceType = this.resolveOptionPremiumReferenceType(
                            order.side,
                            closingQuantity,
                            openingQuantity
                        );

                        if (order.side === "BUY") {
                            if (optionReserveReleaseDelta > 0) {
                                await WalletService.releaseMarginBlock(
                                    order.userId,
                                    optionReserveReleaseDelta,
                                    trade.id,
                                    tx,
                                    `Margin Release (Consume) ${order.symbol}`,
                                    {
                                        ledgerReferenceType: premiumReferenceType,
                                        skipWaj: true,
                                        skipWalletSync: true,
                                        sequenceCollector: ledgerSequences,
                                        idempotencyKey: buildLedgerIdempotencyKey(order, "MARGIN_RELEASE_RESERVE"),
                                    }
                                );
                            }
                            await WalletService.debitBalance(
                                order.userId,
                                premiumAmount,
                                "OPTION_PREMIUM_DEBIT",
                                trade.id,
                                tx,
                                `Option Premium Debit ${order.symbol}`,
                                {
                                    ledgerReferenceType: premiumReferenceType,
                                    skipWaj: true,
                                    skipWalletSync: true,
                                    sequenceCollector: ledgerSequences,
                                    idempotencyKey: buildLedgerIdempotencyKey(order, premiumLeg),
                                }
                            );
                        } else {
                            await WalletService.creditProceeds(
                                order.userId,
                                premiumAmount,
                                trade.id,
                                tx,
                                `Option Premium Credit ${order.symbol}`,
                                {
                                    ledgerReferenceType: premiumReferenceType,
                                    skipWaj: true,
                                    skipWalletSync: true,
                                    sequenceCollector: ledgerSequences,
                                    idempotencyKey: buildLedgerIdempotencyKey(order, premiumLeg),
                                }
                            );
                        }

                        await PositionService.updatePosition(tx, trade);

                        if (optionMarginBlockDelta > 0) {
                            await WalletService.debitBalance(
                                order.userId,
                                optionMarginBlockDelta,
                                "OPTION_MARGIN_BLOCK",
                                trade.id,
                                tx,
                                `Option Margin Block ${order.symbol}`,
                                {
                                    ledgerReferenceType: "OPTION_MARGIN_BLOCK",
                                    skipWaj: true,
                                    skipWalletSync: true,
                                    sequenceCollector: ledgerSequences,
                                    idempotencyKey: buildLedgerIdempotencyKey(order, "OPTION_MARGIN_BLOCK"),
                                }
                            );
                        }

                        if (optionReserveReleaseDelta > 0 && order.side === "SELL") {
                            await WalletService.releaseMarginBlock(
                                order.userId,
                                optionReserveReleaseDelta,
                                trade.id,
                                tx,
                                `Option Margin Release (Reserve Adjust) ${order.symbol}`,
                                {
                                    ledgerReferenceType: "OPTION_MARGIN_RELEASE",
                                    skipWaj: true,
                                    skipWalletSync: true,
                                    sequenceCollector: ledgerSequences,
                                    idempotencyKey: buildLedgerIdempotencyKey(order, "MARGIN_RELEASE_RESERVE"),
                                }
                            );
                        }

                        if (optionMarginToRelease > 0) {
                            const snapshot = await LedgerService.reconstructUserEquity(order.userId, tx);
                            const blocked = Number(snapshot.marginBlocked);
                            const safeRelease = Number.isFinite(blocked)
                                ? Math.min(optionMarginToRelease, blocked)
                                : optionMarginToRelease;

                            if (safeRelease > 0) {
                                await WalletService.releaseMarginBlock(
                                    order.userId,
                                    safeRelease,
                                    trade.id,
                                    tx,
                                    `Option Margin Release ${order.symbol}`,
                                    {
                                        ledgerReferenceType: "OPTION_MARGIN_RELEASE",
                                        skipWaj: true,
                                        skipWalletSync: true,
                                        sequenceCollector: ledgerSequences,
                                        idempotencyKey: buildLedgerIdempotencyKey(order, "OPTION_MARGIN_RELEASE"),
                                    }
                                );
                            }
                        }
                    } else {
                        throw new ApiError(
                            `Unsupported instrumentType for execution: ${instrument.instrumentType}`,
                            400,
                            "INVALID_INSTRUMENT_TYPE"
                        );
                    }

                    // Removed O(N) wallet ledger sync per execution. Delta updates handle cache now.

                    // Spawn SL / Target child orders if present on the parent.
                    // Only for opening orders (not child SL/Target orders themselves).
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
                    // C-5 FIX: Do NOT pass `tx` here. The outer transaction is
                    // about to roll back — any writes inside tx (including the
                    // abort UPDATE) will be discarded, leaving the WAJ entry
                    // permanently PREPARED. Pass undefined so the abort goes
                    // through the global db connection outside this transaction.
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
            
            // Fix execution logging noise by sampling 10% of standard executions.
            // Slow paths are always logged.
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

            // C-3 FIX: For any other unexpected error (DB timeout, network blip, etc.)
            // restore to OPEN so the next tick can retry. Without this the order stays
            // stuck in PROCESSING permanently with no recovery path.
            logger.error(
                { err: err, orderId: order.id },
                "Unexpected execution error — restoring order to OPEN for retry"
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

    /**
     * Orchestrate immediate market execution if allowed by context.
     */
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




