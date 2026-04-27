import { NextRequest, NextResponse } from "next/server";
import { realTimeMarketService } from "@/domains/market/server/feeds/realtime-market.service";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { z } from "zod";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const role = typeof (session.user as { role?: string })?.role === "string"
    ? String((session.user as { role?: string }).role)
    : "";
  if (role.toLowerCase() !== "admin") {
    return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  const BodySchema = z.object({
    action: z.enum(["start", "stop"]),
    symbols: z.array(z.string()).max(50).optional(),
  });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body", code: "INVALID_BODY" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", code: "VALIDATION_ERROR" }, { status: 400 });
  }
  const { action, symbols } = parsed.data;

  try {
    if (action === "start") {
      const defaultSymbols = ["RELIANCE", "SBIN", "INFY", "TCS", "HDFCBANK"];
      const subs = symbols ?? defaultSymbols;
      await realTimeMarketService.subscribe(subs);
      return NextResponse.json({
        status: "started",
        message: `Stream started for ${subs.join(", ")}`,
      });
    }

    if (action === "stop") {
      if (!symbols || symbols.length === 0) {
        return NextResponse.json({ error: "symbols array required", code: "MISSING_SYMBOLS" }, { status: 400 });
      }
      await realTimeMarketService.unsubscribe(symbols);
      return NextResponse.json({
        status: "stopped",
        message: `Stream stopped for ${symbols.join(", ")}`,
      });
    }

    return NextResponse.json({ error: "Invalid action", code: "INVALID_ACTION" }, { status: 400 });
  } catch (err) {
    logger.error({ err: err }, "Admin stream control failed");
    return NextResponse.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
