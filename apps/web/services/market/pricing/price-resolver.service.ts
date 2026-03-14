import type { Instrument } from "@paper-market/core";
import { ensureBidAsk } from "@paper-market/core";
import { priceOracle } from "@/services/market/pricing/price-oracle.service";
import { realTimeMarketService } from "@/services/market/feeds/realtime-market.service";
import { marketSimulation } from "@/services/market/feeds/market-simulation.service";

export type PriceSource = "REALTIME" | "ORACLE" | "SIMULATION" | "FALLBACK";

export type ResolvedPrice = {
  price: number;
  bid?: number;
  ask?: number;
  bidQty?: number;
  askQty?: number;
  source: PriceSource;
  timestampMs: number | null;
};

type ResolveOptions = {
  cacheTtlMs?: number;
  allowOracle?: boolean;
  allowSimulation?: boolean;
  allowFallback?: boolean;
  symbolHint?: string;
  nameHint?: string;
};

const DEFAULT_CACHE_TTL_MS = 400;
const REALTIME_MAX_AGE_MS =
  Number(process.env.FILL_TICK_MAX_AGE_SECONDS ?? "8") * 1000;
/** Maximum number of entries in the resolver cache – oldest evicted when exceeded */
const MAX_CACHE_SIZE = Math.max(
  100,
  Number(process.env.PRICE_RESOLVER_CACHE_MAX_SIZE ?? "5000")
);

type CacheEntry = {
  price: number;
  bid?: number;
  ask?: number;
  bidQty?: number;
  askQty?: number;
  source: PriceSource;
  timestampMs: number | null;
  expiresAt: number;
};

export class PriceResolverService {
  private static cache = new Map<string, CacheEntry>();

  static clearCache(): void {
    this.cache.clear();
  }

  static async resolvePrice(
    instrument: Instrument,
    options: ResolveOptions = {}
  ): Promise<ResolvedPrice> {
    const cacheKey = instrument.instrumentToken;
    const ttlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
    const now = Date.now();
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return {
        price: cached.price,
        bid: cached.bid,
        ask: cached.ask,
        bidQty: cached.bidQty,
        askQty: cached.askQty,
        source: cached.source,
        timestampMs: cached.timestampMs,
      };
    }

    const realtime = this.resolveRealtime(instrument);
    if (realtime) {
      this.setCached(cacheKey, { ...realtime, expiresAt: now + ttlMs });
      return realtime;
    }

    if (options.allowOracle ?? true) {
      try {
        const oraclePrice = await priceOracle.getBestPrice(
          instrument.instrumentToken,
          {
            symbolHint: options.symbolHint || instrument.tradingsymbol,
            nameHint: options.nameHint || instrument.name,
          }
        );
        const normalized = this.normalizePrice(oraclePrice);
        if (normalized > 0) {
          const { bid, ask } = ensureBidAsk(normalized, undefined, undefined);
          const resolved: ResolvedPrice = {
            price: normalized,
            bid,
            ask,
            source: "ORACLE",
            timestampMs: null,
          };
          this.setCached(cacheKey, { ...resolved, expiresAt: now + ttlMs });
          return resolved;
        }
      } catch {
        // fall through
      }
    }

    if (options.allowSimulation ?? true) {
      const simulated = this.resolveSimulation(instrument);
      if (simulated) {
        this.setCached(cacheKey, { ...simulated, expiresAt: now + ttlMs });
        return simulated;
      }
    }

    // No price available from any source — return NO_PRICE_AVAILABLE marker.
    // Never fabricate a price (e.g. lastPrice ?? 0.01).
    return { price: 0, source: "FALLBACK", timestampMs: null };
  }

  /**
   * Set a cache entry, evicting oldest if MAX_CACHE_SIZE is exceeded.
   */
  private static setCached(key: string, entry: CacheEntry): void {
    if (this.cache.size >= MAX_CACHE_SIZE) {
      // Map iteration order is insertion order — delete oldest first
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }
    this.cache.set(key, entry);
  }

  private static resolveRealtime(
    instrument: Instrument
  ): ResolvedPrice | null {
    const keys = new Set<string>();
    if (instrument.instrumentToken) keys.add(instrument.instrumentToken);
    if (instrument.tradingsymbol) keys.add(instrument.tradingsymbol);
    if (instrument.name) keys.add(instrument.name);

    const candidates = Array.from(keys).map(key => realTimeMarketService.getQuote(key));

    for (const liveQuote of candidates) {
      if (!liveQuote) continue;
      const price = this.normalizePrice(liveQuote.price);
      if (price <= 0) continue;

      const exchangeTs =
        Number.isFinite(liveQuote.timestamp) && (liveQuote.timestamp as number) > 0
          ? (liveQuote.timestamp as number)
          : null;
      const receptionTs =
        liveQuote.lastUpdated instanceof Date
          ? liveQuote.lastUpdated.getTime()
          : null;
      const timestampMs = exchangeTs ?? receptionTs;
      const ageMs = timestampMs ? Date.now() - timestampMs : Number.POSITIVE_INFINITY;
      if (!timestampMs || !Number.isFinite(ageMs) || ageMs < -5000 || ageMs > REALTIME_MAX_AGE_MS) {
        continue;
      }

      return {
        price,
        bid: liveQuote.bid,
        ask: liveQuote.ask,
        bidQty: liveQuote.bidQty,
        askQty: liveQuote.askQty,
        source: "REALTIME",
        timestampMs,
      };
    }

    return null;
  }

  private static resolveSimulation(
    instrument: Instrument
  ): ResolvedPrice | null {
    const simulated =
      marketSimulation.getQuote(instrument.tradingsymbol) ||
      (instrument.name !== instrument.tradingsymbol ? marketSimulation.getQuote(instrument.name) : null);
    if (!simulated) return null;
    const price = this.normalizePrice(simulated.price);
    if (price <= 0) return null;

    const { bid, ask } = ensureBidAsk(price, undefined, undefined);
    return {
      price,
      bid,
      ask,
      source: "SIMULATION",
      timestampMs:
        simulated.lastUpdated instanceof Date
          ? simulated.lastUpdated.getTime()
          : null,
    };
  }

  private static normalizePrice(value: unknown, fallback = 0): number {
    const price = Number(value);
    return Number.isFinite(price) && price > 0 ? price : fallback;
  }
}
