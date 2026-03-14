import type { NormalizedTick } from "@paper-market/core";

/**
 * Validates a tick for correctness and safety.
 * Reject malformed ticks to prevent trading anomalies.
 * 
 * Rules applied:
 * 1. price > 0
 * 2. bid > 0, ask > 0
 * 3. bid <= ask
 * 4. timestamp not too far in the future
 * 5. price change < 30% (if previous price is provided)
 * 
 * @param tick The structured tick
 * @param prevPrice The previous valid price for the instrument
 * @returns true if the tick is valid, false otherwise
 */
export function isValidTick(tick: NormalizedTick, prevPrice?: number): boolean {
    if (!Number.isFinite(tick.price) || tick.price <= 0) return false;
    
    // Bid/Ask basic checks (they are now required on NormalizedTick)
    if (!Number.isFinite(tick.bid) || tick.bid <= 0) return false;
    if (!Number.isFinite(tick.ask) || tick.ask <= 0) return false;
    
    // Invariant: bid must be less than or equal to ask
    // Small floating point tolerance (0.001) for edge cases
    if (tick.bid > tick.ask + 0.001) return false;
    
    // Timestamp check: shouldn't be too far in the future
    // tick.timestamp is in seconds, Date.now() is in milliseconds
    const nowSecs = Date.now() / 1000;
    const maxFutureSecs = 60; // Allow 1 minute future drift
    if (tick.timestamp > nowSecs + maxFutureSecs) return false;
    
    // Large price jump check (30% max change) if previous price is known
    // This catches data anomalies and spikes
    if (prevPrice !== undefined && prevPrice > 0) {
        const changeRatio = Math.abs(tick.price - prevPrice) / prevPrice;
        if (changeRatio > 0.3) return false; // > 30% jump
    }
    
    return true;
}
