import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { TradeService } from "@/services/trading/execution/trade.service";
import { handleError, ApiError } from "@/lib/errors";

/**
 * GET /api/v1/trades
 * Returns paginated trades for the authenticated user.
 * Query params: limit (number), page (1-indexed)
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

        const searchParams = req.nextUrl.searchParams;
        const limitParam = searchParams.get("limit");
        const pageParam = searchParams.get("page");

        const limit = limitParam ? Math.max(1, parseInt(limitParam, 10)) : undefined;
        const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;
        const offset = limit !== undefined ? (page - 1) * limit : 0;

        const result = await TradeService.getUserTrades(session.user.id, { limit, offset });

        return NextResponse.json({
            success: true,
            data: result.data,
            meta: {
                total: result.total,
                hasMore: result.hasMore,
                page,
                limit,
            },
        });
    } catch (error) {
        return handleError(error);
    }
}
