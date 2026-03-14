export const OPTION_SHORT_PREMIUM_MULTIPLIER = 1.5;
export const OPTION_SHORT_UNDERLYING_MARGIN_RATIO = 0.15;
function clampPositive(value, fallback) {
    return Number.isFinite(value) && value > 0 ? value : fallback;
}
export function calculateLongOptionMargin(optionPrice, quantity) {
    const safeOption = clampPositive(optionPrice, 0);
    const safeQty = Math.max(0, Number(quantity) || 0);
    return safeOption * safeQty;
}
export function calculateShortOptionMargin(input) {
    const safeOption = clampPositive(input.optionPrice, 0);
    const safeUnderlying = clampPositive(input.underlyingPrice, safeOption);
    const safeQty = Math.max(0, Number(input.quantity) || 0);
    const premium = safeOption * safeQty;
    const premiumLeg = premium * OPTION_SHORT_PREMIUM_MULTIPLIER;
    const underlyingLeg = safeUnderlying * safeQty * OPTION_SHORT_UNDERLYING_MARGIN_RATIO;
    return Math.max(premiumLeg, underlyingLeg);
}
