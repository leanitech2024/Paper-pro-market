// ═══════════════════════════════════════════════════════════
// 🎯 NORMALIZED TICK: Broker-agnostic tick format
// ═══════════════════════════════════════════════════════════
declare global {
    var __TPS: number | undefined;
    var __TPS_INTERVAL: NodeJS.Timeout | undefined;
    var __tickBus: TickBus | undefined;
    var __MEMORY_INTERVAL: NodeJS.Timeout | undefined;
}

import type { NormalizedTick } from "@paper-market/core";
import { isValidTick } from "@paper-market/core";
import { logger } from "@/lib/logger";
import { systemMetricsService } from "@/services/metrics/system-metrics.service";

const MAX_TICK_LISTENERS = 50;

// ═══════════════════════════════════════════════════════════
// 🚌 TICK BUS: Event-driven tick distribution
// ═══════════════════════════════════════════════════════════
/**
 * TickBus is the central event hub for market data distribution.
 *
 * Architecture:
 * ```
 * WebSocket → Adapter → TickBus.emit('tick')
 *                          ↓
 *                          ├─→ MTMEngine
 *                          ├─→ FillEngine
 *                          └─→ LiquidationEngine
 * ```
 *
 * Why: Decouples tick sources from consumers, enabling modular growth.
 *
 * 🔄 UPDATE: Replaced EventEmitter with micro-event bus for fault isolation.
 * If one listener fails, others continue unaffected.
 */
class TickBus {
    private listeners = new Set<(tick: NormalizedTick) => void>();
    private tickCount = 0;
    private symbolCounts = new Map<string, number>();
    private symbolLastSeen = new Map<string, number>();
    private symbolCleanupInterval: NodeJS.Timeout | null = null;
    private readonly SYMBOL_COUNT_RETENTION_MS = 60 * 60 * 1000;
    private readonly SYMBOL_CLEANUP_INTERVAL_MS = 10 * 60 * 1000;

    constructor() {
        this.startSymbolCleanupLoop();
        this.startDebugMonitors();
    }

    /**
     * Subscribe to tick events
     */
    on(event: 'tick', handler: (tick: NormalizedTick) => void): void {
        this.listeners.add(handler);
        if (this.listeners.size > MAX_TICK_LISTENERS) {
            logger.warn(
                { activeListeners: this.listeners.size, limit: MAX_TICK_LISTENERS },
                "TickBus listener count exceeded safe limit"
            );
        }
    }

    /**
     * Unsubscribe from tick events
     */
    off(event: 'tick', handler: (tick: NormalizedTick) => void): void {
        this.listeners.delete(handler);
    }

    // 🔥 BACKPRESSURE: Keep only latest tick per symbol
    private latestTicks = new Map<string, NormalizedTick>();
    private processing = false;

    // 🔥 CRITICAL FIX: Runtime-agnostic defer (Node.js or Browser)
    private defer = typeof setImmediate !== 'undefined'
        ? setImmediate
        : (fn: () => void) => setTimeout(fn, 0);

    emitTick(tick: NormalizedTick): void {
        this.tickCount++;

        if (process.env.DEBUG_MARKET === 'true') {
            const tps = globalThis.__TPS ?? 0;
            globalThis.__TPS = tps + 1;
        }

        // Track per-symbol counts
        const identityKey = tick.instrumentKey || tick.symbol || "__unknown__";
        // Validate tick before processing (drops bad ticks)
        const prevPriceObj = this.latestTicks.get(identityKey);
        const prevPrice = prevPriceObj ? prevPriceObj.price : undefined;
        if (!isValidTick(tick, prevPrice)) {
            // Drop malformed tick
            return;
        }

        const nowMs = Date.now();
        const count = this.symbolCounts.get(identityKey) ?? 0;
        this.symbolCounts.set(identityKey, count + 1);
        this.symbolLastSeen.set(identityKey, nowMs);

        // 🔥 BACKPRESSURE: Keep only latest tick per symbol
        this.latestTicks.set(identityKey, tick);

        if (this.processing) return;
        this.processing = true;

        this.defer(() => {
            const ticks = Array.from(this.latestTicks.values());
            this.latestTicks.clear();

            for (const t of ticks) {
                for (const handler of this.listeners) {
                    try {
                        handler(t);
                    } catch (error) {
                        // L-3 FIX: Use structured logger, not console.error.
                        logger.error({ err: error }, "TickBus listener error");
                    }
                }
            }

            this.processing = false;
        });
    }

    /**
     * Get statistics
     */
    getStats() {
        this.cleanupStaleSymbolCounts(Date.now());
        return {
            totalTicks: this.tickCount,
            symbolCounts: Object.fromEntries(this.symbolCounts),
            activeListeners: this.listeners.size,
        };
    }

    /**
     * Get listener count for a specific event (EventEmitter API compat)
     */
    listenerCount(event: string): number {
        if (event === 'tick') return this.listeners.size;
        return 0;
    }

    /**
     * Reset statistics
     */
    resetStats(): void {
        this.tickCount = 0;
        this.symbolCounts.clear();
        this.symbolLastSeen.clear();
    }

    /**
     * Clear all debug intervals. Call during test teardown or hot-reload.
     */
    clearDebugMonitors(): void {
        if (globalThis.__TPS_INTERVAL) {
            clearInterval(globalThis.__TPS_INTERVAL);
            globalThis.__TPS_INTERVAL = undefined;
        }
        if (globalThis.__MEMORY_INTERVAL) {
            clearInterval(globalThis.__MEMORY_INTERVAL);
            globalThis.__MEMORY_INTERVAL = undefined;
        }
        globalThis.__TPS = undefined;
    }

    private startDebugMonitors(): void {
        if (process.env.DEBUG_MARKET !== 'true') return;
        if (typeof process === 'undefined' || !process.memoryUsage) return;

        // L-3 FIX: Guard both intervals so they are created at most once, and
        // expose clearDebugMonitors() for cleanup during hot-reload / test teardown.
        // The old code created new intervals on every module evaluate.
        if (!globalThis.__TPS_INTERVAL) {
            globalThis.__TPS = 0;
            globalThis.__TPS_INTERVAL = setInterval(() => {
                const tps = (globalThis.__TPS ?? 0) / 5;
                logger.info({ tps: Number(tps.toFixed(1)) }, "TickBus ticks/sec");
                globalThis.__TPS = 0;
            }, 5000);
        }

        if (!globalThis.__MEMORY_INTERVAL) {
            globalThis.__MEMORY_INTERVAL = setInterval(() => {
                const m = process.memoryUsage();
                logger.info({ heapMb: Number((m.heapUsed / 1024 / 1024).toFixed(1)) }, "TickBus heap");
            }, 15000);
        }
    }

    private startSymbolCleanupLoop(): void {
        if (this.symbolCleanupInterval) return;
        this.symbolCleanupInterval = setInterval(() => {
            this.cleanupStaleSymbolCounts(Date.now());
        }, this.SYMBOL_CLEANUP_INTERVAL_MS);
    }

    private cleanupStaleSymbolCounts(nowMs: number): void {
        for (const [symbol, lastSeenMs] of this.symbolLastSeen.entries()) {
            if (nowMs - lastSeenMs <= this.SYMBOL_COUNT_RETENTION_MS) continue;
            this.symbolLastSeen.delete(symbol);
            this.symbolCounts.delete(symbol);
        }
    }
}

// ═══════════════════════════════════════════════════════════
// 🛠️ EXPORT SINGLETON INSTANCE (Global-Safe)
// ═══════════════════════════════════════════════════════════
const globalForTickBus = globalThis as unknown as { __tickBus: TickBus };

export const tickBus = globalForTickBus.__tickBus || new TickBus();
globalForTickBus.__tickBus = tickBus;
