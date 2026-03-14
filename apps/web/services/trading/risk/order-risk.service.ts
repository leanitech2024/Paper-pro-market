import { and, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@paper-market/core/db";
import { ApiError } from "@/lib/errors";
import { TradingSafetyService } from "@/services/trading/risk/trading-safety.service";
import { PreTradeRiskService } from "@/services/trading/risk/pretrade-risk.service";
import type { Instrument, PlaceOrder } from "@paper-market/core";
import { logger } from "@/lib/logger";

const PAPER_TRADING_MODE = String(process.env.PAPER_TRADING_MODE ?? "true").trim().toLowerCase() !== "false";
const DUPLICATE_WINDOW_MS = 2000;
const DEFAULT_MAX_POSITION_NOTIONAL = Number(process.env.MAX_POSITION_NOTIONAL_PER_SYMBOL ?? "2000000");

export class OrderRiskService {
  static async validateTradingSafety(
    userId: string,
    payload: PlaceOrder,
    instrument: Instrument,
    options: { isForcedRiskFlow?: boolean; isClosingOrder?: boolean; stageAfterHours?: boolean } = {}
  ): Promise<void> {
    this.validateLotSize(payload.quantity, instrument.lotSize);
    await this.validateDuplicateOrder(userId, payload);

    if (options.stageAfterHours || options.isForcedRiskFlow || options.isClosingOrder) {
      return;
    }

    await TradingSafetyService.validate(userId, payload, instrument);
  }

  private static validateLotSize(quantity: number, lotSize: number): void {
    if (lotSize <= 0 || quantity % lotSize !== 0) {
      if (PAPER_TRADING_MODE) {
        logger.warn({ quantity, lotSize }, "Lot size mismatch allowed in paper mode");
        return;
      }
      throw new ApiError(`Quantity ${quantity} must be multiple of ${lotSize}`, 400, "INVALID_LOT_SIZE");
    }
  }

  private static async validateDuplicateOrder(userId: string, order: PlaceOrder): Promise<void> {
    const windowStart = new Date(Date.now() - DUPLICATE_WINDOW_MS);
    const [existing] = await db
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(
          eq(orders.userId, userId),
          eq(orders.instrumentToken, order.instrumentToken),
          eq(orders.side, order.side),
          eq(orders.quantity, order.quantity),
          gte(orders.createdAt, windowStart)
        )
      )
      .limit(1);

    if (existing) {
      if (PAPER_TRADING_MODE) {
        logger.warn({ userId, symbol: order.symbol }, "Duplicate order allowed in paper mode");
        return;
      }
      throw new ApiError("Duplicate order detected", 409, "DUPLICATE_ORDER");
    }
  }

  static async checkRiskLimits(
    userId: string,
    payload: PlaceOrder,
    instrument: Instrument,
    options: { isClosingOrder?: boolean; stageAfterHours?: boolean } = {}
  ): Promise<void> {
    if (options.isClosingOrder || options.stageAfterHours) {
      return;
    }

    // Check per-instrument notional limit (Order Size Limit)
    const price = Number((payload as any).limitPrice || (payload as any).settlementPrice || 0); // approx
    const orderNotional = price * payload.quantity;
    const maxNotional = Number(process.env.MAX_POSITION_NOTIONAL_PER_SYMBOL ?? "2000000");

    if (orderNotional > maxNotional) {
        throw new ApiError(`Order notional ${orderNotional} exceeds limit ${maxNotional}`, 400, "POSITION_LIMIT_EXCEEDED");
    }

    // Check expiry risk for options
    if (instrument.instrumentType === "OPTION" && instrument.expiry) {
        const expiryDate = new Date(instrument.expiry);
        const now = new Date();
        const diffDays = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays < 1) {
             throw new ApiError("Opening new option exposure near expiry is blocked", 400, "EXPIRY_RISK_BLOCK");
        }
    }

    await PreTradeRiskService.validateOrder(userId, payload, instrument);
  }
}

