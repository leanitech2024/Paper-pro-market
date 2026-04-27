import type { NewTrade, ProductType } from "@paper-market/core";
import { orders } from "@paper-market/core/db";

import { buildLedgerIdempotencyKey } from "@/domains/trading/server/pipeline/order-ledger-keys";

export function buildExecutionOrderPayload(params: {
    instrumentToken: string;
    order: typeof orders.$inferSelect;
    fillQuantity: number;
    executionPrice: number;
    resolvedProductType: ProductType;
    resolvedLeverage: number;
}) {
    const {
        instrumentToken,
        order,
        fillQuantity,
        executionPrice,
        resolvedProductType,
        resolvedLeverage,
    } = params;

    return order.orderType === "LIMIT"
        ? {
            instrumentToken,
            symbol: order.symbol,
            side: order.side,
            quantity: fillQuantity,
            orderType: "LIMIT" as const,
            limitPrice: Number(order.limitPrice || executionPrice),
            productType: resolvedProductType,
            leverage: resolvedLeverage,
        }
        : {
            instrumentToken,
            symbol: order.symbol,
            side: order.side,
            quantity: fillQuantity,
            orderType: "MARKET" as const,
            productType: resolvedProductType,
            leverage: resolvedLeverage,
        };
}

export function buildPlannedLedgerKeys(params: {
    order: typeof orders.$inferSelect;
    instrumentType: string;
    orderSide: "BUY" | "SELL";
    marginBlockDelta: number;
    marginReserveReleaseDelta: number;
    marginToRelease: number;
    closingQuantity: number;
    realizedPnl: number;
    optionMarginBlockDelta: number;
    optionReserveReleaseDelta: number;
    optionMarginToRelease: number;
}) {
    const {
        order,
        instrumentType,
        orderSide,
        marginBlockDelta,
        marginReserveReleaseDelta,
        marginToRelease,
        closingQuantity,
        realizedPnl,
        optionMarginBlockDelta,
        optionReserveReleaseDelta,
        optionMarginToRelease,
    } = params;

    const plannedLedgerKeys: string[] = [];

    if (instrumentType === "FUTURE") {
        if (marginBlockDelta > 0) {
            plannedLedgerKeys.push(buildLedgerIdempotencyKey(order, "MARGIN_BLOCK_OPEN"));
        }
        if (marginReserveReleaseDelta > 0) {
            plannedLedgerKeys.push(buildLedgerIdempotencyKey(order, "MARGIN_RELEASE_RESERVE"));
        }
        if (marginToRelease > 0) {
            plannedLedgerKeys.push(buildLedgerIdempotencyKey(order, "MARGIN_RELEASE_CLOSE"));
        }
        if (closingQuantity > 0 && realizedPnl > 0) {
            plannedLedgerKeys.push(buildLedgerIdempotencyKey(order, "REALIZED_PNL_CREDIT"));
        }
        if (closingQuantity > 0 && realizedPnl < 0) {
            plannedLedgerKeys.push(buildLedgerIdempotencyKey(order, "REALIZED_PNL_DEBIT"));
        }
        plannedLedgerKeys.push(buildLedgerIdempotencyKey(order, "MARGIN_RELEASE_REMAINDER"));
    } else if (instrumentType === "OPTION") {
        const premiumLeg = orderSide === "BUY"
            ? "OPTION_PREMIUM_DEBIT"
            : "OPTION_PREMIUM_CREDIT";
        plannedLedgerKeys.push(buildLedgerIdempotencyKey(order, premiumLeg));
        if (optionMarginBlockDelta > 0) {
            plannedLedgerKeys.push(buildLedgerIdempotencyKey(order, "OPTION_MARGIN_BLOCK"));
        }
        if (optionReserveReleaseDelta > 0) {
            plannedLedgerKeys.push(buildLedgerIdempotencyKey(order, "MARGIN_RELEASE_RESERVE"));
        }
        if (optionMarginToRelease > 0) {
            plannedLedgerKeys.push(buildLedgerIdempotencyKey(order, "OPTION_MARGIN_RELEASE"));
        }
    } else if (orderSide === "BUY") {
        plannedLedgerKeys.push(buildLedgerIdempotencyKey(order, "BUY_DEBIT"));
    } else if (instrumentType === "EQUITY") {
        plannedLedgerKeys.push(buildLedgerIdempotencyKey(order, "SELL_PROCEEDS"));
    }

    return plannedLedgerKeys;
}

export function buildNewTradeRecord(params: {
    order: typeof orders.$inferSelect;
    instrumentToken: string;
    fillQuantity: number;
    finalExecutionPrice: number;
}): NewTrade {
    const { order, instrumentToken, fillQuantity, finalExecutionPrice } = params;

    return {
        orderId: order.id,
        userId: order.userId,
        symbol: order.symbol,
        instrumentToken,
        side: order.side,
        quantity: fillQuantity,
        price: finalExecutionPrice.toString(),
        executedAt: new Date(),
    };
}
