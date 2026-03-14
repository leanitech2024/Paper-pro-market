import { z } from "zod";
export declare const OptionChainSchema: z.ZodObject<{
    symbol: z.ZodString;
    expiry: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    symbol: string;
    expiry?: string | undefined;
}, {
    symbol: string;
    expiry?: string | undefined;
}>;
export type OptionChainInput = z.infer<typeof OptionChainSchema>;
//# sourceMappingURL=option-chain.d.ts.map