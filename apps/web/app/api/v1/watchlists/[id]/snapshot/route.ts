import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { instruments, watchlistItems, watchlists } from '@paper-market/core/db';
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

    const rows = await db
      .select({
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

    // Fetch prices from Upstox in one batch call
    const priceMap = new Map<string, { price: number; change: number; changePct: number }>();

    try {
      const { UpstoxService } = await import('@/services/market/feeds/upstox-feed.service') as { UpstoxService: any };

      const upstoxKeys = Array.from(
        new Set(rows.map(r => toInstrumentKey(r.instrumentToken)).filter(Boolean))
      );

      if (upstoxKeys.length > 0) {
        const details = await Promise.race([
          UpstoxService.getSystemQuoteDetails(upstoxKeys),
          new Promise<Record<string, never>>((resolve) =>
            setTimeout(() => resolve({}), 2000)
          ),
        ]);

        // Build a lookup map: normalized key -> original token
        const keyToToken = new Map<string, string>();
        for (const row of rows) {
          const key = toInstrumentKey(row.instrumentToken);
          if (key) keyToToken.set(key, row.instrumentToken);
        }

        for (const [rawKey, detailRaw] of Object.entries(details)) {
          const detail = detailRaw as { lastPrice: number; closePrice: number | null };
          const normalizedKey = toInstrumentKey(rawKey);
          const originalToken = keyToToken.get(normalizedKey);
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
      logger.warn({ err }, 'Watchlist snapshot price fetch failed');
    }

    const data = rows.map(row => {
      const prices = priceMap.get(row.instrumentToken);
      return {
        symbol: row.tradingsymbol,
        name: row.name,
        instrumentToken: row.instrumentToken,
        ...(prices ? {
          price: prices.price,
          change: prices.change,
          changePercent: prices.changePct,
        } : {}),
        lotSize: row.lotSize ?? 1,
        exchange: row.exchange ?? 'NSE',
        segment: row.segment ?? 'NSE_EQ',
      };
    });

    return NextResponse.json(
      { success: true, data },
      { headers: { 'Cache-Control': 'private, max-age=10' } }
    );
  } catch (error) {
    logger.error({ err: error }, 'GET watchlist snapshot failed');
    return NextResponse.json({ error: 'Failed to fetch watchlist' }, { status: 500 });
  }
}
