export declare const OPTION_SHORT_PREMIUM_MULTIPLIER = 1.5;
export declare const OPTION_SHORT_UNDERLYING_MARGIN_RATIO = 0.15;
type OptionMarginInput = {
    optionPrice: number;
    underlyingPrice: number;
    quantity: number;
};
export declare function calculateLongOptionMargin(optionPrice: number, quantity: number): number;
export declare function calculateShortOptionMargin(input: OptionMarginInput): number;
export {};
//# sourceMappingURL=option-margin.d.ts.map