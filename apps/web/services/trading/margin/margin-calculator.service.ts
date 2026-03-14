import { ApiError } from "@/lib/errors";
import type { Instrument } from "@paper-market/core";
import type { PlaceOrder } from "@paper-market/core";
import { PriceResolverService } from "@/services/market/pricing/price-resolver.service";
import { instrumentStore } from "@/stores/instrument.store";
import {
    calculateLongOptionMargin,
    calculateShortOptionMargin,
    calculateFuturesRequiredMargin,
} from "@paper-market/core";

/**
 * MarginCalculatorService - Calculates required margin for different instrument types.
 * Price resolution is delegated to PriceOracle and must never fail due to feed gaps.
 */
export class MarginCalculatorService {
    private static normalizePrice(value: unknown, fallback = 0.01): number {
        const price = Number(value);
        return Number.isFinite(price) && price > 0 ? price : fallback;
    }

    private static resolveUnderlyingToken(instrument: Instrument): string | null {
        if (!instrumentStore.isReady()) return null;
        const hint = String(instrument.name || "").trim();
        if (!hint) return null;

        // Check exact symbol match first (fastest)
        const bySymbol = instrumentStore.getBySymbol(hint);
        if (bySymbol?.instrumentToken) return bySymbol.instrumentToken;

        // H-3 FIX: Use the O(1) byName index instead of iterating all instruments.
        // Previously this iterated instrumentStore.getAll() (potentially 100k+ items)
        // on every option margin calculation, adding significant latency per option order.
        const byName = instrumentStore.getByName(hint);
        if (byName?.instrumentToken &&
            (byName.instrumentType === "INDEX" || byName.instrumentType === "EQUITY")) {
            return byName.instrumentToken;
        }

        return null;
    }

    static async resolveOptionUnderlyingPrice(
        instrument: Instrument,
        optionPriceFallback: number
    ): Promise<number> {
        const fallback = this.normalizePrice(optionPriceFallback, 0.01);
        const underlyingToken = this.resolveUnderlyingToken(instrument);
        if (!underlyingToken) return fallback;

        try {
            const underlying = instrumentStore.getByToken(underlyingToken);
            if (!underlying) return fallback;
            const resolved = await PriceResolverService.resolvePrice(underlying, {
                cacheTtlMs: 400,
                symbolHint: underlying.tradingsymbol,
                nameHint: underlying.name,
            });
            return this.normalizePrice(resolved.price, fallback);
        } catch {
            return fallback;
        }
    }

    static async calculateOptionShortMarginForQuantity(
        instrument: Instrument,
        quantity: number,
        optionPrice: number
    ): Promise<number> {
        const safeQty = Math.max(0, Number(quantity) || 0);
        if (safeQty === 0) return 0;

        const optionPriceSafe = this.normalizePrice(optionPrice, 0.01);
        const underlyingPrice = await this.resolveOptionUnderlyingPrice(instrument, optionPriceSafe);

        return calculateShortOptionMargin({
            optionPrice: optionPriceSafe,
            underlyingPrice,
            quantity: safeQty,
        });
    }

    private static async resolveExecutionPrice(
        orderPayload: PlaceOrder,
        instrument: Instrument
    ): Promise<number> {
        if (orderPayload.orderType === "LIMIT") {
            const limitPrice = Number(orderPayload.limitPrice);
            if (Number.isFinite(limitPrice) && limitPrice > 0) {
                return limitPrice;
            }
        }

        const resolved = await PriceResolverService.resolvePrice(instrument, {
            cacheTtlMs: 400,
            symbolHint: instrument.tradingsymbol,
            nameHint: instrument.name,
        });
        return this.normalizePrice(resolved.price, 0.01);
    }

    /**
     * Calculate required margin based on instrument type and order details
     */
    static async calculateRequiredMargin(
        orderPayload: PlaceOrder,
        instrument: Instrument
    ): Promise<number> {
        const { quantity, side } = orderPayload;
        const price = await this.resolveExecutionPrice(orderPayload, instrument);

        switch (instrument.instrumentType) {
            case "EQUITY":
                return quantity * price;

            case "FUTURE": {
                return calculateFuturesRequiredMargin({
                    price,
                    quantity,
                    leverage: orderPayload.leverage,
                    instrument,
                });
            }

            case "OPTION":
                if (side === "BUY") {
                    return calculateLongOptionMargin(price, quantity);
                }
                return this.calculateOptionShortMarginForQuantity(instrument, quantity, price);

            case "INDEX":
                throw new ApiError(
                    "Indices cannot be traded directly",
                    400,
                    "INVALID_INSTRUMENT_TYPE"
                );

            default:
                throw new ApiError(
                    `Unsupported instrument type: ${instrument.instrumentType}`,
                    400,
                    "INVALID_INSTRUMENT_TYPE"
                );
        }
    }

    /**
     * Calculate required margin specifically for an existing open MTM position
     */
    static async calculatePositionMargin(
        instrumentToken: string,
        quantity: number,
        markPrice: number,
        cacheFallbackStrategy: (token: string, fallback: number) => number
    ): Promise<number> {
        const instrument = instrumentStore.isReady()
            ? instrumentStore.getByToken(instrumentToken)
            : null;
        
        if (!instrument) return 0;
        
        switch (instrument.instrumentType) {
            case "EQUITY":
                return Math.abs(quantity) * markPrice;

            case "FUTURE": {
                return calculateFuturesRequiredMargin({
                    price: markPrice,
                    quantity: Math.abs(quantity),
                    leverage: 1, // positions are assumed un-leveraged long term unless specific
                    instrument,
                });
            }

            case "OPTION":
                if (quantity > 0) { // Long option
                    return calculateLongOptionMargin(markPrice, Math.abs(quantity));
                }
                // Short option
                const safeQty = Math.max(0, Math.abs(quantity));
                const underlyingPrice = cacheFallbackStrategy(instrument.instrumentToken, markPrice);
                return calculateShortOptionMargin({
                    optionPrice: markPrice,
                    underlyingPrice,
                    quantity: safeQty,
                });

            default:
                return 0;
        }
    }

    static async calculateTotalMargin(
        orders: Array<{ payload: PlaceOrder; instrument: Instrument }>
    ): Promise<number> {
        const margins = await Promise.all(
            orders.map(({ payload, instrument }) =>
                this.calculateRequiredMargin(payload, instrument)
            )
        );
        return margins.reduce((total, margin) => total + margin, 0);
    }

    static validateMarginRequirement(margin: number, maxAllowed: number = 100000000): boolean {
        if (margin < 0) {
            throw new ApiError("Margin cannot be negative", 500, "INVALID_MARGIN_CALCULATION");
        }
        if (!Number.isFinite(margin)) {
            throw new ApiError("Margin calculation overflow", 500, "INVALID_MARGIN_CALCULATION");
        }
        if (margin > maxAllowed) {
            throw new ApiError(
                `Margin requirement (INR ${margin}) exceeds maximum allowed (INR ${maxAllowed})`,
                400,
                "MARGIN_TOO_HIGH"
            );
        }
        return true;
    }
}

