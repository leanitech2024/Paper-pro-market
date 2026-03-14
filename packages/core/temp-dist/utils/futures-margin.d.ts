type FutureInstrumentLike = {
    underlying?: unknown;
    name?: unknown;
    tradingsymbol?: unknown;
    symbol?: unknown;
};
export declare const INDEX_FUTURES_MARGIN_PERCENT = 0.12;
export declare const STOCK_FUTURES_MARGIN_PERCENT = 0.18;
export declare function isIndexFutureInstrument(instrument?: FutureInstrumentLike | null): boolean;
export declare function resolveFuturesMarginPercent(instrument?: FutureInstrumentLike | null): number;
export declare function resolveEffectiveLeverage(leverage: unknown): number;
export declare function calculateFuturesRequiredMargin(params: {
    price: number;
    quantity: number;
    leverage?: number;
    instrument?: FutureInstrumentLike | null;
}): number;
export {};
//# sourceMappingURL=futures-margin.d.ts.map