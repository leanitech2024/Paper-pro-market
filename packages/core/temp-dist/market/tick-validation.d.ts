import type { NormalizedTick } from "./market-data.types.js";
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
export declare function isValidTick(tick: NormalizedTick, prevPrice?: number): boolean;
//# sourceMappingURL=tick-validation.d.ts.map