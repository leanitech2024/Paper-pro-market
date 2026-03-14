export declare function toSymbolKey(symbol: string): string;
export declare function toCanonicalSymbol(symbol: string): string;
/**
 * Normalizes instrument keys to the format expected by Upstox.
 *
 * For equities: Converts to uppercase (e.g., "NSE_EQ|INE002A01018")
 * For indices: Preserves Upstox's mixed-case format (e.g., "NSE_INDEX|Nifty 50")
 * For F&O: Converts to uppercase (e.g., "NSE_FO|NIFTY25FEB22000CE")
 *
 * This is critical because Upstox WebSocket expects exact format matching:
 * - Subscribe with "NSE_INDEX|Nifty 50" (mixed case)
 * - Receive ticks with "NSE_INDEX|Nifty 50" (mixed case)
 * - Subscribe with "NSE_FO|NIFTY25FEB22000CE" (uppercase)
 * - Receive ticks with "NSE_FO|NIFTY25FEB22000CE" (uppercase)
 */
export declare function toInstrumentKey(value: string): string;
export declare function symbolToIndexInstrumentKey(symbol: string): string | null;
//# sourceMappingURL=symbol-normalization.d.ts.map