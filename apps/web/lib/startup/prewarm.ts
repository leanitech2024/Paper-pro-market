/**
 * lib/startup/prewarm.ts ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Core service initialization sequence
 *
 * NOT called directly by Next.js. Invoked exclusively by `preload.ts`
 * after environment guards have passed.
 *
 * Initialization order:
 *  1. instrumentStore ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â hydrates in-memory instrument catalog from DB
 *  2. realTimeMarketService ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â opens WebSocket connection to market engine
 *  3. mtmEngineService ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â starts mark-to-market evaluation loop
 *  4. Subscribes + warms snapshot for configured prewarm symbols
 *
 * @see preload.ts for the guard logic that decides whether to run this.
 */
import { logger } from "@/lib/logger";
import { instrumentStore } from "@/domains/market/stores/instrument.store";
import { instrumentRepository } from "@/domains/market/server/instruments/repository";
import { realTimeMarketService } from "@/domains/market/server/feeds/realtime-market.service";
import { mtmEngineService } from "@/domains/trading/server/valuation/mtm-engine.service";

const DEFAULT_PREWARM_INSTRUMENT_KEYS = [
    "NSE_INDEX|Nifty 50",
    "NSE_INDEX|Nifty Bank",
    "NSE_INDEX|Nifty Fin Service",
    "NSE_INDEX|Nifty Midcap 100",
    "NSE_INDEX|Nifty Next 50",
    "NSE_INDEX|INDIA VIX",
];

function resolvePrewarmSymbols(): string[] {
    const raw = String(process.env.PREWARM_INSTRUMENT_KEYS ?? "").trim();
    if (!raw) return DEFAULT_PREWARM_INSTRUMENT_KEYS;
    return raw
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

export async function prewarm() {
    try {
        logger.info('Prewarming instrument repository...');
        await instrumentRepository.initialize();
        logger.info('Instrument repository prewarmed successfully');
    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logger.error({ message: errorMsg }, 'Failed to prewarm instrument repository');
        // Don't throw — app should still start even if prewarm fails
    }
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



