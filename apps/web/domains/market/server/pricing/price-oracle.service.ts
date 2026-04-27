import { logger } from "@/lib/logger";
import { toInstrumentKey } from "@paper-market/core";
import { realTimeMarketService } from "@/domains/market/server/feeds/realtime-market.service";
import { UpstoxService, type SystemQuoteDetail } from "@/domains/market/server/feeds/upstox-feed.service";
import { marketSimulation } from "@/domains/market/server/feeds/market-simulation.service";
import { instrumentStore } from "@/domains/market/stores/instrument.store";

const SNAPSHOT_CACHE_TTL_MS = Math.max(
    100,
    Number(process.env.PRICE_ORACLE_SNAPSHOT_CACHE_MS ?? "1500")
);

function toPrice(value: unknown): number | null {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return null;
    return numeric;
}

function normalizeTokenKey(value: string): string {
    return String(value || "").trim().toUpperCase().replace(":", "|");
}

type PriceOracleHints = {
    symbolHint?: string;
    nameHint?: string;
};

const PRICE_CACHE_MAX_SIZE = Math.max(
    100,
    Number(process.env.PRICE_ORACLE_CACHE_MAX_SIZE ?? "10000")
);

export class PriceOracleService {
    private readonly recentPriceByToken = new Map<string, { price: number; expiresAt: number }>();
    private readonly inflight = new Map<string, Promise<SystemQuoteDetail | null>>();

    private evictStaleEntries(): void {
        const now = Date.now();
        for (const [key, entry] of this.recentPriceByToken) {
            if (entry.expiresAt <= now) this.recentPriceByToken.delete(key);
        }
        if (this.recentPriceByToken.size > PRICE_CACHE_MAX_SIZE) {
            const overflow = this.recentPriceByToken.size - PRICE_CACHE_MAX_SIZE;
            let evicted = 0;
            for (const key of this.recentPriceByToken.keys()) {
                if (evicted >= overflow) break;
                this.recentPriceByToken.delete(key);
                evicted++;
            }
        }
    }

    private resolveSnapshotDetail(
        requestedToken: string,
        details: Record<string, SystemQuoteDetail>
    ): SystemQuoteDetail | null {
        const requested = normalizeTokenKey(requestedToken);
        if (!requested) return null;
        const entries = Object.entries(details);
        if (entries.length === 1) {
            return entries[0][1];
        }

        for (const [key, detail] of entries) {
            const normalizedKey = normalizeTokenKey(key);
            if (normalizedKey === requested) return detail;
        }

        const requestedParts = requested.split("|");
        const requestedSuffix = requestedParts.length > 1 ? requestedParts.slice(1).join("|") : requestedParts[0];
        for (const [key, detail] of entries) {
            const normalizedKey = normalizeTokenKey(key);
            const keyParts = normalizedKey.split("|");
            const keySuffix = keyParts.length > 1 ? keyParts.slice(1).join("|") : keyParts[0];
            if (keySuffix === requestedSuffix) return detail;
        }

        return null;
    }

    private async getSnapshotDetail(token: string): Promise<SystemQuoteDetail | null> {
        const now = Date.now();
        const cached = this.recentPriceByToken.get(token);
        if (cached && cached.expiresAt > now) {
            return { lastPrice: cached.price, closePrice: null };
        }

        const existing = this.inflight.get(token);
        if (existing) {
            return existing;
        }

        const task = (async () => {
            const details = await UpstoxService.getSystemQuoteDetails([token]);
            const detail = this.resolveSnapshotDetail(token, details);
            const price = toPrice(detail?.lastPrice);
            if (price !== null) {
                this.recentPriceByToken.set(token, {
                    price,
                    expiresAt: Date.now() + SNAPSHOT_CACHE_TTL_MS,
                });
                this.evictStaleEntries();
            }
            return detail;
        })();

        this.inflight.set(token, task);
        try {
            return await task;
        } finally {
            this.inflight.delete(token);
        }
    }

    async getBestPrice(instrumentToken: string, hints: PriceOracleHints = {}): Promise<number> {
        const token = toInstrumentKey(String(instrumentToken || ""));
        if (!token) {
            throw new Error(`NO_PRICE_AVAILABLE: empty instrumentToken`);
        }

        try {
            let resolvedSymbol = String(hints.symbolHint || "").trim();
            let resolvedName = String(hints.nameHint || "").trim();
            if (instrumentStore.isReady()) {
                const instrument = instrumentStore.getByToken(token);
                if (instrument) {
                    if (!resolvedSymbol) resolvedSymbol = instrument.tradingsymbol;
                    if (!resolvedName) resolvedName = instrument.name;
                }
            }

            const liveCandidates = [token, resolvedSymbol, resolvedName];
            for (const candidate of liveCandidates) {
                if (!candidate) continue;
                const liveQuote = realTimeMarketService.getQuote(candidate);
                const livePrice = toPrice(liveQuote?.price);
                if (livePrice !== null) return livePrice;
            }

            const simulationCandidates = [resolvedSymbol, resolvedName];
            for (const candidate of simulationCandidates) {
                if (!candidate) continue;
                const simulationQuote = marketSimulation.getQuote(candidate);
                const simulationPrice = toPrice(simulationQuote?.price);
                if (simulationPrice !== null) return simulationPrice;
            }

            let snapshotDetail: SystemQuoteDetail | null = null;
            try {
                snapshotDetail = await this.getSnapshotDetail(token);
            } catch (err) {
                logger.warn(
                    { err: err, instrumentToken: token },
                    "Snapshot price lookup failed in PriceOracle"
                );
            }

            const snapshotPrice = toPrice(snapshotDetail?.lastPrice);
            if (snapshotPrice !== null) return snapshotPrice;

            const closePrice = toPrice(snapshotDetail?.closePrice);
            if (closePrice !== null) return closePrice;
        } catch (err) {
            logger.warn(
                { err: err, instrumentToken: token },
                "PriceOracle ladder failed"
            );
        }

        logger.error(
            { instrumentToken: token },
            "NO_PRICE_AVAILABLE: all price sources exhausted"
        );
        throw new Error(`NO_PRICE_AVAILABLE: no price found for ${token}`);
    }
}

export const priceOracle = new PriceOracleService();
