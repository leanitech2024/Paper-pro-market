import { z } from "zod";
export declare const PlaceOrderSchema: z.ZodDiscriminatedUnion<"orderType", [z.ZodObject<{
    symbol: z.ZodEffects<z.ZodString, string, string>;
    instrumentToken: z.ZodString;
    side: z.ZodEnum<["BUY", "SELL"]>;
    quantity: z.ZodNumber;
    productType: z.ZodDefault<z.ZodEnum<["CNC", "MIS"]>>;
    leverage: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    stopLossPrice: z.ZodOptional<z.ZodNumber>;
    targetPrice: z.ZodOptional<z.ZodNumber>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
    exitReason: z.ZodOptional<z.ZodEnum<["MANUAL", "STOP_LOSS", "TARGET", "EXPIRY", "SQUARE_OFF"]>>;
    settlementPrice: z.ZodOptional<z.ZodNumber>;
} & {
    orderType: z.ZodLiteral<"MARKET">;
}, "strip", z.ZodTypeAny, {
    symbol: string;
    instrumentToken: string;
    side: "BUY" | "SELL";
    quantity: number;
    orderType: "MARKET";
    productType: "CNC" | "MIS";
    leverage?: number | undefined;
    stopLossPrice?: number | undefined;
    targetPrice?: number | undefined;
    exitReason?: "STOP_LOSS" | "TARGET" | "EXPIRY" | "MANUAL" | "SQUARE_OFF" | undefined;
    idempotencyKey?: string | undefined;
    settlementPrice?: number | undefined;
}, {
    symbol: string;
    instrumentToken: string;
    side: "BUY" | "SELL";
    quantity: number;
    orderType: "MARKET";
    productType?: "CNC" | "MIS" | undefined;
    leverage?: number | undefined;
    stopLossPrice?: number | undefined;
    targetPrice?: number | undefined;
    exitReason?: "STOP_LOSS" | "TARGET" | "EXPIRY" | "MANUAL" | "SQUARE_OFF" | undefined;
    idempotencyKey?: string | undefined;
    settlementPrice?: number | undefined;
}>, z.ZodObject<{
    symbol: z.ZodEffects<z.ZodString, string, string>;
    instrumentToken: z.ZodString;
    side: z.ZodEnum<["BUY", "SELL"]>;
    quantity: z.ZodNumber;
    productType: z.ZodDefault<z.ZodEnum<["CNC", "MIS"]>>;
    leverage: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    stopLossPrice: z.ZodOptional<z.ZodNumber>;
    targetPrice: z.ZodOptional<z.ZodNumber>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
    exitReason: z.ZodOptional<z.ZodEnum<["MANUAL", "STOP_LOSS", "TARGET", "EXPIRY", "SQUARE_OFF"]>>;
    settlementPrice: z.ZodOptional<z.ZodNumber>;
} & {
    orderType: z.ZodLiteral<"LIMIT">;
    limitPrice: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    symbol: string;
    instrumentToken: string;
    side: "BUY" | "SELL";
    quantity: number;
    orderType: "LIMIT";
    limitPrice: number;
    productType: "CNC" | "MIS";
    leverage?: number | undefined;
    stopLossPrice?: number | undefined;
    targetPrice?: number | undefined;
    exitReason?: "STOP_LOSS" | "TARGET" | "EXPIRY" | "MANUAL" | "SQUARE_OFF" | undefined;
    idempotencyKey?: string | undefined;
    settlementPrice?: number | undefined;
}, {
    symbol: string;
    instrumentToken: string;
    side: "BUY" | "SELL";
    quantity: number;
    orderType: "LIMIT";
    limitPrice: number;
    productType?: "CNC" | "MIS" | undefined;
    leverage?: number | undefined;
    stopLossPrice?: number | undefined;
    targetPrice?: number | undefined;
    exitReason?: "STOP_LOSS" | "TARGET" | "EXPIRY" | "MANUAL" | "SQUARE_OFF" | undefined;
    idempotencyKey?: string | undefined;
    settlementPrice?: number | undefined;
}>]>;
export type PlaceOrder = z.infer<typeof PlaceOrderSchema>;
export declare const CancelOrderSchema: z.ZodObject<{
    orderId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    orderId: string;
}, {
    orderId: string;
}>;
export type CancelOrder = z.infer<typeof CancelOrderSchema>;
export declare const OrderQuerySchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["PENDING", "OPEN", "FILLED", "CANCELLED", "REJECTED"]>>;
    symbol: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    limit: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    page: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    cursor: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    symbol?: string | undefined;
    status?: "PENDING" | "OPEN" | "FILLED" | "CANCELLED" | "REJECTED" | undefined;
    limit?: number | undefined;
    page?: number | undefined;
    cursor?: string | undefined;
}, {
    symbol?: string | undefined;
    status?: "PENDING" | "OPEN" | "FILLED" | "CANCELLED" | "REJECTED" | undefined;
    limit?: number | undefined;
    page?: number | undefined;
    cursor?: string | undefined;
}>;
export type OrderQuery = z.infer<typeof OrderQuerySchema>;
//# sourceMappingURL=oms.d.ts.map