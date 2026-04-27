import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { EODPriceUpdateService } from '@/domains/market/server/pricing/eod-price-update.service';

export const dynamic = 'force-dynamic';

function isCronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== 'production';
  }
  const authHeader = req.headers.get('authorization') || '';
  return authHeader === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 });
  }

  try {
    const result = await EODPriceUpdateService.updateAllPrices();
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = typeof (session.user as any)?.role === 'string' ? String((session.user as any).role) : '';
  if (role.toLowerCase() !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const result = await EODPriceUpdateService.updateAllPrices();
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
