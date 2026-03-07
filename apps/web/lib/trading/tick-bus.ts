import { EventEmitter } from 'events';

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
 *                          ├─→ CandleEngine
 *                          ├─→ Watchlist
 *                          ├─→ IndicatorEngine
 *                          └─→ Recorder
 * ```
 * 
 * Why: Decouples tick sources from consumers, enabling modular growth.
 */
/**
 * TickBus is the central event hub for market data distribution.
 * 
 * Architecture:
 * ```
 * WebSocket → Adapter → TickBus.emit('tick')
 *                          ↓
 *                          ├─→ CandleEngine
 *                          ├─→ Watchlist
 *                          ├─→ IndicatorEngine
 *                          └─→ Recorder
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
    }

    /**
     * Subscribe to tick events
     */
    on(event: 'tick', handler: (tick: NormalizedTick) => void): void {
        this.listeners.add(handler);
    }

    /**
     * Unsubscribe from tick events
     */
    off(event: 'tick', handler: (tick: NormalizedTick) => void): void {
        this.listeners.delete(handler);
    }

    /**
     * Emit a normalized tick to all subscribers
     * 🔥 CRITICAL: Batched dispatch with backpressure
     * Keeps only latest tick per symbol to prevent memory spikes
     */
    private latestTicks = new Map<string, NormalizedTick>();
    private processing = false;
    
    // 🔥 CRITICAL: Cross-runtime defer (works in both Node.js AND browser)
    private defer = typeof setImmediate !== 'undefined'
        ? setImmediate
        : (fn: () => void) => setTimeout(fn, 0);
    
    emitTick(tick: NormalizedTick) {
        // ═══════════════════════════════════════════════════════════
        // 🚨 PHASE 0: Tick Throughput Logging (Baseline Visibility)
        // ═══════════════════════════════════════════════════════════
        if (process.env.DEBUG_MARKET === 'true') {
            if (!globalThis.__TPS) {
                globalThis.__TPS = 0;
            }
            if (!globalThis.__TPS_INTERVAL) {
                globalThis.__TPS_INTERVAL = setInterval(() => {
                    const tps = (globalThis.__TPS || 0) / 5;
                    console.log("TICKS/SEC:", tps.toFixed(1));
                    globalThis.__TPS = 0;
                }, 5000);
            }
            globalThis.__TPS = (globalThis.__TPS || 0) + 1;
        }
        
        this.tickCount++;
        
        // Track per-symbol counts
        const identityKey = tick.instrumentKey || tick.symbol || "__unknown__";
        const nowMs = Date.now();
        const count = this.symbolCounts.get(identityKey) || 0;
        this.symbolCounts.set(identityKey, count + 1);
        this.symbolLastSeen.set(identityKey, nowMs);

        // 🔥 BACKPRESSURE: Keep only latest tick per symbol
        // During volatility spikes (20x tick rate), this prevents memory explosion
        this.latestTicks.set(identityKey, tick);

        if (this.processing) return; // Drop old ticks, only emit latest

        this.processing = true;

        // 🔥 CRITICAL FIX: Runtime-agnostic defer (Node.js or Browser)
        // setImmediate is NOT available in browsers!
        this.defer(() => {
            const ticks = Array.from(this.latestTicks.values());
            this.latestTicks.clear();

            // Emit batched ticks synchronously
            ticks.forEach(t => {
                this.listeners.forEach(handler => {
                    try {
                        handler(t);
                    } catch (error) {
                        console.error('❌ TickBus listener error:', error);
                    }
                });
            });

            this.processing = false;
        });

        // Sample logging (1% of ticks to avoid spam)
        if (process.env.DEBUG_MARKET === 'true' && this.tickCount % 100 === 0) {
            console.log(`📊 TickBus: ${this.tickCount} total ticks processed`);
        }
    }

    /**
     * Get statistics
     */
    getStats() {
        this.cleanupStaleSymbolCounts(Date.now());
        return {
            totalTicks: this.tickCount,
            symbolCounts: Object.fromEntries(this.symbolCounts),
            activeListeners: this.listeners.size
        };
    }

    /**
     * Get listener count for a specific event (Mocking EventEmitter API)
     */
    listenerCount(event: string): number {
        // We only support 'tick' event for now
        if (event === 'tick') return this.listeners.size;
        return 0;
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.tickCount = 0;
        this.symbolCounts.clear();
        this.symbolLastSeen.clear();
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
// 🛠️ EXPORT SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
// 🛠️ EXPORT SINGLETON INSTANCE (Global-Safe)
// ═══════════════════════════════════════════════════════════
const globalForTickBus = globalThis as unknown as { __tickBus: TickBus };

export const tickBus = globalForTickBus.__tickBus || new TickBus();

// Always cache globally to prevent duplicate instances in production
globalForTickBus.__tickBus = tickBus;

// ═══════════════════════════════════════════════════════════
// 🚨 PHASE 0: Memory Logging (Baseline Visibility)
// ═══════════════════════════════════════════════════════════
// Initialize memory monitoring on module load (runs once per Node process)
if (process.env.DEBUG_MARKET === 'true' && typeof process !== 'undefined' && process.memoryUsage && !globalThis.__MEMORY_INTERVAL) {
    globalThis.__MEMORY_INTERVAL = setInterval(() => {
        const m = process.memoryUsage();
        console.log("HEAP MB:", (m.heapUsed / 1024 / 1024).toFixed(1));
    }, 15000);
}
