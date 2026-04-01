import { db } from './apps/web/lib/db';
import { instruments } from '@paper-market/core/db';
import { inArray } from 'drizzle-orm';

async function run() {
    try {
        const symbols = ['RELIANCE', 'HDFCBANK', 'ICICIBANK', 'INFY', 'TCS', 'BHARTIARTL', 'ITC', 'LT', 'SBIN', 'KOTAKBANK', 'BAJFINANCE', 'AXISBANK', 'WIPRO', 'HCLTECH', 'ADANIENT', 'MARUTI', 'TATAMOTORS', 'SUNPHARMA', 'ONGC'];
        const rows = await db.select({
            s: instruments.tradingsymbol,
            k: instruments.instrumentToken,
            t: instruments.instrumentType
        }).from(instruments).where(inArray(instruments.tradingsymbol, symbols));
        
        console.log("=== DB DUMP ===");
        console.log(JSON.stringify(rows.filter(r => r.t === 'EQ'), null, 2));
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

run();
