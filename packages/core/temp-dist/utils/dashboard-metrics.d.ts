export interface EquityCurvePoint {
    time: number;
    value: number;
}
export declare function roundTo(value: number, decimals?: number): number;
export declare function calculateMaxDrawdownPct(equityCurve: EquityCurvePoint[]): number;
export declare function calculateAnnualizedSharpeRatioFromEquityCurve(equityCurve: EquityCurvePoint[]): number;
export declare function getIstDayBoundsUtc(now?: Date): {
    start: Date;
    end: Date;
};
//# sourceMappingURL=dashboard-metrics.d.ts.map