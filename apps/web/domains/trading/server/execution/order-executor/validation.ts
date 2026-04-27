import type { LedgerReferenceType, WriteAheadOperationType } from "@paper-market/core";
import { orders } from "@paper-market/core/db";

export function resolveWajOperationType(
    order: typeof orders.$inferSelect
): WriteAheadOperationType {
    if (order.rejectionReason === "FORCED_LIQUIDATION") return "LIQUIDATION";
    if (order.exitReason === "EXPIRY") return "EXPIRY_SETTLEMENT";
    return "TRADE_EXECUTION";
}

export function resolveOptionPremiumReferenceType(
    side: "BUY" | "SELL",
    closingQuantity: number,
    openingQuantity: number
): LedgerReferenceType {
    if (closingQuantity > 0 && openingQuantity === 0) {
        return "OPTION_REALIZED_PNL";
    }
    return side === "BUY" ? "OPTION_PREMIUM_DEBIT" : "OPTION_PREMIUM_CREDIT";
}
