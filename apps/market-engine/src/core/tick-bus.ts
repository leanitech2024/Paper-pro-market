import { NormalizedTick } from './types.js';
import { isValidTick } from '@paper-market/core';

const MAX_TICK_LISTENERS = 50;

interface TickBusGlobal {
    __TPS?: number;
    __TPS_INTERVAL?: NodeJS.Timeout;
    __MEMORY_INTERVAL?: NodeJS.Timeout;
}
const globalState = globalThis as unknown as TickBusGlobal;

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
 *                          ├─→ WebSocket Broadcast
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

    /**
     * Subscribe to tick events
     */
    on(_event: 'tick', handler: (tick: NormalizedTick) => void): void {
        this.listeners.add(handler);
        if (this.listeners.size > MAX_TICK_LISTENERS) {
            console.warn(`⚠️ TickBus listener count exceeded safe limit (${this.listeners.size} > ${MAX_TICK_LISTENERS})`);
        }
    }

    /**
     * Unsubscribe from tick events
     */
    off(_event: 'tick', handler: (tick: NormalizedTick) => void): void {
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
            if (!globalState.__TPS) {
                globalState.__TPS = 0;
            }
            if (!globalState.__TPS_INTERVAL) {
                globalState.__TPS_INTERVAL = setInterval(() => {
                    const tps = (globalState.__TPS || 0) / 5;
                    console.log("TICKS/SEC:", tps.toFixed(1));
                    globalState.__TPS = 0;
                }, 5000);
            }
            globalState.__TPS = (globalState.__TPS || 0) + 1;
        }
        
        this.tickCount++;
        
        
        // Track per-symbol counts
        const identityKey = tick.instrumentKey || tick.symbol || "__unknown__";
        // 🔥 VALIDATE TICK (drop malformed before backpressure queue)
        const prevObj = this.latestTicks.get(identityKey);
        if (!isValidTick(tick, prevObj ? prevObj.price : undefined)) {
            return;
        }

        const count = this.symbolCounts.get(identityKey) || 0;
        this.symbolCounts.set(identityKey, count + 1);

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
    }
}

// ═══════════════════════════════════════════════════════════
// 🛠️ EXPORT SINGLETON INSTANCE (Global-Safe)
// ═══════════════════════════════════════════════════════════
const globalForTickBus = globalThis as unknown as { __tickBus: TickBus };

export const tickBus = globalForTickBus.__tickBus || new TickBus();

if (process.env.NODE_ENV !== 'production') {
    globalForTickBus.__tickBus = tickBus;
}

// ═══════════════════════════════════════════════════════════
// 🚨 PHASE 0: Memory Logging (Baseline Visibility)
// ═══════════════════════════════════════════════════════════
// Initialize memory monitoring on module load (runs once per Node process)
if (process.env.DEBUG_MARKET === 'true' && typeof process !== 'undefined' && process.memoryUsage && !globalState.__MEMORY_INTERVAL) {
    globalState.__MEMORY_INTERVAL = setInterval(() => {
        const m = process.memoryUsage();
        console.log("HEAP MB:", (m.heapUsed / 1024 / 1024).toFixed(1));
    }, 15000);
}
