import { z } from "zod";
/**
 * Validation schemas for wallet operations
 * Following backend-dev SKILL.md: All inputs MUST be validated with Zod
 */
export declare const CheckMarginSchema: z.ZodObject<{
    userId: z.ZodString;
    requiredAmount: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    userId: string;
    requiredAmount: number;
}, {
    userId: string;
    requiredAmount: number;
}>;
export declare const BlockFundsSchema: z.ZodObject<{
    userId: z.ZodString;
    amount: z.ZodNumber;
    orderId: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    userId: string;
    orderId: string;
    amount: number;
    description?: string | undefined;
}, {
    userId: string;
    orderId: string;
    amount: number;
    description?: string | undefined;
}>;
export declare const UnblockFundsSchema: z.ZodObject<{
    userId: z.ZodString;
    amount: z.ZodNumber;
    orderId: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    userId: string;
    orderId: string;
    amount: number;
    description?: string | undefined;
}, {
    userId: string;
    orderId: string;
    amount: number;
    description?: string | undefined;
}>;
export declare const SettleTradeSchema: z.ZodObject<{
    userId: z.ZodString;
    amount: z.ZodNumber;
    tradeId: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    userId: string;
    amount: number;
    tradeId: string;
    description?: string | undefined;
}, {
    userId: string;
    amount: number;
    tradeId: string;
    description?: string | undefined;
}>;
export declare const CreditBalanceSchema: z.ZodObject<{
    userId: z.ZodString;
    amount: z.ZodNumber;
    referenceType: z.ZodEnum<["ORDER", "TRADE", "POSITION"]>;
    referenceId: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    userId: string;
    amount: number;
    referenceType: "TRADE" | "ORDER" | "POSITION";
    referenceId: string;
    description?: string | undefined;
}, {
    userId: string;
    amount: number;
    referenceType: "TRADE" | "ORDER" | "POSITION";
    referenceId: string;
    description?: string | undefined;
}>;
export declare const DebitBalanceSchema: z.ZodObject<{
    userId: z.ZodString;
    amount: z.ZodNumber;
    referenceType: z.ZodEnum<["ORDER", "TRADE", "POSITION", "FEE"]>;
    referenceId: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    userId: string;
    amount: number;
    referenceType: "TRADE" | "ORDER" | "POSITION" | "FEE";
    referenceId?: string | undefined;
    description?: string | undefined;
}, {
    userId: string;
    amount: number;
    referenceType: "TRADE" | "ORDER" | "POSITION" | "FEE";
    referenceId?: string | undefined;
    description?: string | undefined;
}>;
export declare const TransactionQuerySchema: z.ZodObject<{
    userId: z.ZodString;
    type: z.ZodOptional<z.ZodEnum<["CREDIT", "DEBIT", "BLOCK", "UNBLOCK", "SETTLEMENT"]>>;
    referenceType: z.ZodOptional<z.ZodEnum<["ORDER", "TRADE", "POSITION"]>>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    page: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    userId: string;
    limit: number;
    page: number;
    type?: "CREDIT" | "DEBIT" | "BLOCK" | "UNBLOCK" | "SETTLEMENT" | undefined;
    referenceType?: "TRADE" | "ORDER" | "POSITION" | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}, {
    userId: string;
    type?: "CREDIT" | "DEBIT" | "BLOCK" | "UNBLOCK" | "SETTLEMENT" | undefined;
    referenceType?: "TRADE" | "ORDER" | "POSITION" | undefined;
    limit?: number | undefined;
    page?: number | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}>;
export type CheckMargin = z.infer<typeof CheckMarginSchema>;
export type BlockFunds = z.infer<typeof BlockFundsSchema>;
export type UnblockFunds = z.infer<typeof UnblockFundsSchema>;
export type SettleTrade = z.infer<typeof SettleTradeSchema>;
export type CreditBalance = z.infer<typeof CreditBalanceSchema>;
export type DebitBalance = z.infer<typeof DebitBalanceSchema>;
export type TransactionQuery = z.infer<typeof TransactionQuerySchema>;
//# sourceMappingURL=wallet.d.ts.map