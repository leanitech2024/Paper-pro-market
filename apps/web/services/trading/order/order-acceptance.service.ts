import type { PlaceOrder } from "@paper-market/core";
import type { Instrument } from "@paper-market/core";
import { ApiError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { priceOracle } from "@/services/market/pricing/price-oracle.service";
import { db } from "@/lib/db";
import { positions } from "@paper-market/core/db";
import { and, eq } from "drizzle-orm";

type AcceptanceContext = {
    userId?: string;
};

const PAPER_TRADING_MODE =
    String(process.env.PAPER_TRADING_MODE ?? "true").trim().toLowerCase() !== "false";
const DISABLE_NOTIONAL_CAP =
    String(process.env.DISABLE_NOTIONAL_CAP ?? (PAPER_TRADING_MODE ? "true" : "false"))
        .trim()
        .toLowerCase() === "true";

const DEFAULT_MAX_NOTIONAL_PER_ORDER = 50_000_000;
const MAX_NOTIONAL_PER_ORDER = Math.max(
    1,
    Number(process.env.MAX_NOTIONAL_PER_ORDER ?? DEFAULT_MAX_NOTIONAL_PER_ORDER)
);
const FAT_FINGER_SIMULATION_LIMIT = 0.50;
const EPSILON = 0.000001;

function toNumber(value: unknown, fallback = 0): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function isTickAligned(price: number, tickSize: number): boolean {
    const units = price / tickSize;
    return Math.abs(units - Math.round(units)) < EPSILON;
}

function isFullExitEnforcedInstrument(instrumentType: string): boolean {
    const normalized = String(instrumentType || "").toUpperCase();
    return normalized === "FUTURE" || normalized === "EQUITY" || normalized === "OPTION";
}

export class OrderAcceptanceService {
    private static async enforcePaperFullExitRule(
        payload: PlaceOrder,
        instrument: Instrument,
        userId?: string
    ): Promise<void> {
        if (!PAPER_TRADING_MODE) return;
        if (!userId) return;
        if (!isFullExitEnforcedInstrument(instrument.instrumentType)) return;

        const [existingPosition] = await db
            .select({ quantity: positions.quantity })
            .from(positions)
            .where(and(eq(positions.userId, userId), eq(positions.instrumentToken, instrument.instrumentToken)))
            .limit(1);

        const existingSignedQty = Number(existingPosition?.quantity ?? 0);
        if (!Number.isFinite(existingSignedQty) || existingSignedQty === 0) return;

        const existingAbsQty = Math.abs(existingSignedQty);
        const currentSide = existingSignedQty > 0 ? "BUY" : "SELL";
        const orderQty = toNumber(payload.quantity, NaN);

        if (payload.side === currentSide) return;

        if (!Number.isFinite(orderQty) || orderQty !== existingAbsQty) {
            throw new ApiError("Full exit required in paper mode.", 400, "PARTIAL_EXIT_NOT_ALLOWED");
        }
    }

    /**
     * NEW: Validate productType + leverage constraints.
     *
     * Rules:
     *   - CNC orders must have leverage === 1 (or undefined/null).
     *   - MIS orders may have leverage 1–10.
     *   - If productType is omitted it defaults to CNC, so leverage > 1 is
     *     rejected unless productType is explicitly 'MIS'.
     */
    private static validateProductTypeAndLeverage(payload: PlaceOrder): void {
        const productType = (payload as any).productType ?? "CNC";
        const leverage = toNumber((payload as any).leverage, 1);

        if (productType === "CNC" && leverage > 1) {
            throw new ApiError(
                "CNC orders cannot use leverage above 1x. Switch product type to MIS for leveraged intraday trading.",
                400,
                "CNC_LEVERAGE_NOT_ALLOWED"
            );
        }

        if (leverage < 1 || leverage > 10 || !Number.isInteger(leverage)) {
            throw new ApiError(
                "Leverage must be an integer between 1 and 10.",
                400,
                "INVALID_LEVERAGE"
            );
        }
    }

    /**
     * NEW: Validate stop-loss and target prices relative to order side.
     *
     * For a BUY order:
     *   - stopLossPrice must be < reference price (below entry)
     *   - targetPrice   must be > reference price (above entry)
     *
     * For a SELL order:
     *   - stopLossPrice must be > reference price (above entry — loss if price rises)
     *   - targetPrice   must be < reference price (below entry — profit if price falls)
     */
    private static validateSlAndTarget(
        payload: PlaceOrder,
        referencePrice: number
    ): void {
        const stopLossPrice = toNumber((payload as any).stopLossPrice, NaN);
        const targetPrice = toNumber((payload as any).targetPrice, NaN);
        const hasSl = Number.isFinite(stopLossPrice) && stopLossPrice > 0;
        const hasTarget = Number.isFinite(targetPrice) && targetPrice > 0;

        if (!hasSl && !hasTarget) return; // nothing to validate

        if (hasSl) {
            const validSl = payload.side === "BUY"
                ? stopLossPrice < referencePrice
                : stopLossPrice > referencePrice;

            if (!validSl) {
                throw new ApiError(
                    payload.side === "BUY"
                        ? `Stop-loss price (${stopLossPrice}) must be below entry price (${referencePrice}) for a BUY order.`
                        : `Stop-loss price (${stopLossPrice}) must be above entry price (${referencePrice}) for a SELL order.`,
                    400,
                    "INVALID_STOP_LOSS"
                );
            }
        }

        if (hasTarget) {
            const validTarget = payload.side === "BUY"
                ? targetPrice > referencePrice
                : targetPrice < referencePrice;

            if (!validTarget) {
                throw new ApiError(
                    payload.side === "BUY"
                        ? `Target price (${targetPrice}) must be above entry price (${referencePrice}) for a BUY order.`
                        : `Target price (${targetPrice}) must be below entry price (${referencePrice}) for a SELL order.`,
                    400,
                    "INVALID_TARGET"
                );
            }
        }

        // Guard: SL and Target must not cross each other
        if (hasSl && hasTarget) {
            if (payload.side === "BUY" && stopLossPrice >= targetPrice) {
                throw new ApiError(
                    `Stop-loss (${stopLossPrice}) must be below target (${targetPrice}) for a BUY order.`,
                    400,
                    "INVALID_STOP_LOSS"
                );
            }
            if (payload.side === "SELL" && stopLossPrice <= targetPrice) {
                throw new ApiError(
                    `Stop-loss (${stopLossPrice}) must be above target (${targetPrice}) for a SELL order.`,
                    400,
                    "INVALID_STOP_LOSS"
                );
            }
        }
    }

    static async validateOrder(
        payload: PlaceOrder,
        instrument: Instrument,
        context: AcceptanceContext = {}
    ): Promise<{ allowed: true }> {
        const quantity = toNumber(payload.quantity, NaN);
        if (!Number.isFinite(quantity) || quantity <= 0) {
            this.reject("QUANTITY_SANITY", "Quantity must be positive", context.userId, instrument.instrumentToken, null, quantity, 0);
        }

        // ── NEW: productType + leverage validation ────────────────────────────
        this.validateProductTypeAndLeverage(payload);

        await this.enforcePaperFullExitRule(payload, instrument, context.userId);

        const referencePrice = await priceOracle.getBestPrice(instrument.instrumentToken, {
            symbolHint: instrument.tradingsymbol,
            nameHint: instrument.name,
        });

        let orderPrice = referencePrice;
        if (payload.orderType === "LIMIT") {
            const limitPrice = toNumber(payload.limitPrice, NaN);
            if (!Number.isFinite(limitPrice) || limitPrice <= 0) {
                this.reject("PRICE_TICK_VALIDATION", "Limit price must be positive", context.userId, instrument.instrumentToken, limitPrice, quantity, 0);
            }
            const tickSize = Math.max(0.0001, toNumber(instrument.tickSize, 0.05));
            if (!isTickAligned(limitPrice, tickSize)) {
                this.reject("PRICE_TICK_VALIDATION", "Limit price must align with tick size", context.userId, instrument.instrumentToken, limitPrice, quantity, limitPrice * quantity);
            }
            const deviation = Math.abs(limitPrice - referencePrice) / Math.max(referencePrice, 0.01);
            if (deviation > FAT_FINGER_SIMULATION_LIMIT) {
                this.reject("FAT_FINGER_PRICE", "Limit price is too far from market reference. Reduce deviation.", context.userId, instrument.instrumentToken, limitPrice, quantity, limitPrice * quantity);
            }
            orderPrice = limitPrice;
        }

        // ── NEW: SL / Target direction validation (against reference price) ──
        this.validateSlAndTarget(payload, orderPrice);

        const notional = orderPrice * quantity;
        if (!Number.isFinite(notional) || notional <= 0) {
            this.reject("MAX_NOTIONAL_PER_ORDER", "Order size is too large for the simulation. Reduce quantity.", context.userId, instrument.instrumentToken, orderPrice, quantity, notional, MAX_NOTIONAL_PER_ORDER);
        }

        if (!DISABLE_NOTIONAL_CAP && notional > MAX_NOTIONAL_PER_ORDER) {
            this.reject("MAX_NOTIONAL_PER_ORDER", "Order size is too large for the simulation. Reduce quantity.", context.userId, instrument.instrumentToken, orderPrice, quantity, notional, MAX_NOTIONAL_PER_ORDER);
        }

        if (notional > MAX_NOTIONAL_PER_ORDER * 0.5) {
            logger.warn({
                event: "HIGH_RISK_SIMULATION_TRADE",
                userId: context.userId || "unknown",
                instrumentToken: instrument.instrumentToken,
                notional,
                quantity,
                price: orderPrice,
                maxAllowed: MAX_NOTIONAL_PER_ORDER,
                notionalCapDisabled: DISABLE_NOTIONAL_CAP,
            }, "HIGH_RISK_SIMULATION_TRADE");
        }

        return { allowed: true };
    }

    private static reject(
        code: "FAT_FINGER_PRICE" | "MAX_NOTIONAL_PER_ORDER" | "QUANTITY_SANITY" | "PRICE_TICK_VALIDATION",
        message: string,
        userId: string | undefined,
        instrumentToken: string,
        price: number | null,
        quantity: number,
        notional: number,
        maxAllowed?: number
    ): never {
        logger.warn({
            event: "ORDER_REJECTED_AT_ACCEPTANCE",
            code,
            userId: userId || "unknown",
            instrumentToken,
            price,
            quantity,
            notional,
            maxAllowed,
        }, "ORDER_REJECTED_AT_ACCEPTANCE");
        throw new ApiError(message, 400, code);
    }
}

