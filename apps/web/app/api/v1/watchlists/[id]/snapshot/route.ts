import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { instruments, watchlistItems, watchlists } from '@paper-market/core/db';
import { getRedis } from '@/lib/redis';
import { ltpKey, parseMarketLtpCacheRecord } from '@/lib/market/market-cache';
import { toInstrumentKey } from '@paper-market/core';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Single query — verify ownership AND fetch instruments in one JOIN
    const rows = await db
      .select({
        watchlistId: watchlists.id,
        watchlistName: watchlists.name,
        instrumentToken: instruments.instrumentToken,
        tradingsymbol: instruments.tradingsymbol,
        name: instruments.name,
        lotSize: instruments.lotSize,
        exchange: instruments.exchange,
        segment: instruments.segment,
        addedAt: watchlistItems.addedAt,
      })
      .from(watchlists)
      .innerJoin(watchlistItems, eq(watchlists.id, watchlistItems.watchlistId))
      .innerJoin(instruments, eq(watchlistItems.instrumentToken, instruments.instrumentToken))
      .where(
        and(
          eq(watchlists.id, id),
          eq(watchlists.userId, session.user.id)
        )
      )
      .orderBy(watchlistItems.addedAt);

    if (rows.length === 0) {
      // Could be empty watchlist or unauthorized — check ownership
      const watchlist = await db.query.watchlists.findFirst({
        where: and(
          eq(watchlists.id, id),
          eq(watchlists.userId, session.user.id)
        ),
      });

      if (!watchlist) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, data: [] });
    }

    // Batch Redis lookup — single mget for all instruments at once
    const instrumentTokens = rows.map(r => r.instrumentToken);
    const priceMap = new Map<string, { price: number; change: number; changePct: number }>();
    const quoteKeyCandidatesByToken = new Map<string, string[]>();

    for (const row of rows) {
      const normalizedToken = toInstrumentKey(row.instrumentToken);
      const symbol = String(row.tradingsymbol || '').trim().toUpperCase();
      const prefix = normalizedToken.split(/[|:]/)[0] || '';
      const candidates = Array.from(
        new Set(
          [
            normalizedToken,
            prefix && symbol ? `${prefix}|${symbol}` : '',
          ].filter(Boolean)
        )
      );

      quoteKeyCandidatesByToken.set(row.instrumentToken, candidates);
    }

    const redis = getRedis();
    if (redis) {
      try {
        const redisKeyToToken = new Map<string, string>();
        const keys = Array.from(
          new Set(
            instrumentTokens.flatMap((token) => {
              const candidates = quoteKeyCandidatesByToken.get(token) ?? [toInstrumentKey(token)];
              return candidates.map((candidate) => {
                const key = ltpKey(candidate);
                redisKeyToToken.set(key, token);
                return key;
              });
            })
          )
        );
        const values = await redis.mget(...keys);
        values.forEach((val, idx) => {
          const parsed = parseMarketLtpCacheRecord(val);
          if (!parsed || !parsed.price) return;
          const originalToken = redisKeyToToken.get(keys[idx]);
          if (!originalToken) return;
          priceMap.set(originalToken, {
            price: parsed.price,
            change: parsed.change ?? 0,
            changePct: parsed.changePct ?? 0,
          });
        });
      } catch (err) {
        logger.warn({ err }, 'Watchlist snapshot Redis read failed');
      }
    }

    const missingTokens = instrumentTokens.filter(t => !priceMap.has(t));
    if (missingTokens.length > 0) {
      try {
        const { UpstoxService } = (await import('@/services/market/feeds/upstox-feed.service')) as { UpstoxService: any };
        const instrumentKeyMap = new Map<string, string>();
        for (const token of missingTokens) {
          const candidates = quoteKeyCandidatesByToken.get(token) ?? [toInstrumentKey(token)];
          for (const candidate of candidates) {
            if (candidate) instrumentKeyMap.set(candidate, token);
          }
        }

        const upstoxKeys = Array.from(
          new Set(
            missingTokens
              .map((token) => toInstrumentKey(token))
              .filter(Boolean)
          )
        );
        if (upstoxKeys.length > 0) {
          const details = await Promise.race([
            UpstoxService.getSystemQuoteDetails(upstoxKeys),
            new Promise<Record<string, never>>((resolve) =>
              setTimeout(() => resolve({}), 1500)
            ),
          ]);
          for (const [rawKey, detailRaw] of Object.entries(details)) {
            const detail = detailRaw as { lastPrice: number; closePrice: number | null };
            const normalizedKey = toInstrumentKey(rawKey);
            const originalToken = instrumentKeyMap.get(normalizedKey);
            if (!originalToken) continue;

            const price = Number(detail.lastPrice);
            if (!Number.isFinite(price) || price <= 0) continue;

            const close = Number(detail.closePrice) || price;
            const change = price - close;
            const changePct = close > 0 ? (change / close) * 100 : 0;
            priceMap.set(originalToken, { price, change, changePct });
          }
        }
      } catch (err) {
        logger.warn({ err }, 'Watchlist snapshot Upstox fallback failed');
      }
    }

    const data = rows.map(row => {
      const normalizedToken = toInstrumentKey(row.instrumentToken);
      const prices =
        priceMap.get(row.instrumentToken) ??
        priceMap.get(normalizedToken);

      return {
        symbol: row.tradingsymbol,
        name: row.name,
        instrumentToken: row.instrumentToken,
        ...(prices
          ? {
              price: prices.price,
              change: prices.change,
              changePercent: prices.changePct,
            }
          : {}),
        lotSize: row.lotSize ?? 1,
        exchange: row.exchange ?? 'NSE',
        segment: row.segment ?? 'NSE_EQ',
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error({ err: error }, 'GET watchlist snapshot failed');
    return NextResponse.json({ error: 'Failed to fetch watchlist' }, { status: 500 });
  }
}
