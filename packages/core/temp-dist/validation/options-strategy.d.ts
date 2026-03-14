import { z } from "zod";
export declare const OptionStrategyTypeEnum: z.ZodEnum<["STRADDLE", "STRANGLE", "IRON_CONDOR", "BULL_CALL_SPREAD", "BEAR_PUT_SPREAD"]>;
export declare const OptionStrategyPreviewSchema: z.ZodDiscriminatedUnion<"strategy", [z.ZodObject<{
    underlying: z.ZodEffects<z.ZodString, string, string>;
    expiry: z.ZodString;
    lots: z.ZodNumber;
} & {
    strategy: z.ZodLiteral<"STRADDLE">;
    strikes: z.ZodObject<{
        centerStrike: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        centerStrike: number;
    }, {
        centerStrike: number;
    }>;
}, "strip", z.ZodTypeAny, {
    underlying: string;
    expiry: string;
    strategy: "STRADDLE";
    lots: number;
    strikes: {
        centerStrike: number;
    };
}, {
    underlying: string;
    expiry: string;
    strategy: "STRADDLE";
    lots: number;
    strikes: {
        centerStrike: number;
    };
}>, z.ZodObject<{
    underlying: z.ZodEffects<z.ZodString, string, string>;
    expiry: z.ZodString;
    lots: z.ZodNumber;
} & {
    strategy: z.ZodLiteral<"STRANGLE">;
    strikes: z.ZodEffects<z.ZodObject<{
        putStrike: z.ZodNumber;
        callStrike: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        putStrike: number;
        callStrike: number;
    }, {
        putStrike: number;
        callStrike: number;
    }>, {
        putStrike: number;
        callStrike: number;
    }, {
        putStrike: number;
        callStrike: number;
    }>;
}, "strip", z.ZodTypeAny, {
    underlying: string;
    expiry: string;
    strategy: "STRANGLE";
    lots: number;
    strikes: {
        putStrike: number;
        callStrike: number;
    };
}, {
    underlying: string;
    expiry: string;
    strategy: "STRANGLE";
    lots: number;
    strikes: {
        putStrike: number;
        callStrike: number;
    };
}>, z.ZodObject<{
    underlying: z.ZodEffects<z.ZodString, string, string>;
    expiry: z.ZodString;
    lots: z.ZodNumber;
} & {
    strategy: z.ZodLiteral<"IRON_CONDOR">;
    strikes: z.ZodEffects<z.ZodObject<{
        putLongStrike: z.ZodNumber;
        putShortStrike: z.ZodNumber;
        callShortStrike: z.ZodNumber;
        callLongStrike: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        putLongStrike: number;
        putShortStrike: number;
        callShortStrike: number;
        callLongStrike: number;
    }, {
        putLongStrike: number;
        putShortStrike: number;
        callShortStrike: number;
        callLongStrike: number;
    }>, {
        putLongStrike: number;
        putShortStrike: number;
        callShortStrike: number;
        callLongStrike: number;
    }, {
        putLongStrike: number;
        putShortStrike: number;
        callShortStrike: number;
        callLongStrike: number;
    }>;
}, "strip", z.ZodTypeAny, {
    underlying: string;
    expiry: string;
    strategy: "IRON_CONDOR";
    lots: number;
    strikes: {
        putLongStrike: number;
        putShortStrike: number;
        callShortStrike: number;
        callLongStrike: number;
    };
}, {
    underlying: string;
    expiry: string;
    strategy: "IRON_CONDOR";
    lots: number;
    strikes: {
        putLongStrike: number;
        putShortStrike: number;
        callShortStrike: number;
        callLongStrike: number;
    };
}>, z.ZodObject<{
    underlying: z.ZodEffects<z.ZodString, string, string>;
    expiry: z.ZodString;
    lots: z.ZodNumber;
} & {
    strategy: z.ZodLiteral<"BULL_CALL_SPREAD">;
    strikes: z.ZodEffects<z.ZodObject<{
        longCallStrike: z.ZodNumber;
        shortCallStrike: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        longCallStrike: number;
        shortCallStrike: number;
    }, {
        longCallStrike: number;
        shortCallStrike: number;
    }>, {
        longCallStrike: number;
        shortCallStrike: number;
    }, {
        longCallStrike: number;
        shortCallStrike: number;
    }>;
}, "strip", z.ZodTypeAny, {
    underlying: string;
    expiry: string;
    strategy: "BULL_CALL_SPREAD";
    lots: number;
    strikes: {
        longCallStrike: number;
        shortCallStrike: number;
    };
}, {
    underlying: string;
    expiry: string;
    strategy: "BULL_CALL_SPREAD";
    lots: number;
    strikes: {
        longCallStrike: number;
        shortCallStrike: number;
    };
}>, z.ZodObject<{
    underlying: z.ZodEffects<z.ZodString, string, string>;
    expiry: z.ZodString;
    lots: z.ZodNumber;
} & {
    strategy: z.ZodLiteral<"BEAR_PUT_SPREAD">;
    strikes: z.ZodEffects<z.ZodObject<{
        longPutStrike: z.ZodNumber;
        shortPutStrike: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        longPutStrike: number;
        shortPutStrike: number;
    }, {
        longPutStrike: number;
        shortPutStrike: number;
    }>, {
        longPutStrike: number;
        shortPutStrike: number;
    }, {
        longPutStrike: number;
        shortPutStrike: number;
    }>;
}, "strip", z.ZodTypeAny, {
    underlying: string;
    expiry: string;
    strategy: "BEAR_PUT_SPREAD";
    lots: number;
    strikes: {
        longPutStrike: number;
        shortPutStrike: number;
    };
}, {
    underlying: string;
    expiry: string;
    strategy: "BEAR_PUT_SPREAD";
    lots: number;
    strikes: {
        longPutStrike: number;
        shortPutStrike: number;
    };
}>]>;
export declare const OptionStrategyExecuteSchema: z.ZodIntersection<z.ZodDiscriminatedUnion<"strategy", [z.ZodObject<{
    underlying: z.ZodEffects<z.ZodString, string, string>;
    expiry: z.ZodString;
    lots: z.ZodNumber;
} & {
    strategy: z.ZodLiteral<"STRADDLE">;
    strikes: z.ZodObject<{
        centerStrike: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        centerStrike: number;
    }, {
        centerStrike: number;
    }>;
}, "strip", z.ZodTypeAny, {
    underlying: string;
    expiry: string;
    strategy: "STRADDLE";
    lots: number;
    strikes: {
        centerStrike: number;
    };
}, {
    underlying: string;
    expiry: string;
    strategy: "STRADDLE";
    lots: number;
    strikes: {
        centerStrike: number;
    };
}>, z.ZodObject<{
    underlying: z.ZodEffects<z.ZodString, string, string>;
    expiry: z.ZodString;
    lots: z.ZodNumber;
} & {
    strategy: z.ZodLiteral<"STRANGLE">;
    strikes: z.ZodEffects<z.ZodObject<{
        putStrike: z.ZodNumber;
        callStrike: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        putStrike: number;
        callStrike: number;
    }, {
        putStrike: number;
        callStrike: number;
    }>, {
        putStrike: number;
        callStrike: number;
    }, {
        putStrike: number;
        callStrike: number;
    }>;
}, "strip", z.ZodTypeAny, {
    underlying: string;
    expiry: string;
    strategy: "STRANGLE";
    lots: number;
    strikes: {
        putStrike: number;
        callStrike: number;
    };
}, {
    underlying: string;
    expiry: string;
    strategy: "STRANGLE";
    lots: number;
    strikes: {
        putStrike: number;
        callStrike: number;
    };
}>, z.ZodObject<{
    underlying: z.ZodEffects<z.ZodString, string, string>;
    expiry: z.ZodString;
    lots: z.ZodNumber;
} & {
    strategy: z.ZodLiteral<"IRON_CONDOR">;
    strikes: z.ZodEffects<z.ZodObject<{
        putLongStrike: z.ZodNumber;
        putShortStrike: z.ZodNumber;
        callShortStrike: z.ZodNumber;
        callLongStrike: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        putLongStrike: number;
        putShortStrike: number;
        callShortStrike: number;
        callLongStrike: number;
    }, {
        putLongStrike: number;
        putShortStrike: number;
        callShortStrike: number;
        callLongStrike: number;
    }>, {
        putLongStrike: number;
        putShortStrike: number;
        callShortStrike: number;
        callLongStrike: number;
    }, {
        putLongStrike: number;
        putShortStrike: number;
        callShortStrike: number;
        callLongStrike: number;
    }>;
}, "strip", z.ZodTypeAny, {
    underlying: string;
    expiry: string;
    strategy: "IRON_CONDOR";
    lots: number;
    strikes: {
        putLongStrike: number;
        putShortStrike: number;
        callShortStrike: number;
        callLongStrike: number;
    };
}, {
    underlying: string;
    expiry: string;
    strategy: "IRON_CONDOR";
    lots: number;
    strikes: {
        putLongStrike: number;
        putShortStrike: number;
        callShortStrike: number;
        callLongStrike: number;
    };
}>, z.ZodObject<{
    underlying: z.ZodEffects<z.ZodString, string, string>;
    expiry: z.ZodString;
    lots: z.ZodNumber;
} & {
    strategy: z.ZodLiteral<"BULL_CALL_SPREAD">;
    strikes: z.ZodEffects<z.ZodObject<{
        longCallStrike: z.ZodNumber;
        shortCallStrike: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        longCallStrike: number;
        shortCallStrike: number;
    }, {
        longCallStrike: number;
        shortCallStrike: number;
    }>, {
        longCallStrike: number;
        shortCallStrike: number;
    }, {
        longCallStrike: number;
        shortCallStrike: number;
    }>;
}, "strip", z.ZodTypeAny, {
    underlying: string;
    expiry: string;
    strategy: "BULL_CALL_SPREAD";
    lots: number;
    strikes: {
        longCallStrike: number;
        shortCallStrike: number;
    };
}, {
    underlying: string;
    expiry: string;
    strategy: "BULL_CALL_SPREAD";
    lots: number;
    strikes: {
        longCallStrike: number;
        shortCallStrike: number;
    };
}>, z.ZodObject<{
    underlying: z.ZodEffects<z.ZodString, string, string>;
    expiry: z.ZodString;
    lots: z.ZodNumber;
} & {
    strategy: z.ZodLiteral<"BEAR_PUT_SPREAD">;
    strikes: z.ZodEffects<z.ZodObject<{
        longPutStrike: z.ZodNumber;
        shortPutStrike: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        longPutStrike: number;
        shortPutStrike: number;
    }, {
        longPutStrike: number;
        shortPutStrike: number;
    }>, {
        longPutStrike: number;
        shortPutStrike: number;
    }, {
        longPutStrike: number;
        shortPutStrike: number;
    }>;
}, "strip", z.ZodTypeAny, {
    underlying: string;
    expiry: string;
    strategy: "BEAR_PUT_SPREAD";
    lots: number;
    strikes: {
        longPutStrike: number;
        shortPutStrike: number;
    };
}, {
    underlying: string;
    expiry: string;
    strategy: "BEAR_PUT_SPREAD";
    lots: number;
    strikes: {
        longPutStrike: number;
        shortPutStrike: number;
    };
}>]>, z.ZodObject<{
    clientOrderKey: z.ZodString;
}, "strip", z.ZodTypeAny, {
    clientOrderKey: string;
}, {
    clientOrderKey: string;
}>>;
export type OptionStrategyPreviewInput = z.infer<typeof OptionStrategyPreviewSchema>;
export type OptionStrategyExecuteInput = z.infer<typeof OptionStrategyExecuteSchema>;
export type OptionStrategyType = z.infer<typeof OptionStrategyTypeEnum>;
//# sourceMappingURL=options-strategy.d.ts.map