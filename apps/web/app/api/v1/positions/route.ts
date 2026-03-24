import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { PositionService } from "@/services/trading/positions/position.service";
import { OrderExecutorService } from "@/services/trading/execution/order-executor.service";
import { handleError, ApiError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/**
 * Get positions for the authenticated user.
 */
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            throw new ApiError("Unauthorized", 401, "UNAUTHORIZED");
        }

        if (session.user.subscriptionStatus === 'expired' && session.user.role !== 'admin') {
            throw new ApiError("Subscription expired", 403, "FORBIDDEN");
        }

        const paperMode =
            String(process.env.PAPER_TRADING_MODE ?? "true").trim().toLowerCase() !== "false";
        if (paperMode && process.env.NODE_ENV !== "production") {
            try {
                await OrderExecutorService.executeOpenOrders();
            } catch (error) {
                logger.warn({ err: error }, "Auto-execute open orders failed");
            }
        }

        const positions = await PositionService.getUserPositionsWithPnL(session.user.id);

        return NextResponse.json({
            success: true,
            data: positions,
        });
    } catch (error) {
        return handleError(error);
    }
}


