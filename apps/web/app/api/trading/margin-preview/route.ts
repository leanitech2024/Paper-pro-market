import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { MarginCalculatorService } from "@/domains/trading/server/margin/margin-calculator.service";
import { instrumentStore } from "@/domains/market/stores/instrument.store";
import { requireInstrumentTokenForIdentityLookup } from "@/domains/trading/lib/token-identity-guard";

const MarginPreviewSchema = z.object({
  instrumentToken: z.string().min(1),
  symbol: z.string().min(1),
  side: z.enum(["BUY", "SELL"]),
  quantity: z.number().int().positive(),
  orderType: z.enum(["LIMIT", "MARKET", "SL", "SL-M"]),
  limitPrice: z.number().optional(),
  productType: z.enum(["CNC", "MIS"]).optional().default("CNC"),
  leverage: z.number().int().positive().optional().default(1),
  stopLossPrice: z.number().optional(),
  targetPrice: z.number().optional()
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await req.json();
    const result = MarginPreviewSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request payload", code: "VALIDATION_FAILED" },
        { status: 400 }
      );
    }

    const payload = result.data;

    await instrumentStore.initialize();
    if (!instrumentStore.isReady()) {
      return NextResponse.json(
        { error: "System not ready", code: "SYSTEM_NOT_READY" },
        { status: 503 }
      );
    }

    const token = requireInstrumentTokenForIdentityLookup({
      context: "MarginPreview",
      instrumentToken: payload.instrumentToken,
      symbol: payload.symbol,
    });

    const instrument = instrumentStore.getByToken(token);
    if (!instrument) {
      return NextResponse.json(
        { error: "Instrument not found", code: "INSTRUMENT_NOT_FOUND" },
        { status: 404 }
      );
    }

    // Force PlaceOrder type compliance
    const orderPayload = {
        ...payload,
        limitPrice: payload.limitPrice?.toString(),
        stopLossPrice: payload.stopLossPrice?.toString(),
        targetPrice: payload.targetPrice?.toString()
    };

    const requiredMargin = await MarginCalculatorService.calculateRequiredMargin(orderPayload as any, instrument);

    return NextResponse.json({ requiredMargin });
  } catch (err) {
    logger.error({ err: err }, "Failed to calculate margin preview");
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}


