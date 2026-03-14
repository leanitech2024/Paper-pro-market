import { performance } from "node:perf_hooks";
import type { PlaceOrder } from "@paper-market/core";
import { logger } from "@/lib/logger";
import { MarginCalculatorService } from "@/services/trading/margin/margin-calculator.service";
import { OrderExecutorService } from "@/services/trading/execution/order-executor.service";
import { OrderRepositoryService } from "@/services/trading/pipeline/order-repository.service";
import { OrderValidatorService } from "@/services/trading/pipeline/order-validator.service";
import { OrderRiskService } from "@/services/trading/risk/order-risk.service";
import { MarginReservationService } from "@/services/trading/margin/margin-reservation.service";
import crypto from "crypto";

export class OrderPipelineService {
  static async placeOrder(
    userId: string,
    payload: PlaceOrder,
    options: { force?: boolean; isClosingOrder?: boolean } = {}
  ) {
    const startMs = performance.now();
    let marginMs = 0;
    let executionMs = 0;

    payload.idempotencyKey = payload.idempotencyKey ?? crypto.randomUUID();

    const validation = await OrderValidatorService.validate(userId, payload, options);

    await OrderRiskService.validateTradingSafety(userId, payload, validation.instrument, {
      isForcedRiskFlow: validation.isForcedRiskFlow,
      isClosingOrder: options.isClosingOrder,
      stageAfterHours: validation.stageAfterHours,
    });

    await OrderRiskService.checkRiskLimits(userId, payload, validation.instrument, {
      isClosingOrder: options.isClosingOrder,
      stageAfterHours: validation.stageAfterHours,
    });

    if (validation.stageAfterHours) {
      logger.warn(
        {
          event: "ORDER_STAGED_AFTER_HOURS",
          userId,
          instrumentToken: validation.instrument.instrumentToken,
          orderType: payload.orderType,
        },
        "ORDER_STAGED_AFTER_HOURS"
      );
    }

    const marginStartMs = performance.now();
    const requiredMargin = await MarginReservationService.calculateMargin(userId, payload, validation.instrument, options);
    marginMs = performance.now() - marginStartMs;

    if (!options.isClosingOrder) {
      logger.info(
        { userId, symbol: payload.symbol, requiredMargin },
        "Margin calculated"
      );
    } else {
      logger.info({ userId, symbol: payload.symbol }, "Closing order — skipping margin check");
    }

    // Pass the required margin to creation
    const order = await OrderRepositoryService.createOrder(
      userId,
      payload,
      validation.instrument,
      requiredMargin,
      { isClosingOrder: options.isClosingOrder }
    );

    const executionStartMs = performance.now();
    await OrderExecutorService.maybeExecute(order, payload, validation, options);
    executionMs = performance.now() - executionStartMs;

    const totalMs = performance.now() - startMs;
    const metricPayload = {
      event: "ORDER_PATH_TIMING",
      userId,
      orderId: order.id,
      instrumentToken: validation.instrument.instrumentToken,
      order_validation_ms: Number(validation.validationMs.toFixed(2)),
      margin_ms: Number(marginMs.toFixed(2)),
      ledger_ms: 0,
      execution_ms: Number(executionMs.toFixed(2)),
      total_ms: Number(totalMs.toFixed(2)),
    };
    if (totalMs > 500) {
      logger.error(metricPayload, "ORDER_PATH_TIMING");
    } else if (totalMs > 250) {
      logger.warn(metricPayload, "ORDER_PATH_TIMING");
    } else {
      logger.info(metricPayload, "ORDER_PATH_TIMING");
    }

    return order;
  }
}


