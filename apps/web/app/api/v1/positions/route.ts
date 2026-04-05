import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { PositionService } from "@/services/trading/positions/position.service";
import { handleError, ApiError } from "@/lib/errors";

/**
 * Get positions for the authenticated user.
 */
export async function GET(_req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            throw new ApiError("Unauthorized", 401, "UNAUTHORIZED");
        }

        if (session.user.subscriptionStatus === 'expired' && session.user.role !== 'admin') {
            throw new ApiError("Subscription expired", 403, "FORBIDDEN");
        }

        const positions = await PositionService.getUserPositionsWithPnL(session.user.id);

        return NextResponse.json({
            success: true,
            data: positions,
        });
    } catch (err) {
        return handleError(err);
    }
}


