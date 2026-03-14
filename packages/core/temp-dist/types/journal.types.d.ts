import { InstrumentMode, Side, ExitReason } from './general.types';
/**
 * Snapshot of risk metrics calculated at the moment of entry.
 * Essential for reviewing if the initial trade plan was followed.
 */
export interface RiskSnapshot {
    maxLoss: number;
    maxProfit: number;
    breakeven: number;
    capitalAtRisk: number;
}
/**
 * Comprehensive data model for a single trade journal entry.
 * Captures the full lifecycle of the trade for analysis.
 */
export interface JournalEntry {
    id: string;
    instrument: InstrumentMode;
    symbol: string;
    expiryDate?: Date;
    side: Side;
    quantity: number;
    entryPrice: number;
    entryTime: Date;
    riskSnapshot?: RiskSnapshot;
    exitPrice?: number;
    exitTime?: Date;
    realizedPnL?: number;
    exitReason?: ExitReason;
    notes?: string;
}
//# sourceMappingURL=journal.types.d.ts.map