import { NextRequest, NextResponse } from "next/server";
import { OrderExecutorService } from "@/services/trading/execution/order-executor.service";
import { handleError } from "@/lib/errors";
import { auth } from "@/lib/auth";
import { z } from "zod";

/**
 * Manually trigger execution of all OPEN orders.
 * Useful for testing or recovering from execution failures.
 */
export async function POST(req: NextRequest) {
    try {
        if (process.env.NODE_ENV === "production") {
            return NextResponse.json({ error: "Not Found" }, { status: 404 });
        }

        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const role = typeof (session.user as any)?.role === "string" ? String((session.user as any).role) : "";
        if (role.toLowerCase() !== "admin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const BodySchema = z.object({}).passthrough();
        const body = await req.json().catch(() => ({}));
        BodySchema.parse(body);

        const executedCount = await OrderExecutorService.executeOpenOrders();
        
        return NextResponse.json({
            success: true,
            data: {
                executedCount,
                message: `Executed ${executedCount} orders`
            }
        });
    } catch (error) {
        return handleError(error);
    }
}


