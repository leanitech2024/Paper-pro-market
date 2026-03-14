import { JournalEntry } from '@paper-market/core';
export interface PerformanceMetrics {
    totalTrades: number;
    winRate: number;
    averageWin: number;
    averageLoss: number;
    expectancy: number;
    profitFactor: number;
    maxDrawdown: number;
    netPnL: number;
}
/**
 * Core utility to generate a full performance report from raw journal data.
 * Automatically filters out OPEN trades.
 */
export declare function calculatePerformanceMetrics(entries: JournalEntry[]): PerformanceMetrics;
//# sourceMappingURL=performance-utils.d.ts.map