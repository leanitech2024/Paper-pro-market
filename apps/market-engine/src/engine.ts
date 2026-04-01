import { db } from './lib/db.js';
import { instruments } from './lib/schema.js';
import { marketFeedSupervisor } from './core/market-feed-supervisor.js';
import { tickBus } from './core/tick-bus.js';
import { candleEngine } from './core/candle-engine.js';
import { UpstoxAdapter } from './upstox/adapter.js';
import { logger } from './lib/logger.js';
import { startLtpCacheWriter } from './lib/ltp-cache-writer.js';
import type { NormalizedTick } from './core/types.js';

// ═══════════════════════════════════════════════════════════
// 🏭 ENGINE ORCHESTRATOR: Initialize all components
// ═══════════════════════════════════════════════════════════

let isinMap: Map<string, string> | null = null;
let adapter: UpstoxAdapter | null = null;

export async function initializeEngine() {
    logger.info('Initializing market engine...');

    // ═══════════════════════════════════════════════════════════
    // 📊 STEP 1: Load instruments from database
    // Only select the two columns needed for the ISIN map — not all 18 fields.
    // ═══════════════════════════════════════════════════════════
    logger.info('Loading instruments from database...');
    const allInstruments = await db
        .select({ instrumentToken: instruments.instrumentToken, tradingsymbol: instruments.tradingsymbol })
        .from(instruments);
    logger.info({ count: allInstruments.length }, 'Instruments loaded');

    // Build ISIN → Trading Symbol map
    isinMap = new Map();
    const reverseIsinMap = new Map<string, string>();

    for (const inst of allInstruments) {
        const parts = inst.instrumentToken.split('|');
        if (parts.length === 2) {
            const isin = parts[1];
            isinMap.set(inst.tradingsymbol, isin);
            reverseIsinMap.set(isin, inst.tradingsymbol);
        }
    }

    logger.info({ count: reverseIsinMap.size }, 'ISIN map built');

    // ═══════════════════════════════════════════════════════════
    // 🔌 STEP 2: Initialize Upstox Adapter
    // ═══════════════════════════════════════════════════════════
    adapter = new UpstoxAdapter(reverseIsinMap);
    logger.info('Upstox adapter initialized');

    // ═══════════════════════════════════════════════════════════
    // 🚌 STEP 3: Wire MarketFeedSupervisor → TickBus
    // ═══════════════════════════════════════════════════════════
    marketFeedSupervisor.on('tick', (data: unknown) => {
        if (!adapter) return;

        const ticks = adapter.normalize(data);
        for (const tick of ticks) {
            tickBus.emitTick(tick);
        }
    });

    logger.info('MarketFeedSupervisor wired to TickBus');

    // ═══════════════════════════════════════════════════════════
    // 📊 STEP 4: Wire TickBus → CandleEngine (1-minute candles)
    // ═══════════════════════════════════════════════════════════
    tickBus.on('tick', (tick: NormalizedTick) => {
        candleEngine.processTick(tick, 60); // 60 seconds = 1 minute
    });

    logger.info('TickBus wired to CandleEngine (1-minute candles)');

    // Non-blocking cache sidecar for snapshot hydration.
    startLtpCacheWriter();

    // ═══════════════════════════════════════════════════════════
    // 🔌 STEP 5: Initialize MarketFeedSupervisor
    // ═══════════════════════════════════════════════════════════
    await marketFeedSupervisor.initialize();
    logger.info('MarketFeedSupervisor initialized');

    // Redis pre-warm is triggered from ws-server.ts on first client subscribe,
    // since no symbols are active here yet at engine startup.
}

export function getEngineStats() {
    return {
        tickBus: tickBus.getStats(),
        candleEngine: candleEngine.getStats(),
        marketFeed: marketFeedSupervisor.getHealthMetrics()
    };
}
