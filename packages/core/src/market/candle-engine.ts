import { NormalizedTick, RealtimeCandle as Candle, CandleUpdate } from './market-data.types.js';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';

// ═══════════════════════════════════════════════════════════
// 📊 CANDLE CONTEXT: Per-symbol+interval state isolation
// ═══════════════════════════════════════════════════════════
interface CandleContext {
    currentCandle: Candle | null;
    lastBucket: number;      // Last time bucket processed
    interval: number;        // Interval in seconds (60, 300, 900, etc.)
    instrumentKey: string;
    symbol?: string;
}

// ═══════════════════════════════════════════════════════════
// 🏭 CANDLE ENGINE: Professional tick aggregation
// ═══════════════════════════════════════════════════════════
/**
 * CandleEngine converts ticks into candles with stateless per-symbol contexts.
 * 
 * Key Features:
 * - Stateless per-symbol+interval contexts (prevents corruption on timeframe switch)
 * - Timestamp normalization (milliseconds → seconds)
 * - Gap-aware candle detection (handles market breaks)
 * - Bucket alignment (candles start at interval boundaries)
 * 
 * Architecture:
 * ```
 * TickBus → CandleEngine.processTick() → { type, candle }
 *                                          ↓
 *                                    WebSocket Broadcast
 * ```
 */
export class CandleEngine extends EventEmitter {
    private contexts = new Map<string, CandleContext>();

    /**
     * Reset candle context for a symbol (used when switching timeframes)
     */
    reset(instrumentKey: string, interval?: number) {
        if (interval) {
            const key = `${instrumentKey}:${interval}`;
            this.contexts.delete(key);
            if (process.env.DEBUG_MARKET === 'true') logger.debug({ key }, "Reset candle context");
        } else {
            // Reset all intervals for this symbol
            let count = 0;
            for (const key of this.contexts.keys()) {
                if (key.startsWith(`${instrumentKey}:`)) {
                    this.contexts.delete(key);
                    count++;
                }
            }
            if (process.env.DEBUG_MARKET === 'true') logger.debug({ count, instrumentKey }, "Reset multiple candle contexts");
        }
    }

    /**
     * Process a tick and return candle update instruction
     */
    processTick(tick: NormalizedTick, interval: number = 60): CandleUpdate | null {
        // ═══════════════════════════════════════════════════════════
        // 🛠️ CONTEXT ISOLATION: Per-symbol+interval
        // ═══════════════════════════════════════════════════════════
        const identityKey = tick.instrumentKey || tick.symbol || '';
        if (!identityKey) return null;
        const displaySymbol = tick.symbol || identityKey;
        const key = `${identityKey}:${interval}`;
        let ctx = this.contexts.get(key);

        // ═══════════════════════════════════════════════════════════
        // 🛠️ GUARD: Stale Tick Detection
        // ═══════════════════════════════════════════════════════════
        // Prevent processing ticks older than current candle start
        if (ctx?.currentCandle) {
             const candleStartTime = ctx.currentCandle.time;
             
             if (tick.timestamp < candleStartTime) {
                 if (process.env.DEBUG_MARKET === 'true') {
                     logger.warn({ displaySymbol, tickTimestamp: tick.timestamp, candleStartTime }, "Stale tick ignored");
                 }
                 return null;
             }
        }

        if (!ctx) {
            ctx = {
                currentCandle: null,
                lastBucket: 0,
                interval,
                instrumentKey: identityKey,
                symbol: tick.symbol
            };
            this.contexts.set(key, ctx);
        }

        // ═══════════════════════════════════════════════════════════
        // 🛠️ TIMESTAMP NORMALIZATION: Ensure seconds
        // ═══════════════════════════════════════════════════════════
        let tickTimeSeconds = tick.timestamp;
        if (tickTimeSeconds > 1e12) {
            tickTimeSeconds = Math.floor(tickTimeSeconds / 1000);
        }

        // ═══════════════════════════════════════════════════════════
        // 🛠️ BUCKET ALIGNMENT: Align to interval boundary
        // ═══════════════════════════════════════════════════════════
        const tickBucket = Math.floor(tickTimeSeconds / interval);
        const alignedTime = tickBucket * interval;

        // ═══════════════════════════════════════════════════════════
        // 🛠️ GAP-AWARE DETECTION: Handle market breaks
        // ═══════════════════════════════════════════════════════════
        const MAX_GAP = interval * 5; // 5 candles
        let isNewCandle = false;

        if (!ctx.currentCandle) {
            // First candle for this context
            isNewCandle = true;
        } else if (tickBucket > ctx.lastBucket) {
            // Check if gap is too large (market was closed)
            const timeDiff = tickTimeSeconds - (ctx.lastBucket * interval);
            if (timeDiff >= MAX_GAP) {
                if (process.env.DEBUG_MARKET === 'true') logger.warn({ displaySymbol, timeDiff }, "Large gap detected");
            }
            isNewCandle = true;
        }

        if (isNewCandle) {
            // ═══════════════════════════════════════════════════════════
            // 🆕 NEW CANDLE
            // ═══════════════════════════════════════════════════════════
            const newCandle: Candle = {
                time: alignedTime,
                open: tick.price,
                high: tick.price,
                low: tick.price,
                close: tick.price
            };

            ctx.currentCandle = newCandle;
            ctx.lastBucket = tickBucket;

            // Sample logging (10% of new candles)
            if (process.env.DEBUG_MARKET === 'true' && Math.random() < 0.1) {
                logger.debug({ displaySymbol, time: new Date(alignedTime * 1000).toISOString() }, "NEW Candle");
            }

            const result: CandleUpdate = {
                type: 'new',
                candle: newCandle,
                instrumentKey: identityKey,
                symbol: tick.symbol,
                interval
            };

            // Emit event for subscribers
            this.emit('candle', result);

            return result;
        } else {
            // ═══════════════════════════════════════════════════════════
            // 🔄 UPDATE EXISTING CANDLE
            // ═══════════════════════════════════════════════════════════
            const updated: Candle = {
                ...ctx.currentCandle!,
                close: tick.price,
                high: Math.max(ctx.currentCandle!.high, tick.price),
                low: Math.min(ctx.currentCandle!.low, tick.price)
            };

            ctx.currentCandle = updated;

            // Sample logging (1% of updates to avoid spam)
            if (process.env.DEBUG_MARKET === 'true' && Math.random() < 0.01) {
                logger.debug({ displaySymbol, o: updated.open, h: updated.high, l: updated.low, c: updated.close }, "Candle update");
            }

            const result: CandleUpdate = {
                type: 'update',
                candle: updated,
                instrumentKey: identityKey,
                symbol: tick.symbol,
                interval
            };

            // Emit event for subscribers
            this.emit('candle', result);

            return result;
        }
    }

    /**
     * Get current candle for a symbol+interval
     */
    getCurrentCandle(instrumentKey: string, interval: number = 60): Candle | null {
        const key = `${instrumentKey}:${interval}`;
        const ctx = this.contexts.get(key);
        return ctx?.currentCandle || null;
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            activeContexts: this.contexts.size,
            contexts: Array.from(this.contexts.keys())
        };
    }
}

// ═══════════════════════════════════════════════════════════
// 🛠️ EXPORT SINGLETON INSTANCE (Global-Safe)
// ═══════════════════════════════════════════════════════════
const globalForCandleEngine = globalThis as unknown as { __candleEngine: CandleEngine };

export const candleEngine = globalForCandleEngine.__candleEngine || new CandleEngine();

if (process.env.NODE_ENV !== 'production') {
    globalForCandleEngine.__candleEngine = candleEngine;
}
