/**
 * Utilities to generate payoff chart data for Single-Leg Options (BUY Side).
 */
interface PayoffPoint {
    price: number;
    pnl: number;
}
interface PayoffParams {
    strikePrice: number;
    premium: number;
    lotSize: number;
    numberOfLots: number;
    rangeConfig?: {
        min: number;
        max: number;
        step: number;
    };
}
/**
 * Generates Payoff Data for a Long Call Option (Buy CE).
 * Formula: PnL = (Max(Spot - Strike, 0) - Premium) * Quantity
 */
export declare function generateCallPayoff({ strikePrice, premium, lotSize, numberOfLots, rangeConfig }: PayoffParams): PayoffPoint[];
/**
 * Generates Payoff Data for a Long Put Option (Buy PE).
 * Formula: PnL = (Max(Strike - Spot, 0) - Premium) * Quantity
 */
export declare function generatePutPayoff({ strikePrice, premium, lotSize, numberOfLots, rangeConfig }: PayoffParams): PayoffPoint[];
export {};
//# sourceMappingURL=fno-payoff-utils.d.ts.map