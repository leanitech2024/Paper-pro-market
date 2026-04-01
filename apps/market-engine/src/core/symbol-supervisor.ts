// UpstoxWebSocket will be imported from the upstox directory
import type { UpstoxWebSocket } from '../upstox/websocket.js';

// ═══════════════════════════════════════════════════════════
// 📊 SYMBOL SUPERVISOR: Reference-counted subscription manager
// ═══════════════════════════════════════════════════════════

export class SymbolSupervisor {
    private active = new Map<string, number>(); // symbol → ref count
    private unsubTimer = new Map<string, NodeJS.Timeout>(); // kept for cancel-on-resubscribe
    
    // 🔥 CRITICAL FIX #2: Micro-batching to prevent burst throttling
    private pending = new Set<string>();
    private flushTimer: NodeJS.Timeout | null = null;

    // 🔥 FIX: Batched unsubscribes — shared pending set instead of per-symbol timer
    private unsubPending = new Set<string>();
    private unsubFlushTimer: NodeJS.Timeout | null = null;

    private ws: UpstoxWebSocket;
    
    constructor(ws: UpstoxWebSocket) {
        this.ws = ws;
    }
    
    /**
     * Add a reference to a symbol
     * First reference → batched upstream subscription
     */
    add(symbol: string) {
        const count = this.active.get(symbol) ?? 0;
        this.active.set(symbol, count + 1);
        
        // Clear pending unsubscribe
        const timer = this.unsubTimer.get(symbol);
        if (timer) {
            clearTimeout(timer);
            this.unsubTimer.delete(symbol);
        }
        
        // First subscriber → batch subscribe
        if (count === 0) {
            this.pending.add(symbol);
            
            // 🔥 Batch subscriptions within 50ms window
            // This prevents broker throttling during subscription storms
            if (!this.flushTimer) {
                this.flushTimer = setTimeout(() => {
                    const batch = Array.from(this.pending);
                    
                    if (batch.length > 0) {
                        this.ws.subscribe(batch); // Batch call!
                        console.log(`🔔 Subscribed (batch ${batch.length}): ${batch.join(', ')}`);
                    }
                    
                    this.pending.clear();
                    this.flushTimer = null;
                }, 50); // 50ms batching window
            }
        } else {
            console.log(`🔔 Ref++ ${symbol} (count: ${count + 1})`);
        }
    }
    
    /**
     * Remove a reference to a symbol
     * Last reference → delayed upstream unsubscribe
     */
    remove(symbol: string) {
        const count = this.active.get(symbol) ?? 0;
        
        if (count <= 1) {
            // Cancel any existing per-symbol timer (legacy safety)
            const existing = this.unsubTimer.get(symbol);
            if (existing) {
                clearTimeout(existing);
                this.unsubTimer.delete(symbol);
            }

            // Stage for batched unsubscribe
            this.unsubPending.add(symbol);

            // Single shared timer — all symbols queued within 5s are sent together
            if (!this.unsubFlushTimer) {
                this.unsubFlushTimer = setTimeout(() => {
                    this.unsubFlushTimer = null;
                    const batch = Array.from(this.unsubPending);
                    this.unsubPending.clear();

                    for (const s of batch) {
                        this.active.delete(s);
                    }

                    if (batch.length > 0) {
                        this.ws.unsubscribe(batch);
                        console.log(`🔕 Unsubscribed (batch ${batch.length}): ${batch.join(', ')}`);
                    }
                }, 5000);
            }
        } else {
            this.active.set(symbol, count - 1);
            console.log(`🔕 Ref-- ${symbol} (count: ${count - 1})`);
        }
    }
    
    /**
     * Get all actively subscribed symbols
     */
    getActiveSymbols(): string[] {
        return Array.from(this.active.keys());
    }
    
    /**
     * Get ref count for a symbol
     */
    getRefCount(symbol: string): number {
        return this.active.get(symbol) ?? 0;
    }
    
    /**
     * Flush pending subscriptions immediately (for shutdown)
     */
    flushPending() {
        if (this.flushTimer) {
            clearTimeout(this.flushTimer);
            this.flushTimer = null;
        }
        
        if (this.pending.size > 0) {
            const batch = Array.from(this.pending);
            this.ws.subscribe(batch);
            console.log(`🔔 Flushed pending (${batch.length}): ${batch.join(', ')}`);
            this.pending.clear();
        }
    }

    /**
     * Flush pending unsubscribes immediately (e.g. on reconnect cleanup)
     */
    flushPendingUnsubs() {
        if (this.unsubFlushTimer) {
            clearTimeout(this.unsubFlushTimer);
            this.unsubFlushTimer = null;
        }

        const batch = Array.from(this.unsubPending);
        this.unsubPending.clear();

        for (const s of batch) {
            this.active.delete(s);
        }

        if (batch.length > 0) {
            this.ws.unsubscribe(batch);
            console.log(`🔕 Flushed unsub pending (${batch.length}): ${batch.join(', ')}`);
        }
    }
}
