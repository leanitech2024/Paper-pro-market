import { logger } from './logger.js';
import { getRedis } from './redis.js';
import { ltpKey, prevCloseKey, getCacheTtlWithJitter } from './market-cache.js';
import { db } from './db.js';
import { upstoxTokens } from './schema.js';
import { gt, desc } from 'drizzle-orm';
import type { MarketFeedSupervisor } from '../core/market-feed-supervisor.js';
import type { MarketLtpCacheRecord } from './market-cache.js';

const UPSTOX_QUOTE_API = 'https://api.upstox.com/v2/market-quote/quotes';

type UpstoxQuoteDetail = {
    last_price?: number;
    close_price?: number;
    instrument_token?: string;
    symbol?: string;
};

function chunk<T>(arr: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        out.push(arr.slice(i, i + size));
    }
    return out;
}

async function fetchUpstoxToken(): Promise<string | null> {
    try {
        const rows = await db
            .select({ accessToken: upstoxTokens.accessToken })
            .from(upstoxTokens)
            .where(gt(upstoxTokens.expiresAt, new Date()))
            .orderBy(desc(upstoxTokens.updatedAt))
            .limit(1);
        return rows[0]?.accessToken ?? null;
    } catch {
        return null;
    }
}

export async function warmRedisFromUpstox(supervisor: MarketFeedSupervisor): Promise<void> {
    const redis = getRedis();
    if (!redis) return;

    const symbols = supervisor.getActiveSymbols();
    if (symbols.length === 0) return;

    const token = await fetchUpstoxToken();
    if (!token) {
        logger.warn('Redis pre-warm: no valid Upstox token, skipping');
        return;
    }

    let totalWritten = 0;
    const batches = chunk(symbols, 50); // Upstox allows up to 500, 50 is safe

    for (const batch of batches) {
        try {
            const instrumentKeys = batch.join(',');
            const url = `${UPSTOX_QUOTE_API}?instrument_key=${encodeURIComponent(instrumentKeys)}`;
            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
            });

            if (!res.ok) {
                logger.warn({ status: res.status, batch: batch.length }, 'Redis pre-warm: Upstox fetch failed for batch');
                continue;
            }

            const json = await res.json() as { status?: string; data?: Record<string, UpstoxQuoteDetail> };
            if (json.status !== 'success' || !json.data) continue;

            const pipeline = redis.pipeline();
            const now = Date.now();
            let batchWritten = 0;

            for (const [rawKey, detail] of Object.entries(json.data)) {
                const price = Number(detail.last_price);
                if (!Number.isFinite(price) || price <= 0) continue;

                const prevClose = Number(detail.close_price) > 0 ? Number(detail.close_price) : price;
                const change = prevClose > 0 ? price - prevClose : 0;
                const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;

                const record: MarketLtpCacheRecord = {
                    instrumentKey: rawKey.replace(':', '|'),
                    symbol: detail.symbol,
                    price,
                    prevClose,
                    change,
                    changePct,
                    timestamp: now,
                };

                const ttl = getCacheTtlWithJitter();
                pipeline.set(ltpKey(record.instrumentKey), record, { ex: ttl });
                if (prevClose > 0) {
                    pipeline.set(prevCloseKey(record.instrumentKey), prevClose, { ex: ttl });
                }
                batchWritten++;
            }

            await pipeline.exec();
            totalWritten += batchWritten;
        } catch (err) {
            logger.warn({ err }, 'Redis pre-warm: batch failed, continuing');
        }
    }

    logger.info({ totalWritten, totalSymbols: symbols.length }, 'Redis pre-warm complete');
}
