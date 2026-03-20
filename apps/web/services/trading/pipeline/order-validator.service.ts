import { performance } from "node:perf_hooks";
import type { Instrument, PlaceOrder } from "@paper-market/core";
import { getIstDateKey, isInstrumentAllowed, isTradingHolidayIST } from "@paper-market/core";
import { ApiError } from "@/lib/errors";
import { assertTradingEnabled } from "@/lib/system-control";
import { assertFeedHealthy } from "@/services/market/feeds/feed-health.service";
import { OrderAcceptanceService } from "@/services/trading/order/order-acceptance.service";

import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";
import { instrumentRepository } from "@/lib/instruments/repository";
import { requireInstrumentTokenForIdentityLookup } from "@/lib/trading/token-identity-guard";

const IST_TIME_ZONE = "Asia/Kolkata";
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const ALLOW_AFTER_HOURS_ORDER_STAGING =
  process.env.NODE_ENV !== "production" &&
  TRUE_VALUES.has(
    String(process.env.ALLOW_AFTER_HOURS_ORDER_STAGING ?? "false")
      .trim()
      .toLowerCase()
  );
const PAPER_TRADING_MODE =
  String(process.env.PAPER_TRADING_MODE ?? "true").trim().toLowerCase() !== "false";

export type OrderValidationResult = {
  instrument: Instrument;
  stageAfterHours: boolean;
  isForcedRiskFlow: boolean;
  marketClosed: boolean;
  now: Date;
  validationMs: number;
};

function toIstDayNumber(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: IST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = Number(parts.find((part) => part.type === "year")?.value || 0);
  const month = Number(parts.find((part) => part.type === "month")?.value || 0);
  const day = Number(parts.find((part) => part.type === "day")?.value || 0);
  return Date.UTC(year, month - 1, day);
}

function getIstClock(now: Date): { day: number; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TIME_ZONE,
    hour12: false,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(now);

  const weekday = parts.find((p) => p.type === "weekday")?.value || "";
  const hour = Number(parts.find((p) => p.type === "hour")?.value || "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value || "0");
  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    day: dayMap[weekday] ?? 0,
    hour,
    minute,
  };
}

function isInstrumentSessionClosed(instrument: Instrument, now: Date): boolean {
  const { day, hour, minute } = getIstClock(now);
  if (day === 0 || day === 6) return true;

  const mins = hour * 60 + minute;
  const open = 9 * 60 + 15;
  const foClose = 15 * 60 + 30;
  const eqClose = 15 * 60 + 30;

  if (instrument.segment === "NSE_FO") {
    return mins < open || mins > foClose;
  }

  if (instrument.segment === "NSE_EQ") {
    return mins < open || mins > eqClose;
  }

  return false;
}

export class OrderValidatorService {
  static async validate(
    userId: string,
    payload: PlaceOrder,
    options: { force?: boolean; isClosingOrder?: boolean } = {}
  ): Promise<OrderValidationResult> {
    const validationStartMs = performance.now();

    assertTradingEnabled({
      force: options.force,
      context: "OrderValidatorService.validate",
    });

    if (!options.force && !options.isClosingOrder) {
      const rl = rateLimit(`order-place:${userId}`, { maxRequests: 10, windowMs: 1000 });
      if (!rl.allowed) {
        throw new ApiError(
          "Too many orders. Please wait before placing another.",
          429,
          "RATE_LIMITED"
        );
      }
    }

    logger.info(
      { lookupSymbol: payload.symbol, lookupToken: payload.instrumentToken },
      "Looking up instrument"
    );

    await instrumentRepository.ensureInitialized();
    if (!instrumentRepository.getStats().isInitialized) {
      throw new ApiError("Instrument repository not ready", 503, "INSTRUMENT_STORE_NOT_READY");
    }

    const instrumentToken = requireInstrumentTokenForIdentityLookup({
      context: "OrderValidatorService.validate",
      instrumentToken: payload.instrumentToken,
      symbol: payload.symbol,
    });

    const instrument = instrumentRepository.get(instrumentToken);
    if (!instrument) {
      throw new ApiError("Invalid instrumentToken", 400, "INVALID_INSTRUMENT_TOKEN");
    }

    if (instrument && instrument.tradingsymbol !== payload.symbol) {
      logger.warn(
        {
          payloadSymbol: payload.symbol,
          instrumentSymbol: instrument.tradingsymbol,
          token: payload.instrumentToken,
        },
        "Symbol mismatch in order payload"
      );
    }

    if (!instrument.isActive && payload.exitReason !== "EXPIRY") {
      throw new ApiError("Instrument is inactive", 400, "INSTRUMENT_INACTIVE");
    }

    const now = new Date();
    const universeCheck = isInstrumentAllowed(instrument);
    if (!universeCheck.allowed) {
      throw new ApiError(
        `Trading not allowed: ${universeCheck.reason}`,
        403,
        "INSTRUMENT_NOT_ALLOWED"
      );
    }

    const isForcedRiskFlow = Boolean(options.force || payload.exitReason === "EXPIRY");
    const isHoliday = isTradingHolidayIST(now);
    const marketClosed = isHoliday || isInstrumentSessionClosed(instrument, now);
    const stageAfterHours =
      !isForcedRiskFlow && marketClosed && ALLOW_AFTER_HOURS_ORDER_STAGING;

    if (
      marketClosed &&
      !isForcedRiskFlow &&
      !stageAfterHours &&
      !options.isClosingOrder
    ) {
      const holidaySuffix = isHoliday ? ` (holiday ${getIstDateKey(now)})` : "";
      throw new ApiError(
        `Market is closed${holidaySuffix}. Trading hours are 9:15 AM - 3:30 PM IST (Mon-Fri).`,
        400,
        "MARKET_CLOSED"
      );
    }

    if (!stageAfterHours && !isForcedRiskFlow && !options.isClosingOrder) {
      assertFeedHealthy(instrument.instrumentToken);
      await OrderAcceptanceService.validateOrder(payload, instrument, { userId });
    }

    const validationMs = performance.now() - validationStartMs;
    return {
      instrument,
      stageAfterHours,
      isForcedRiskFlow,
      marketClosed,
      now,
      validationMs,
    };
  }
}


