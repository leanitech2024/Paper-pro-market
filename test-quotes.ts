import { db } from './apps/web/lib/db';
import { instruments } from './packages/core/src/db/schema';
import { inArray } from 'drizzle-orm';

async function run() {
    console.log('Testing Upstox quotes...');
    const keys = ['NSE_EQ|INE002A01018', 'NSE_INDEX|Nifty 50', 'NSE_INDEX|Nifty Bank'];
    const rows = await db.select({
        instrumentToken: instruments.instrumentToken,
        tradingsymbol: instruments.tradingsymbol,
        segment: instruments.segment,
    }).from(instruments).where(inArray(instruments.instrumentToken, keys));
    console.log('Rows:', rows);
    process.exit(0);
}
run().catch(console.error);
