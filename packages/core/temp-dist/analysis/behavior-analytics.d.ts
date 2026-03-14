import { JournalEntry } from '../types/journal.types.js';
export type BehaviorType = 'HIGH_FREQUENCY' | 'RAPID_REENTRY' | 'LOSS_STREAK' | 'LONG_HOLD_LOSS' | 'SIZE_DEVIATION';
export type BehaviorSeverity = 'LOW' | 'MEDIUM' | 'HIGH';
export interface BehaviorInsight {
    type: BehaviorType;
    severity: BehaviorSeverity;
    tradeIds: string[];
    message: string;
    timestamp: Date;
}
/**
 * Analyzes journal entries to detect behavioral patterns.
 * Pure function: does not modify inputs.
 */
export declare function analyzeBehavior(entries: JournalEntry[]): BehaviorInsight[];
//# sourceMappingURL=behavior-analytics.d.ts.map