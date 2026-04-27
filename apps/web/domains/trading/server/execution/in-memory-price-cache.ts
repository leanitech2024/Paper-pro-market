import { NormalizedTick } from "@paper-market/core";
import { tickBus } from "@paper-market/core";

const MAX_CACHE_SIZE = 5000;

export interface CachedTick {
    price: number;
    bid: number;
    ask: number;
    bidQty?: number;
    askQty?: number;
    timestampMs: number;
}

/**
 * Fast, synchronous in-memory price cache for execution systems.
 * Updated continuously by the real-time tick bus.
 * Provides O(1) synchronous lookups so FillEngine doesn't have to wait for PriceResolver.
 */
class InMemoryPriceCache {
    private cache = new Map<string, CachedTick>();

    constructor() {
        // Subscribe to tick bus to hydrate the cache in real-time
        tickBus.on("tick", (tick: NormalizedTick) => this.handleTick(tick));
    }

    private handleTick(tick: NormalizedTick): void {
        const key = tick.instrumentKey || tick.symbol;
        if (!key) return;

        // Maintain capacity limit — evict oldest if necessary
        if (this.cache.size >= MAX_CACHE_SIZE && !this.cache.has(key)) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey) this.cache.delete(firstKey);
        }

        // We know bid/ask are required on NormalizedTick now
        this.cache.set(key, {
            price: tick.price,
            bid: tick.bid,
            ask: tick.ask,
            bidQty: tick.bidQty,
            askQty: tick.askQty,
            timestampMs: (tick.timestamp || Date.now() / 1000) * 1000,
        });
    }

    /**
     * Get the immediate last known tick from memory without relying on async resolution.
     */
    get(instrumentKey: string): CachedTick | null {
        return this.cache.get(instrumentKey) || null;
    }

    clear(): void {
        this.cache.clear();
    }
}

declare global {
    var __inMemoryPriceCacheInstance: InMemoryPriceCache | undefined;
}

const globalState = globalThis as unknown as {
    __inMemoryPriceCacheInstance?: InMemoryPriceCache;
};

export const inMemoryPriceCache =
    globalState.__inMemoryPriceCacheInstance || new InMemoryPriceCache();

globalState.__inMemoryPriceCacheInstance = inMemoryPriceCache;
