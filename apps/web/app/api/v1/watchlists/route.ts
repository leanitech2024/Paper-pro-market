/**
 * GET /api/v1/watchlists
 * Get all watchlists for the authenticated user
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { WatchlistService } from '@/domains/market/server/catalog/watchlist.service';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const watchlists = await WatchlistService.getUserWatchlists(session.user.id);

    return NextResponse.json(
      { success: true, data: watchlists },
      { headers: { 'Cache-Control': 'private, max-age=30' } }
    );
  } catch (err) {
    logger.error({ err: err }, 'GET /api/v1/watchlists failed');
    return NextResponse.json({ error: 'Failed to fetch watchlists' }, { status: 500 });
  }
}

/**
 * POST /api/v1/watchlists
 * Create a new watchlist
 */
export async function POST(_req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await _req.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Watchlist name is required' },
        { status: 400 }
      );
    }

    const watchlist = await WatchlistService.createWatchlist(
      session.user.id,
      name.trim()
    );

    return NextResponse.json({
      success: true,
      data: watchlist,
    });
  } catch (err) {
    logger.error({ err: err }, 'POST /api/v1/watchlists failed');
    return NextResponse.json(
      { error: 'Failed to create watchlist' },
      { status: 500 }
    );
  }
}

