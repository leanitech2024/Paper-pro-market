import { z } from "zod";
export declare const InstrumentSearchSchema: z.ZodObject<{
    q: z.ZodEffects<z.ZodString, string, string>;
}, "strip", z.ZodTypeAny, {
    q: string;
}, {
    q: string;
}>;
export type InstrumentSearch = z.infer<typeof InstrumentSearchSchema>;
export declare const InstrumentLookupSchema: z.ZodObject<{
    tradingsymbol: z.ZodEffects<z.ZodString, string, string>;
}, "strip", z.ZodTypeAny, {
    tradingsymbol: string;
}, {
    tradingsymbol: string;
}>;
export type InstrumentLookup = z.infer<typeof InstrumentLookupSchema>;
export declare const InstrumentFilterSchema: z.ZodEffects<z.ZodObject<{
    segment: z.ZodOptional<z.ZodEnum<["NSE_EQ", "NSE_FO", "BSE_EQ", "MCX_FO"]>>;
    exchange: z.ZodOptional<z.ZodEnum<["NSE", "BSE", "MCX"]>>;
    instrument_type: z.ZodOptional<z.ZodEnum<["EQUITY", "FUTURE", "OPTION", "INDEX"]>>;
    expiry_from: z.ZodOptional<z.ZodString>;
    expiry_to: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    segment?: "NSE_EQ" | "NSE_FO" | "BSE_EQ" | "MCX_FO" | undefined;
    exchange?: "NSE" | "BSE" | "MCX" | undefined;
    instrument_type?: "EQUITY" | "FUTURE" | "OPTION" | "INDEX" | undefined;
    expiry_from?: string | undefined;
    expiry_to?: string | undefined;
}, {
    segment?: "NSE_EQ" | "NSE_FO" | "BSE_EQ" | "MCX_FO" | undefined;
    exchange?: "NSE" | "BSE" | "MCX" | undefined;
    instrument_type?: "EQUITY" | "FUTURE" | "OPTION" | "INDEX" | undefined;
    expiry_from?: string | undefined;
    expiry_to?: string | undefined;
}>, {
    segment?: "NSE_EQ" | "NSE_FO" | "BSE_EQ" | "MCX_FO" | undefined;
    exchange?: "NSE" | "BSE" | "MCX" | undefined;
    instrument_type?: "EQUITY" | "FUTURE" | "OPTION" | "INDEX" | undefined;
    expiry_from?: string | undefined;
    expiry_to?: string | undefined;
}, {
    segment?: "NSE_EQ" | "NSE_FO" | "BSE_EQ" | "MCX_FO" | undefined;
    exchange?: "NSE" | "BSE" | "MCX" | undefined;
    instrument_type?: "EQUITY" | "FUTURE" | "OPTION" | "INDEX" | undefined;
    expiry_from?: string | undefined;
    expiry_to?: string | undefined;
}>;
export type InstrumentFilter = z.infer<typeof InstrumentFilterSchema>;
export declare const AdminSyncTriggerSchema: z.ZodObject<{
    force: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    force?: boolean | undefined;
}, {
    force?: boolean | undefined;
}>;
export type AdminSyncTrigger = z.infer<typeof AdminSyncTriggerSchema>;
//# sourceMappingURL=instruments.d.ts.map