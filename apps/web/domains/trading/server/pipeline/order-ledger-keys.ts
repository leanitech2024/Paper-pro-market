import type { LedgerReferenceType } from "@paper-market/core";
import type { orders } from "@paper-market/core/db";

type OrderLike = Pick<
  typeof orders.$inferSelect,
  "id" | "exitReason" | "rejectionReason"
>;

export function resolveLedgerReferenceType(order: OrderLike): LedgerReferenceType {
  if (order.rejectionReason === "FORCED_LIQUIDATION") return "LIQUIDATION";
  if (order.exitReason === "EXPIRY") return "EXPIRY";
  return "TRADE";
}

export function buildLedgerIdempotencyKey(order: OrderLike, leg: string): string {
  const prefix = resolveLedgerReferenceType(order);
  const normalizedLeg = String(leg || "").trim().toUpperCase();
  return `${prefix}-${order.id}-${normalizedLeg}`;
}
