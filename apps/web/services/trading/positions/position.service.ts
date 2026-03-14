import { db } from "@/lib/db";
import { positions, instruments, orders } from "@paper-market/core/db";
import { type NewPosition, type Trade, type ProductType } from "@paper-market/core";
import { logger } from "@/lib/logger";
import { ApiError } from "@/lib/errors";
import { eq, and } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import { requireInstrumentTokenForIdentityLookup } from "@/lib/trading/token-identity-guard";
import { realTimeMarketService } from "@/services/market/feeds/realtime-market.service";
import { instrumentStore } from "@/stores/instrument.store";
import { LedgerService } from "@/services/accounting/ledger/ledger.service";

type DbTransaction = any; // PgTransaction<PostgresJsQueryResultHKT, Record<string, never>, any>;

export class PositionService {
    /**
     * Update position based on a new trade.
     * Must be called within a transaction.
     */
    static async updatePosition(tx: DbTransaction, trade: Trade): Promise<void> {
        try {
            const instrumentToken = requireInstrumentTokenForIdentityLookup({
                context: "PositionService.updatePosition",
                instrumentToken: trade.instrumentToken,
                symbol: trade.symbol,
            });

            const [originOrder] = await tx
                .select({
                    productType: orders.productType,
                    leverage: orders.leverage,
                })
                .from(orders)
                .where(eq(orders.id, trade.orderId))
                .limit(1);

            // Fetch existing position using strict token identity.
            // .for('update') acquires a row-level lock within the transaction to prevent
            // concurrent fills racing on the same position row.
            const [existingPosition] = await tx
                .select()
                .from(positions)
                .where(
                    and(
                        eq(positions.userId, trade.userId),
                        eq(positions.instrumentToken, instrumentToken)
                    )
                )
                .for('update')
                .limit(1);

            const tradePrice = parseFloat(trade.price);
            const tradeQuantity = trade.quantity;

            if (!existingPosition) {
                // Create new position
                const newPosition: NewPosition = {
                    userId: trade.userId,
                    symbol: trade.symbol,
                    instrumentToken,
                    quantity: trade.side === "BUY" ? tradeQuantity : -tradeQuantity,
                    averagePrice: tradePrice.toString(),
                    realizedPnL: "0",
                    productType: originOrder?.productType ?? "CNC",
                    leverage: originOrder?.leverage ?? 1,
                };

                await tx.insert(positions).values(newPosition);
                logger.debug({ userId: trade.userId, symbol: trade.symbol }, "Position created");
            } else {
                // Update existing position
                const currentQuantity = existingPosition.quantity;
                const currentAvgPrice = parseFloat(existingPosition.averagePrice);
                const currentRealizedPnL = parseFloat(existingPosition.realizedPnL);

                const { newQuantity, newAvgPrice, newRealizedPnL, tradeRealizedPnL } = this.calculateNewPosition(
                    currentQuantity,
                    currentAvgPrice,
                    currentRealizedPnL,
                    trade.side,
                    tradeQuantity,
                    tradePrice
                );

                // Always annotate closing/reducing fills on the originating order.
                // This ensures Orders History can render Exit + P&L even when realizedPnL is exactly 0.
                const isIncreasing =
                    (currentQuantity >= 0 && trade.side === "BUY") ||
                    (currentQuantity < 0 && trade.side === "SELL");
                const closedQuantity = isIncreasing
                    ? 0
                    : Math.min(Math.abs(currentQuantity), tradeQuantity);

                if (closedQuantity > 0) {
                    await tx
                        .update(orders)
                        .set({
                            realizedPnL: tradeRealizedPnL.toFixed(2),
                            averagePrice: currentAvgPrice.toFixed(2),
                        })
                        .where(eq(orders.id, trade.orderId));
                }

                if (newQuantity === 0) {
                    // Position closed, delete record
                    await tx
                        .delete(positions)
                        .where(
                            and(
                                eq(positions.userId, trade.userId),
                                eq(positions.instrumentToken, instrumentToken)
                            )
                        );
                    logger.debug({ userId: trade.userId, symbol: trade.symbol, pnl: tradeRealizedPnL }, "Position closed");
                } else {
                    // Update position
                    await tx
                        .update(positions)
                        .set({
                            quantity: newQuantity,
                            averagePrice: newAvgPrice.toString(),
                            realizedPnL: newRealizedPnL.toString(),
                            updatedAt: new Date(),
                        })
                        .where(
                            and(
                                eq(positions.userId, trade.userId),
                                eq(positions.instrumentToken, instrumentToken)
                            )
                        );
                    logger.debug({ userId: trade.userId, symbol: trade.symbol }, "Position updated");
                }
            }
        } catch (error) {
            logger.error({ err: error, trade }, "Failed to update position");
            throw error;
        }
    }

    /**
     * Get all positions for a user.
     */
    static async getPositions(userId: string) {
        try {
            const results = await db
                .select()
                .from(positions)
                .where(eq(positions.userId, userId));

            return results;
        } catch (error) {
            logger.error({ err: error, userId }, "Failed to get positions");
            throw error;
        }
    }

    /**
     * Get positions with Real-time PnL and Instrument Metadata.
     */
    static async getUserPositionsWithPnL(userId: string) {
        try {
            const userPositions = await db
                .select({
                    position: positions,
                    instrument: {
                        instrumentToken: instruments.instrumentToken,
                        instrumentType: instruments.instrumentType,
                        expiry: instruments.expiry,
                        lotSize: instruments.lotSize,
                    }
                })
                .from(positions)
                // STRICT JOIN on instrumentToken
                // Phase-0 Step 2: Symbol is display only.
                .leftJoin(instruments, eq(positions.instrumentToken, instruments.instrumentToken))
                .where(eq(positions.userId, userId));

            return userPositions.map(({ position, instrument }) => {
                const avgPrice = parseFloat(position.averagePrice);
                const quote = realTimeMarketService.getQuote(position.instrumentToken);
                const currentPrice = Number(quote?.price) || avgPrice;

                // Calculate PnL: (Current - Avg) * SignedQuantity
                const quantity = position.quantity;
                const unrealizedPnL = (currentPrice - avgPrice) * quantity;

                    const mappedPosition = {
                        id: position.id,
                        symbol: position.symbol,
                        instrumentToken: position.instrumentToken,
                        name: position.symbol, // Use symbol as name for now
                        quantity: Math.abs(quantity), // Frontend expects absolute
                        side: quantity > 0 ? "BUY" : "SELL" as "BUY" | "SELL",
                        entryPrice: avgPrice, // Map averagePrice to entryPrice for UI
                        averagePrice: avgPrice, // Keep for compatibility
                        currentPrice: currentPrice,
                        currentPnL: unrealizedPnL, // Map to currentPnL for UI
                        unrealizedPnL: unrealizedPnL,
                        realizedPnL: parseFloat(position.realizedPnL || "0"),
                        instrument: instrument?.instrumentType || "equity",
                        expiryDate: instrument?.expiry || null,
                        productType: position.productType ?? "CNC",
                        lotSize: instrument?.lotSize || 1,
                        leverage: Number(position.leverage ?? 1),
                        timestamp: position.createdAt || new Date()
                    };
                return mappedPosition;
            });
        } catch (error) {
            logger.error({ err: error, userId }, "Failed to get positions with PnL");
            throw error;
        }
    }

    /**
     * Calculate new position after a trade.
     * Handles weighted average pricing and realized P&L.
     */
    private static calculateNewPosition(
        currentQuantity: number,
        currentAvgPrice: number,
        currentRealizedPnL: number,
        tradeSide: "BUY" | "SELL",
        tradeQuantity: number,
        tradePrice: number
    ): { newQuantity: number; newAvgPrice: number; newRealizedPnL: number; tradeRealizedPnL: number } {
        const tradeQtyDelta = tradeSide === "BUY" ? tradeQuantity : -tradeQuantity;
        const newQuantity = currentQuantity + tradeQtyDelta;

        let newAvgPriceNum = currentAvgPrice;
        let tradeRealizedPnL = 0;

        const isIncreasing = (currentQuantity >= 0 && tradeSide === "BUY") ||
            (currentQuantity < 0 && tradeSide === "SELL");

        if (isIncreasing) {
            // Increasing position: recalculate weighted average using precise integer math
            // to avoid float drift (e.g. avg price creeping at the 6th decimal)
            const currentCostStr = LedgerService.multiplyByInteger(
                currentAvgPrice.toString(),
                Math.abs(currentQuantity)
            );
            const tradeCostStr = LedgerService.multiplyByInteger(
                tradePrice.toString(),
                tradeQuantity
            );
            const totalCostStr = LedgerService.add(currentCostStr, tradeCostStr);
            const totalQty = Math.abs(currentQuantity) + tradeQuantity;
            // Divide back — keep as float for the position row (string stored at 2dp)
            newAvgPriceNum = parseFloat(totalCostStr) / totalQty;
        } else {
            // Decreasing / closing: realize PnL using BigInt path so precision
            // matches the ledger (which uses LedgerService for the same calc).
            const closedQuantity = Math.min(Math.abs(currentQuantity), tradeQuantity);
            const direction = currentQuantity > 0 ? 1 : -1;
            const priceDeltaStr = LedgerService.subtract(
                tradePrice.toString(),
                currentAvgPrice.toString()
            );
            const grossStr = LedgerService.multiplyByInteger(priceDeltaStr, closedQuantity);
            // direction: long position profits on positive delta, short on negative
            const realizedStr = direction === 1 ? grossStr : LedgerService.subtract("0", grossStr);
            tradeRealizedPnL = parseFloat(realizedStr);

            // If reversing position (long→short or short→long), new avg = trade price
            if (Math.abs(newQuantity) > 0 && Math.sign(newQuantity) !== Math.sign(currentQuantity)) {
                newAvgPriceNum = tradePrice;
            }
        }

        // C-2 FIX: Use LedgerService string arithmetic for cumulative realizedPnL
        // so the position row stays in sync with ledger precision.
        const newRealizedPnLStr = LedgerService.add(
            currentRealizedPnL.toString(),
            tradeRealizedPnL.toString()
        );
        const newRealizedPnL = parseFloat(newRealizedPnLStr);

        // Round avg price to 4dp (sufficient for exchange prices up to ₹99,999)
        const newAvgPrice = Math.round(newAvgPriceNum * 10000) / 10000;

        return { newQuantity, newAvgPrice, newRealizedPnL, tradeRealizedPnL };
    }

    /**
     * Close a position (full or partial) by creating an opposite order.
     * For paper trading simplicity, we'll only support full close.
     */
    static async closePosition(
        userId: string,
        positionId: string,
        quantity?: number
    ) {
        try {
            // Get the position
            const [position] = await db
                .select()
                .from(positions)
                .where(and(
                    eq(positions.id, positionId),
                    eq(positions.userId, userId)
                ))
                .limit(1);

            if (!position) {
                throw new ApiError("Position not found", 404, "POSITION_NOT_FOUND");
            }

            // Get instrument for validation
            // Get from Repository (Fast & Consistent)
            if (!instrumentStore.isReady()) {
                await instrumentStore.initialize();
            }
            if (!instrumentStore.isReady()) {
                throw new ApiError("Instrument store not ready", 503, "INSTRUMENT_STORE_NOT_READY");
            }

            const instrumentToken = requireInstrumentTokenForIdentityLookup({
                context: "PositionService.closePosition",
                instrumentToken: position.instrumentToken,
                symbol: position.symbol,
            });

            const instrument = instrumentStore.getByToken(instrumentToken);

            if (!instrument) {
                throw new ApiError("Instrument not found", 404, "INSTRUMENT_NOT_FOUND");
            }

            // Determine close quantity (full close for paper trading)
            const closeQuantity = quantity || Math.abs(position.quantity);
            
            // Validate quantity
            if (closeQuantity > Math.abs(position.quantity)) {
                throw new ApiError(
                    `Cannot close ${closeQuantity} units. Position only has ${Math.abs(position.quantity)} units.`,
                    400,
                    "INVALID_QUANTITY"
                );
            }

            // Create opposite order (BUY position → SELL order, SELL position → BUY order)
            const oppositeSide: "BUY" | "SELL" = position.quantity > 0 ? "SELL" : "BUY";
            const resolvedProductType: ProductType =
                position.productType === "MIS" ? "MIS" : "CNC";

            // Import OrderService to place the closing order
            const { OrderService } = await import("@/services/trading/order/order.service");
            
            const closeOrder = await OrderService.placeOrder(userId, {
                symbol: position.symbol,
                instrumentToken,
                side: oppositeSide,
                quantity: closeQuantity,
                orderType: "MARKET", // Always use MARKET for closing
                productType: resolvedProductType,
                leverage: position.leverage ?? 1,
            }, { isClosingOrder: true }); // Skip margin/balance check — margin already blocked

            logger.info({ 
                userId, 
                positionId, 
                symbol: position.symbol, 
                closeQuantity,
                orderId: closeOrder.id 
            }, "Position close order placed");

            return {
                orderId: closeOrder.id,
                positionId: position.id,
                symbol: position.symbol,
                closedQuantity: closeQuantity,
                side: oppositeSide
            };
        } catch (error) {
            if (error instanceof ApiError) throw error;
            logger.error({ err: error, userId, positionId }, "Failed to close position");
            throw new ApiError("Failed to close position", 500, "POSITION_CLOSE_FAILED");
        }
    }
}

