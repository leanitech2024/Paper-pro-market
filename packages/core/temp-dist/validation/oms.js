import { z } from "zod";
// ─── Enums ────────────────────────────────────────────────────────────────────
const OrderSideEnum = z.enum(["BUY", "SELL"]);
const OrderStatusEnum = z.enum(["PENDING", "OPEN", "FILLED", "CANCELLED", "REJECTED"]);
const ExitReasonEnum = z.enum(["MANUAL", "STOP_LOSS", "TARGET", "EXPIRY", "SQUARE_OFF"]);
/**
 * ProductType governs margin and auto-square-off behaviour:
 *   CNC = Cash-and-Carry  → no intraday leverage enforcement, no auto-square-off
 *   MIS = Margin Intraday → leverage applied, position auto-closed at market close
 */
const ProductTypeEnum = z.enum(["CNC", "MIS"]);
// ─── Base schema (shared between MARKET and LIMIT) ────────────────────────────
const BaseOrderSchema = z.object({
    symbol: z
        .string()
        .trim()
        .min(2, "Symbol must be at least 2 characters")
        .max(30, "Symbol cannot exceed 30 characters")
        .transform((val) => val.toUpperCase()),
    instrumentToken: z
        .string()
        .trim()
        .min(3, "Instrument token is required"),
    side: OrderSideEnum,
    quantity: z
        .number()
        .int("Quantity must be an integer")
        .positive("Quantity must be positive"),
    // ── Product type ──────────────────────────────────────────────────────────
    productType: ProductTypeEnum.default("CNC"),
    // ── Leverage ──────────────────────────────────────────────────────────────
    // For MIS orders leverage is meaningful (1–10x).
    // For CNC orders leverage must be 1 (enforced in order-acceptance.service).
    leverage: z
        .number()
        .int("Leverage must be an integer")
        .min(1, "Leverage must be at least 1")
        .max(10, "Leverage cannot exceed 10")
        .default(1)
        .optional(),
    // ── Stop-Loss & Target ───────────────────────────────────────────────────
    // Optional at placement time. When provided the backend will:
    //   1. Store them on the parent order row.
    //   2. Immediately spawn two child OPEN orders (one STOP_LOSS, one TARGET).
    //   3. The SL/Target monitoring engine will fill the child order when LTP
    //      crosses the respective price and cancel the sibling.
    stopLossPrice: z
        .number()
        .positive("Stop-loss price must be positive")
        .optional(),
    targetPrice: z
        .number()
        .positive("Target price must be positive")
        .optional(),
    // ── Other optional fields ─────────────────────────────────────────────────
    idempotencyKey: z
        .string()
        .trim()
        .min(8, "Idempotency key must be at least 8 characters")
        .max(128, "Idempotency key cannot exceed 128 characters")
        .optional(),
    exitReason: ExitReasonEnum.optional(),
    settlementPrice: z
        .number()
        .nonnegative("Settlement price must be non-negative")
        .optional(),
});
// ─── Market order ─────────────────────────────────────────────────────────────
const MarketOrderSchema = BaseOrderSchema.extend({
    orderType: z.literal("MARKET"),
});
// ─── Limit order ─────────────────────────────────────────────────────────────
const LimitOrderSchema = BaseOrderSchema.extend({
    orderType: z.literal("LIMIT"),
    limitPrice: z.number().positive("Limit price must be positive"),
});
// ─── Discriminated union ──────────────────────────────────────────────────────
export const PlaceOrderSchema = z.discriminatedUnion("orderType", [
    MarketOrderSchema,
    LimitOrderSchema,
]);
// ─── Cancel / Query schemas (unchanged) ──────────────────────────────────────
export const CancelOrderSchema = z.object({
    orderId: z.string().uuid("Invalid order ID format"),
});
export const OrderQuerySchema = z.object({
    status: OrderStatusEnum.optional(),
    symbol: z
        .string()
        .trim()
        .transform((val) => val.toUpperCase())
        .optional(),
    limit: z.number().int().positive().max(50).default(20).optional(),
    page: z.number().int().positive().default(1).optional(),
    cursor: z.string().datetime().optional(),
});
