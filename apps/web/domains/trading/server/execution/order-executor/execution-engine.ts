import { and, eq, ne } from "drizzle-orm";
import { positions } from "@paper-market/core/db";
import { orders } from "@paper-market/core/db";

import { ApiError } from "@/lib/errors";
import { PositionService } from "@/domains/trading/server/positions/position.service";
import { LedgerService } from "@/domains/platform/server/accounting/ledger/ledger.service";
import { WalletService } from "@/domains/platform/server/accounting/wallet/wallet.service";
import { buildLedgerIdempotencyKey } from "@/domains/trading/server/pipeline/order-ledger-keys";

import { resolveOptionPremiumReferenceType } from "./validation";

export async function executeInstrumentSettlement(params: {
    tx: any;
    order: typeof orders.$inferSelect;
    instrument: any;
    trade: any;
    finalExecutionPrice: number;
    fillQuantity: number;
    ledgerReferenceType: any;
    reservedMargin: number;
    marginRequired: number;
    closingQuantity: number;
    openingQuantity: number;
    realizedPnl: number;
    marginBlockDelta: number;
    marginReserveReleaseDelta: number;
    marginToRelease: number;
    optionMarginBlockDelta: number;
    optionReserveReleaseDelta: number;
    optionMarginToRelease: number;
    ledgerSequences: number[];
}) {
    const {
        tx,
        order,
        instrument,
        trade,
        finalExecutionPrice,
        fillQuantity,
        ledgerReferenceType,
        reservedMargin,
        marginRequired,
        closingQuantity,
        openingQuantity,
        realizedPnl,
        marginBlockDelta,
        marginReserveReleaseDelta,
        marginToRelease,
        optionMarginBlockDelta,
        optionReserveReleaseDelta,
        optionMarginToRelease,
        ledgerSequences,
    } = params;

    if (instrument.instrumentType === "FUTURE") {
        if (marginBlockDelta > 0) {
            await WalletService.debitBalance(
                order.userId,
                marginBlockDelta,
                "MARGIN_BLOCK",
                trade.id,
                tx,
                `Margin Block ${order.symbol}`,
                {
                    ledgerReferenceType,
                    skipWaj: true,
                    skipWalletSync: true,
                    sequenceCollector: ledgerSequences,
                    idempotencyKey: buildLedgerIdempotencyKey(order, "MARGIN_BLOCK_OPEN"),
                }
            );
        }
        if (marginReserveReleaseDelta > 0) {
            await WalletService.releaseMarginBlock(
                order.userId,
                marginReserveReleaseDelta,
                trade.id,
                tx,
                `Margin Release (Reserve Adjust) ${order.symbol}`,
                {
                    ledgerReferenceType,
                    skipWaj: true,
                    skipWalletSync: true,
                    sequenceCollector: ledgerSequences,
                    idempotencyKey: buildLedgerIdempotencyKey(order, "MARGIN_RELEASE_RESERVE"),
                }
            );
        }

        await PositionService.updatePosition(tx, trade);

        if (marginToRelease > 0) {
            await WalletService.releaseMarginBlock(
                order.userId,
                marginToRelease,
                trade.id,
                tx,
                `Margin Release ${order.symbol}`,
                {
                    ledgerReferenceType,
                    skipWaj: true,
                    skipWalletSync: true,
                    sequenceCollector: ledgerSequences,
                    idempotencyKey: buildLedgerIdempotencyKey(order, "MARGIN_RELEASE_CLOSE"),
                }
            );
        }

        if (closingQuantity > 0 && Math.abs(realizedPnl) > 0) {
            const realizedAmount = Math.abs(realizedPnl);
            if (realizedPnl > 0) {
                await WalletService.creditBalance(
                    order.userId,
                    realizedAmount,
                    "TRADE",
                    trade.id,
                    `Realized PnL Credit ${order.symbol}`,
                    tx,
                    {
                        ledgerReferenceType,
                        skipWaj: true,
                        skipWalletSync: true,
                        sequenceCollector: ledgerSequences,
                        idempotencyKey: buildLedgerIdempotencyKey(order, "REALIZED_PNL_CREDIT"),
                    }
                );
            } else {
                await WalletService.debitBalance(
                    order.userId,
                    realizedAmount,
                    "TRADE",
                    trade.id,
                    tx,
                    `Realized PnL Debit ${order.symbol}`,
                    {
                        ledgerReferenceType,
                        skipWaj: true,
                        skipWalletSync: true,
                        sequenceCollector: ledgerSequences,
                        idempotencyKey: buildLedgerIdempotencyKey(order, "REALIZED_PNL_DEBIT"),
                        isSettlement: true,
                    }
                );
            }
        }

        const [remainingOpenPosition] = await tx
            .select({ id: positions.id })
            .from(positions)
            .where(
                and(
                    eq(positions.userId, order.userId),
                    ne(positions.quantity, 0)
                )
            )
            .limit(1);

        if (!remainingOpenPosition) {
            const snapshot = await LedgerService.reconstructUserEquity(order.userId, tx);
            if (LedgerService.compare(snapshot.marginBlocked, "0") > 0) {
                await WalletService.releaseMarginBlock(
                    order.userId,
                    snapshot.marginBlocked,
                    trade.id,
                    tx,
                    "Margin Release All After Full Exit",
                    {
                        ledgerReferenceType,
                        skipWaj: true,
                        skipWalletSync: true,
                        sequenceCollector: ledgerSequences,
                        idempotencyKey: buildLedgerIdempotencyKey(order, "MARGIN_RELEASE_REMAINDER"),
                    }
                );
            }
        }
        return;
    }

    if (instrument.instrumentType === "EQUITY") {
        if (order.side === "BUY") {
            if (reservedMargin > 0) {
                await WalletService.releaseMarginBlock(
                    order.userId,
                    reservedMargin,
                    trade.id,
                    tx,
                    `Margin Release (Consume) ${order.symbol}`,
                    {
                        ledgerReferenceType,
                        skipWaj: true,
                        skipWalletSync: true,
                        sequenceCollector: ledgerSequences,
                        idempotencyKey: buildLedgerIdempotencyKey(order, "MARGIN_RELEASE_RESERVE"),
                    }
                );
            }
            await WalletService.debitBalance(
                order.userId,
                marginRequired,
                "TRADE",
                trade.id,
                tx,
                `Buy ${order.symbol}`,
                {
                    ledgerReferenceType,
                    skipWaj: true,
                    skipWalletSync: true,
                    sequenceCollector: ledgerSequences,
                    idempotencyKey: buildLedgerIdempotencyKey(order, "BUY_DEBIT"),
                }
            );
        } else {
            const proceeds = LedgerService.multiplyByInteger(
                finalExecutionPrice.toString(),
                fillQuantity
            );
            await WalletService.creditProceeds(
                order.userId,
                proceeds,
                trade.id,
                tx,
                `Sell ${order.symbol}`,
                {
                    ledgerReferenceType,
                    skipWaj: true,
                    skipWalletSync: true,
                    sequenceCollector: ledgerSequences,
                    idempotencyKey: buildLedgerIdempotencyKey(order, "SELL_PROCEEDS"),
                }
            );
        }

        await PositionService.updatePosition(tx, trade);
        return;
    }

    if (instrument.instrumentType === "OPTION") {
        const premiumAmount = LedgerService.multiplyByInteger(
            finalExecutionPrice.toString(),
            fillQuantity
        );
        const premiumLeg = order.side === "BUY"
            ? "OPTION_PREMIUM_DEBIT"
            : "OPTION_PREMIUM_CREDIT";
        const premiumReferenceType = resolveOptionPremiumReferenceType(
            order.side,
            closingQuantity,
            openingQuantity
        );

        if (order.side === "BUY") {
            if (optionReserveReleaseDelta > 0) {
                await WalletService.releaseMarginBlock(
                    order.userId,
                    optionReserveReleaseDelta,
                    trade.id,
                    tx,
                    `Margin Release (Consume) ${order.symbol}`,
                    {
                        ledgerReferenceType: premiumReferenceType,
                        skipWaj: true,
                        skipWalletSync: true,
                        sequenceCollector: ledgerSequences,
                        idempotencyKey: buildLedgerIdempotencyKey(order, "MARGIN_RELEASE_RESERVE"),
                    }
                );
            }
            await WalletService.debitBalance(
                order.userId,
                premiumAmount,
                "OPTION_PREMIUM_DEBIT",
                trade.id,
                tx,
                `Option Premium Debit ${order.symbol}`,
                {
                    ledgerReferenceType: premiumReferenceType,
                    skipWaj: true,
                    skipWalletSync: true,
                    sequenceCollector: ledgerSequences,
                    idempotencyKey: buildLedgerIdempotencyKey(order, premiumLeg),
                }
            );
        } else {
            await WalletService.creditProceeds(
                order.userId,
                premiumAmount,
                trade.id,
                tx,
                `Option Premium Credit ${order.symbol}`,
                {
                    ledgerReferenceType: premiumReferenceType,
                    skipWaj: true,
                    skipWalletSync: true,
                    sequenceCollector: ledgerSequences,
                    idempotencyKey: buildLedgerIdempotencyKey(order, premiumLeg),
                }
            );
        }

        await PositionService.updatePosition(tx, trade);

        if (optionMarginBlockDelta > 0) {
            await WalletService.debitBalance(
                order.userId,
                optionMarginBlockDelta,
                "OPTION_MARGIN_BLOCK",
                trade.id,
                tx,
                `Option Margin Block ${order.symbol}`,
                {
                    ledgerReferenceType: "OPTION_MARGIN_BLOCK",
                    skipWaj: true,
                    skipWalletSync: true,
                    sequenceCollector: ledgerSequences,
                    idempotencyKey: buildLedgerIdempotencyKey(order, "OPTION_MARGIN_BLOCK"),
                }
            );
        }

        if (optionReserveReleaseDelta > 0 && order.side === "SELL") {
            await WalletService.releaseMarginBlock(
                order.userId,
                optionReserveReleaseDelta,
                trade.id,
                tx,
                `Option Margin Release (Reserve Adjust) ${order.symbol}`,
                {
                    ledgerReferenceType: "OPTION_MARGIN_RELEASE",
                    skipWaj: true,
                    skipWalletSync: true,
                    sequenceCollector: ledgerSequences,
                    idempotencyKey: buildLedgerIdempotencyKey(order, "MARGIN_RELEASE_RESERVE"),
                }
            );
        }

        if (optionMarginToRelease > 0) {
            const snapshot = await LedgerService.reconstructUserEquity(order.userId, tx);
            const blocked = Number(snapshot.marginBlocked);
            const safeRelease = Number.isFinite(blocked)
                ? Math.min(optionMarginToRelease, blocked)
                : optionMarginToRelease;

            if (safeRelease > 0) {
                await WalletService.releaseMarginBlock(
                    order.userId,
                    safeRelease,
                    trade.id,
                    tx,
                    `Option Margin Release ${order.symbol}`,
                    {
                        ledgerReferenceType: "OPTION_MARGIN_RELEASE",
                        skipWaj: true,
                        skipWalletSync: true,
                        sequenceCollector: ledgerSequences,
                        idempotencyKey: buildLedgerIdempotencyKey(order, "OPTION_MARGIN_RELEASE"),
                    }
                );
            }
        }
        return;
    }

    throw new ApiError(
        `Unsupported instrumentType for execution: ${instrument.instrumentType}`,
        400,
        "INVALID_INSTRUMENT_TYPE"
    );
}
