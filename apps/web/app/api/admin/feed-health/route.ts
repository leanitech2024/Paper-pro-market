import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { tickBus } from '@/lib/trading/tick-bus';
import { realTimeMarketService } from '@/services/realtime-market.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * 📊 FEED HEALTH OBSERVABILITY DASHBOARD
 *
 * Returns real-time feed health metrics for monitoring.
 * Active symbols and ref-counts are now tracked by realTimeMarketService
 * via its subscribers Map (formerly in market-feed-supervisor).
 */
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get tick stats from TickBus
    const tickStats = tickBus.getStats();

    // Event loop lag measurement
    const start = Date.now();
    await new Promise(resolve => setImmediate(resolve));
    const eventLoopLag = Date.now() - start;

    // Memory usage
    const memUsage = process.memoryUsage();

    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),

        feed: {
            totalTicks: tickStats.totalTicks,
            symbolCounts: tickStats.symbolCounts,
            activeListeners: tickStats.activeListeners,
        },

        performance: {
            eventLoopLagMs: eventLoopLag,
            memoryMB: {
                rss: Math.round(memUsage.rss / 1024 / 1024),
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
            },
        },

        uptime: {
            processUptimeSeconds: Math.floor(process.uptime()),
        },
    };

    return NextResponse.json(health);
}
