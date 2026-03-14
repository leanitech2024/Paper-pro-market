import { JournalEntry } from '../types/journal.types.js';
import { BehaviorType } from './behavior-analytics.js';
export interface WeeklySummary {
    id: string;
    startDate: Date;
    endDate: Date;
    totalTrades: number;
    netPnL: number;
    winRate: number;
    behaviorCounts: Record<BehaviorType, number>;
    dominantBehavior: BehaviorType | null;
    insightCount: number;
    note: string;
}
export declare function generateWeeklySummaries(entries: JournalEntry[]): WeeklySummary[];
//# sourceMappingURL=weekly-analytics.d.ts.map