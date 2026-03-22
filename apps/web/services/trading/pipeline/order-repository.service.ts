import crypto from "node:crypto";
import type { Instrument, PlaceOrder } from "@paper-market/core";
import { orders } from "@paper-market/core/db";
import type { NewOrder } from "@paper-market/core";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/errors";
import { WalletService } from "@/services/accounting/wallet/wallet.service";
import { MarginReservationService } from "@/services/trading/margin/margin-reservation.service";
import { buildLedgerIdempotencyKey, resolveLedgerReferenceType } from "@/services/trading/pipeline/order-ledger-keys";

type CreateOrderOptions = {
  isClosingOrder?: boolean;
  initialStatus?: typeof orders.$inferSelect["status"];
};

export class OrderRepositoryService {
  static async createOrder(
    userId: string,
    payload: PlaceOrder,
    instrument: Instrument,
    requiredMargin: number,
    options: CreateOrderOptions = {}
  ) {
    const orderId = crypto.randomUUID();
    const idempotencyKey = payload.idempotencyKey ?? crypto.randomUUID();
    const shouldReserveMargin =
      !options.isClosingOrder &&
      requiredMargin > 0 &&
      (instrument.instrumentType !== "EQUITY" || payload.side === "BUY");

    const reservedMargin = shouldReserveMargin ? requiredMargin : 0;
    const newOrder: NewOrder = {
      id: orderId,
      userId,
      symbol: payload.symbol,
      instrumentToken: instrument.instrumentToken,
      side: payload.side,
      quantity: payload.quantity,
      orderType: payload.orderType,
      limitPrice:
        payload.orderType === "LIMIT"
          ? payload.limitPrice.toString()
          : payload.exitReason === "EXPIRY" && Number.isFinite(payload.settlementPrice)
            ? Number(payload.settlementPrice).toString()
            : null,
      status: options.initialStatus ?? "OPEN",
      productType: payload.productType ?? "CNC",
      leverage: payload.leverage ?? 1,
      stopLossPrice: payload.stopLossPrice?.toString() ?? null,
      targetPrice: payload.targetPrice?.toString() ?? null,
      idempotencyKey,
      exitReason: payload.exitReason || null,
      reservedMargin: reservedMargin.toString(),
    };

    const orderLike = {
      id: orderId,
      exitReason: payload.exitReason || null,
      rejectionReason: null,
    };

    return await db.transaction(async (tx) => {
      // 1. Acquire row lock and verify margin sequentially BEFORE order creation
      if (!options.isClosingOrder && reservedMargin > 0) {
        await MarginReservationService.reserveMarginWithinTransaction(userId, reservedMargin, tx);
      }

      if (reservedMargin > 0) {
        await WalletService.debitBalance(
          userId,
          reservedMargin,
          "MARGIN_BLOCK",
          orderId,
          tx,
          `Margin Reserve ${payload.symbol}`,
          {
            ledgerReferenceType: resolveLedgerReferenceType(orderLike),
            idempotencyKey: buildLedgerIdempotencyKey(orderLike, "MARGIN_BLOCK_RESERVE"),
          }
        );
      }

      const [order] = await tx.insert(orders).values(newOrder).returning();
      return order;
    });
  }
}

