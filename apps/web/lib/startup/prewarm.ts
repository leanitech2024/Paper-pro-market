/**
 * lib/startup/prewarm.ts — Core service initialization sequence
 *
 * NOT called directly by Next.js. Invoked exclusively by `preload.ts`
 * after environment guards have passed.
 *
 * Initialization order:
 *  1. instrumentStore — hydrates in-memory instrument catalog from DB
 *  2. realTimeMarketService — opens WebSocket connection to market engine
 *  3. mtmEngineService — starts mark-to-market evaluation loop
 *  4. Subscribes + warms snapshot for configured prewarm symbols
 *
 * @see preload.ts for the guard logic that decides whether to run this.
 */
import { logger } from "@/lib/logger";
import { instrumentStore } from "@/stores/instrument.store";
import { realTimeMarketService } from "@/services/market/feeds/realtime-market.service";
import { mtmEngineService } from "@/services/trading/valuation/mtm-engine.service";

const DEFAULT_PREWARM_INSTRUMENT_KEYS = [
    "NSE_INDEX|Nifty 50",
    "NSE_INDEX|Nifty Bank",
    "NSE_INDEX|Nifty Fin Service",
];

function resolvePrewarmSymbols(): string[] {
    const raw = String(process.env.PREWARM_INSTRUMENT_KEYS ?? "").trim();
    if (!raw) return DEFAULT_PREWARM_INSTRUMENT_KEYS;
    return raw
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

export async function prewarmCore(): Promise<void> {
    await instrumentStore.initialize();

    await realTimeMarketService.initialize();
    await mtmEngineService.initialize();

    const symbols = resolvePrewarmSymbols();
    if (symbols.length > 0) {
        await realTimeMarketService.subscribe(symbols);
        await realTimeMarketService.warmSnapshotForSymbols(symbols);
    }

    logger.info({ prewarmedSymbols: symbols.length }, "Core prewarm completed");
}



