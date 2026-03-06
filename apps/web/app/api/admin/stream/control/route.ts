
import { NextRequest, NextResponse } from "next/server";
import { realTimeMarketService } from "@/services/realtime-market.service";
import { auth } from "@/lib/auth";
import { z } from "zod";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) { // Allow any logged in user for now, ideally admin only
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = typeof (session.user as any)?.role === "string" ? String((session.user as any).role) : "";
  if (role.toLowerCase() !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const BodySchema = z.object({
    action: z.enum(["start", "stop"]),
    symbols: z.array(z.string()).max(50).optional(),
  });

  const body = await req.json();
  const { action, symbols } = BodySchema.parse(body);

  try {
      if (action === "start") {
          const defaultSymbols = ["RELIANCE", "SBIN", "INFY", "TCS", "HDFCBANK"];
          const subs = symbols || defaultSymbols;
          
          await realTimeMarketService.subscribe(subs);
          
          return NextResponse.json({ 
              status: "started", 
              message: `Stream started for ${subs.join(", ")}` 
          });
      }

      if (action === "stop") {
          if (!symbols || symbols.length === 0) {
              return NextResponse.json({ error: "symbols array required" }, { status: 400 });
          }

          await realTimeMarketService.unsubscribe(symbols);
          return NextResponse.json({
              status: "stopped",
              message: `Stream stopped for ${symbols.join(", ")}`,
          });
      }
      
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
