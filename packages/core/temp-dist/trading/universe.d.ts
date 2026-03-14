export declare const TRADING_UNIVERSE: {
    readonly indices: readonly ["NIFTY", "BANKNIFTY", "NIFTY 50", "NIFTY BANK", "NIFTY FIN SERVICE"];
    readonly equities: readonly ["HDFCBANK", "ICICIBANK", "SBIN", "AXISBANK", "KOTAKBANK", "INDUSINDBK", "TCS", "INFY", "WIPRO", "HCLTECH", "TECHM", "RELIANCE", "ONGC", "BPCL", "IOC", "HINDUNILVR", "ITC", "NESTLEIND", "BRITANNIA", "DABUR", "TATASTEEL", "JSWSTEEL", "HINDALCO", "COALINDIA", "TATAMOTORS", "M&M", "MARUTI", "BAJAJ-AUTO", "EICHERMOT", "SUNPHARMA", "DRREDDY", "CIPLA", "DIVISLAB", "LT", "ADANIPORTS", "ULTRACEMCO", "POWERGRID"];
    readonly exchanges: readonly ["NSE"];
    readonly segments: readonly ["NSE_EQ", "NSE_FO"];
    readonly allowDerivatives: true;
    readonly optionsPolicy: {
        readonly indexOptions: true;
        readonly stockOptions: false;
        readonly strikesAroundATM: 6;
    };
};
/**
 * Checks if an instrument is allowed to be traded based on the Universe configuration.
 */
export declare function isInstrumentAllowed(instrument: {
    name: string;
    tradingsymbol: string;
    exchange: string;
    segment: string;
    instrumentType: string;
}): {
    allowed: boolean;
    reason?: string;
};
//# sourceMappingURL=universe.d.ts.map