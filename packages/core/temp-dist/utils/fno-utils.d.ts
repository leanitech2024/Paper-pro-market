/**
 * Utility functions for parsing and calculating risks for F&O instruments.
 */
export interface OptionDetails {
    underlying: string;
    expiry: string;
    strike: number;
    type: 'CE' | 'PE';
}
/**
 * Parses a standard NSE Option symbol string.
 * Example: NIFTY24JAN21700CE -> { underlying: 'NIFTY', expiry: '24JAN', strike: 21700, type: 'CE' }
 */
export declare function parseOptionSymbol(symbol: string): OptionDetails | null;
export interface OptionRiskMetrics {
    maxLoss: number;
    maxProfit: number;
    breakeven: number;
    capitalAtRisk: number;
}
/**
 * Calculates static risk metrics (Max Profit, Max Loss, Breakeven).
 * Note: Uses Infinity for unlimited profit/loss scenarios.
 */
export declare function calculateOptionRiskMetrics(entryPrice: number, // Premium
quantity: number, // Number of lots (or raw qty if lotSize is handled outside)
_lotSize: number, optionDetails: OptionDetails | null, side: 'BUY' | 'SELL'): OptionRiskMetrics | null;
//# sourceMappingURL=fno-utils.d.ts.map