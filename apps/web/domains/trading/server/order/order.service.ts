import { db } from "@/lib/db";
import { orders } from "@paper-market/core/db";
import { logger } from "@/lib/logger";
import { ApiError } from "@/lib/errors";
import { and, eq, lt, sql } from "drizzle-orm";
import type { PlaceOrder, OrderQuery } from "@paper-market/core";
import { OrderPipelineService } from "@/domains/trading/server/pipeline/order-pipeline.service";
import { WalletService } from "@/domains/platform/server/accounting/wallet/wallet.service";
import { buildLedgerIdempotencyKey, resolveLedgerReferenceType } from "@/domains/trading/server/pipeline/order-ledger-keys";
import { OrderStateMachineService } from "@/domains/trading/server/pipeline/order-state-machine.service";

function isApiErrorLike(
  error: unknown,
): error is { message: string; statusCode: number; code: string } {
  if (!error || typeof error !== "object") return false;
  const maybe = error as {
    message?: unknown;
    statusCode?: unknown;
    code?: unknown;
  };
  return (
    typeof maybe.message === "string" &&
    typeof maybe.statusCode === "number" &&
    typeof maybe.code === "string"
  );
}

export class OrderService {
  /**
   * Place a new order with idempotency support.
   */
  static async placeOrder(
    userId: string,
    payload: PlaceOrder,
    options: { force?: boolean; isClosingOrder?: boolean } = {},
  ) {
    try {
      return await OrderPipelineService.placeOrder(userId, payload, options);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      if (isApiErrorLike(err)) {
        throw new ApiError(err.message, err.statusCode, err.code);
      }
      logger.error(
        { err: err, userId, symbol: payload.symbol },
        "Failed to place order",
      );
      throw new ApiError(
        "Failed to place order",
        500,
        "ORDER_PLACEMENT_FAILED",
      );
    }
  }

  /**
   * Cancel an open order.
   */
  static async cancelOrder(userId: string, orderId: string) {
    try {
      const [cancelledOrder] = await db.transaction(async (tx) => {
        const order = await OrderStateMachineService.transition(
          orderId,
          "OPEN",
          "CANCELLED",
          tx
        );

        if (!order) return [];

        const reservedMargin = Number(order.reservedMargin ?? 0);
        if (reservedMargin > 0) {
          await WalletService.releaseMarginBlock(
            order.userId,
            reservedMargin,
            order.id,
            tx,
            `Margin Release (Cancel) ${order.symbol}`,
            {
              ledgerReferenceType: resolveLedgerReferenceType(order),
              idempotencyKey: buildLedgerIdempotencyKey(order, "MARGIN_RELEASE_CANCEL"),
            }
          );
        }

        return [order];
      });

      if (!cancelledOrder) {
        // Order either doesn't exist, belongs to a different user, or is no longer OPEN.
        // Check which case to give an accurate error.
        const [existing] = await db
          .select({ status: orders.status, userId: orders.userId })
          .from(orders)
          .where(eq(orders.id, orderId))
          .limit(1);

        if (!existing || existing.userId !== userId) {
          throw new ApiError("Order not found", 404, "NOT_FOUND");
        }
        throw new ApiError(
          `Cannot cancel order in ${existing.status} state`,
          400,
          "INVALID_STATE_TRANSITION",
        );
      }

      logger.info(
        { orderId, userId, symbol: cancelledOrder.symbol },
        "Order cancelled",
      );
      return cancelledOrder;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      logger.error({ err: err, userId, orderId }, "Failed to cancel order");
      throw new ApiError(
        "Failed to cancel order",
        500,
        "ORDER_CANCELLATION_FAILED",
      );
    }
  }

  /**
   * Get orders for a user with optional filters.
   */
  static async getOrders(userId: string, filters: OrderQuery = {}) {
    try {
      const conditions = [eq(orders.userId, userId)];

      if (filters.status) {
        conditions.push(eq(orders.status, filters.status));
      }

      if (filters.symbol) {
        conditions.push(eq(orders.symbol, filters.symbol));
      }

      const limit = filters.limit || 20;
      const cursor = filters.cursor ? new Date(filters.cursor) : null;
      if (cursor) {
        conditions.push(lt(orders.createdAt, cursor));
      }

      let query = db
        .select()
        .from(orders)
        .where(and(...conditions))
        .orderBy(sql`${orders.createdAt} DESC`)
        .$dynamic();

      // Apply limit
      query = query.limit(limit);

      if (!cursor && filters.page && filters.page > 1) {
        const offset = (filters.page - 1) * limit;
        query = query.offset(offset);
      }

      const results = await query;

      return results;
    } catch (err) {
      logger.error({ err: err, userId, filters }, "Failed to get orders");
      throw new ApiError(
        "Failed to retrieve orders",
        500,
        "ORDER_RETRIEVAL_FAILED",
      );
    }
  }
}
