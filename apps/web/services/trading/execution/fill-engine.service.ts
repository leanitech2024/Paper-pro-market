import { orders } from "@paper-market/core/db";
import type { Instrument } from "@paper-market/core";
import { PriceResolverService } from "@/services/market/pricing/price-resolver.service";
import { feedHealthService } from "@/services/market/feeds/feed-health.service";
import { inMemoryPriceCache } from "./in-memory-price-cache";

const PAPER_TRADING_MODE =
    String(process.env.PAPER_TRADING_MODE ?? "true").trim().toLowerCase() !== "false";

export interface SlippageModel {
    getSlippageBps(instrument: Instrument): number;
}

type TickDataSource = "REALTIME" | "SIMULATION" | "ORACLE" | "FALLBACK" | "NONE";
type TickDataSourceExtended = TickDataSource | "SETTLEMENT";
type FillReason =
    | "FILLABLE"
    | "NO_TICK"
    | "LIMIT_NOT_REACHED"
    | "INVALID_LIMIT_PRICE"
    | "STALE_TICK"
    | "FEED_UNAVAILABLE";

export type FillDecision = {
    shouldFill: boolean;
    executionPrice: number | null;
    fillableQuantity: number;
    tickPrice: number | null;
    tickTimestampMs: number | null;
    slippageBps: number;
    source: TickDataSourceExtended;
    reason: FillReason;
    resolvedBy: "FILL_ENGINE_V1";
};

type DbOrder = typeof orders.$inferSelect;

/** Maximum age for a tick to be eligible for fill execution */
const MAX_FILL_TICK_AGE_MS = 3000;

/** Liquidity availability multiplier — allows partial over-fill for paper trading realism */
const LIQUIDITY_MULTIPLIER = 5;

class TieredSlippageModel implements SlippageModel {
    private readonly equityBps = this.readBps("FILL_SLIPPAGE_BPS_EQUITY", 5);
    private readonly futuresBps = this.readBps("FILL_SLIPPAGE_BPS_FUTURES", 10);
    private readonly optionsBps = this.readBps("FILL_SLIPPAGE_BPS_OPTIONS", 15);

    getSlippageBps(instrument: Instrument): number {
        if (instrument.instrumentType === "OPTION") return this.optionsBps;
        if (instrument.instrumentType === "FUTURE") return this.futuresBps;
        return this.equityBps;
    }

    private readBps(envName: string, fallback: number): number {
        const raw = Number(process.env[envName]);
        if (!Number.isFinite(raw)) return fallback;
        return Math.min(15, Math.max(5, raw));
    }
}

export class FillEngineService {
    private static slippageModel: SlippageModel = new TieredSlippageModel();

    static setSlippageModel(model: SlippageModel): void {
        this.slippageModel = model;
    }

    static async resolveFill(order: DbOrder, instrument: Instrument): Promise<FillDecision> {
        // Settlement fills (expiry) bypass market checks
        if (order.orderType === "MARKET" && order.exitReason === "EXPIRY") {
            const settlementPrice = Number(order.limitPrice);
            if (Number.isFinite(settlementPrice) && settlementPrice >= 0) {
                const executionPrice = Number(settlementPrice.toFixed(4));
                return {
                    shouldFill: true,
                    executionPrice,
                    fillableQuantity: order.quantity,
                    tickPrice: settlementPrice,
                    tickTimestampMs: Date.now(),
                    slippageBps: 0,
                    source: "SETTLEMENT",
                    reason: "FILLABLE",
                    resolvedBy: "FILL_ENGINE_V1",
                };
            }
        }

        // Feed health guard — reject if market data feed is unhealthy
        if (!feedHealthService.isFeedHealthy() && !PAPER_TRADING_MODE) {
            return {
                shouldFill: false,
                executionPrice: null,
                fillableQuantity: 0,
                tickPrice: null,
                tickTimestampMs: null,
                slippageBps: 0,
                source: "NONE",
                reason: "FEED_UNAVAILABLE",
                resolvedBy: "FILL_ENGINE_V1",
            };
        }

        const tick = await this.resolveTick(instrument);
        if (!tick) {
            return {
                shouldFill: false,
                executionPrice: null,
                fillableQuantity: 0,
                tickPrice: null,
                tickTimestampMs: null,
                slippageBps: 0,
                source: "NONE",
                reason: "NO_TICK",
                resolvedBy: "FILL_ENGINE_V1",
            };
        }

        // Stale tick guard — reject if tick is older than MAX_FILL_TICK_AGE_MS
        if (tick.timestampMs !== null && (Date.now() - tick.timestampMs > MAX_FILL_TICK_AGE_MS)) {
            return {
                shouldFill: false,
                executionPrice: null,
                fillableQuantity: 0,
                tickPrice: tick.price,
                tickTimestampMs: tick.timestampMs,
                slippageBps: 0,
                source: tick.source,
                reason: "STALE_TICK",
                resolvedBy: "FILL_ENGINE_V1",
            };
        }

        if (order.orderType === "MARKET") {
            const slippageBps = this.slippageModel.getSlippageBps(instrument);
            const direction = order.side === "BUY" ? 1 : -1;
            // BUY executes at ask, SELL executes at bid — correct market semantics
            const basePrice = order.side === "BUY" ? tick.ask : tick.bid;
            const slipped = basePrice * (1 + direction * (slippageBps / 10_000));
            const executionPrice = this.roundForMarket(slipped, instrument.tickSize, order.side);

            // Liquidity-aware fill: respect available qty on our side with multiplier
            const rawAvailableQty = order.side === "BUY" ? tick.askQty : tick.bidQty;
            const availableQty = rawAvailableQty !== undefined
                ? rawAvailableQty * LIQUIDITY_MULTIPLIER
                : Infinity;
            const maxFill = Math.min(order.quantity, availableQty);

            return {
                shouldFill: executionPrice > 0 && maxFill > 0,
                executionPrice: executionPrice > 0 && maxFill > 0 ? executionPrice : null,
                fillableQuantity: executionPrice > 0 && maxFill > 0 ? maxFill : 0,
                tickPrice: tick.price,
                tickTimestampMs: tick.timestampMs,
                slippageBps,
                source: tick.source,
                reason: executionPrice > 0 && maxFill > 0 ? "FILLABLE" : "NO_TICK",
                resolvedBy: "FILL_ENGINE_V1",
            };
        }

        // Limit order
        const limitPrice = Number(order.limitPrice);
        if (!Number.isFinite(limitPrice) || limitPrice <= 0) {
            return {
                shouldFill: false,
                executionPrice: null,
                fillableQuantity: 0,
                tickPrice: tick.price,
                tickTimestampMs: tick.timestampMs,
                slippageBps: 0,
                source: tick.source,
                reason: "INVALID_LIMIT_PRICE",
                resolvedBy: "FILL_ENGINE_V1",
            };
        }

        // Limit conditions use bid/ask: BUY fills when ask <= limitPrice, SELL when bid >= limitPrice
        const checkPrice = order.side === "BUY" ? tick.ask : tick.bid;
        const canFill =
            order.side === "BUY"
                ? checkPrice <= limitPrice
                : checkPrice >= limitPrice;

        if (!canFill) {
            return {
                shouldFill: false,
                executionPrice: null,
                fillableQuantity: 0,
                tickPrice: tick.price,
                tickTimestampMs: tick.timestampMs,
                slippageBps: 0,
                source: tick.source,
                reason: "LIMIT_NOT_REACHED",
                resolvedBy: "FILL_ENGINE_V1",
            };
        }

        const executionPrice = this.roundForLimit(checkPrice, instrument.tickSize, order.side);
        return {
            shouldFill: executionPrice > 0,
            executionPrice: executionPrice > 0 ? executionPrice : null,
            fillableQuantity: executionPrice > 0 ? order.quantity : 0,
            tickPrice: tick.price,
            tickTimestampMs: tick.timestampMs,
            slippageBps: 0,
            source: tick.source,
            reason: executionPrice > 0 ? "FILLABLE" : "NO_TICK",
            resolvedBy: "FILL_ENGINE_V1",
        };
    }

    private static async resolveTick(
        instrument: Instrument
    ): Promise<{ price: number; bid: number; ask: number; bidQty?: number; askQty?: number; timestampMs: number | null; source: TickDataSource } | null> {
        // Fast path: synchronous memory cache lookup
        const cached = inMemoryPriceCache.get(instrument.instrumentToken);
        if (cached && Date.now() - cached.timestampMs < MAX_FILL_TICK_AGE_MS) {
            return {
                ...cached,
                source: "REALTIME"
            };
        }

        const resolved = await PriceResolverService.resolvePrice(instrument, {
            allowOracle: true,
            allowSimulation: true,
            allowFallback: false, // Never use last-resort fallback for execution
        });
        if (!Number.isFinite(resolved.price) || resolved.price <= 0) {
            return null;
        }
        // bid/ask are guaranteed by PriceResolverService (via NormalizedTick contract)
        // but we defensively ensure them here if coming from oracle/simulation
        const { bid, ask } = resolved.bid !== undefined && resolved.ask !== undefined
            ? { bid: resolved.bid, ask: resolved.ask }
            : {
                bid: resolved.price * (1 - 5 / 20_000),
                ask: resolved.price * (1 + 5 / 20_000),
            };
        return {
            price: resolved.price,
            bid,
            ask,
            bidQty: resolved.bidQty,
            askQty: resolved.askQty,
            timestampMs: resolved.timestampMs,
            source: resolved.source,
        };
    }

    private static roundForMarket(price: number, tickSizeRaw: string, side: DbOrder["side"]): number {
        const tickSize = Number(tickSizeRaw);
        if (!Number.isFinite(price) || price <= 0) return 0;
        if (!Number.isFinite(tickSize) || tickSize <= 0) {
            return Number(price.toFixed(2));
        }

        const units = price / tickSize;
        const roundedUnits = side === "BUY"
            ? Math.ceil(units - 1e-9)
            : Math.floor(units + 1e-9);

        const rounded = Math.max(tickSize, roundedUnits * tickSize);
        return Number(rounded.toFixed(4));
    }

    private static roundForLimit(price: number, tickSizeRaw: string, side: DbOrder["side"]): number {
        const tickSize = Number(tickSizeRaw);
        if (!Number.isFinite(price) || price <= 0) return 0;
        if (!Number.isFinite(tickSize) || tickSize <= 0) {
            return Number(price.toFixed(2));
        }

        const units = price / tickSize;
        const roundedUnits = side === "BUY"
            ? Math.floor(units + 1e-9)
            : Math.ceil(units - 1e-9);

        const rounded = Math.max(tickSize, roundedUnits * tickSize);
        return Number(rounded.toFixed(4));
    }
}
