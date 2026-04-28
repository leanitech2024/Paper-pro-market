import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { OrderService } from "@/domains/trading/server/order/order.service";
import { handleError, ApiError } from "@/lib/errors";
import { PlaceOrderSchema, OrderQuerySchema } from "@paper-market/core";
import { requireActiveSubscription } from "@/lib/subscription.guard";
import { logger } from "@/lib/logger";

/**
 * Place a new order.
 */
export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            logger.warn("Order Route: No Session ID found");
            throw new ApiError("Unauthorized", 401, "UNAUTHORIZED");
        }

        const hasActiveSubscription = await requireActiveSubscription(session.user.id);
        if (!hasActiveSubscription) {
            return NextResponse.json(
                { error: 'Subscription expired', code: 'SUBSCRIPTION_EXPIRED' },
                { status: 403 }
            );
        }

        const body = await req.json();
        const validated = PlaceOrderSchema.parse(body);

        const order = await OrderService.placeOrder(session.user.id, validated);

        return NextResponse.json({
            success: true,
            data: order,
        }, { status: 201 });
    } catch (err) {
        return handleError(err);
    }
}

/**
 * Get orders for the authenticated user.
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
        const filters = OrderQuerySchema.parse({
            status: searchParams.get("status") || undefined,
            symbol: searchParams.get("symbol") || undefined,
            limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined,
            page: searchParams.get("page") ? parseInt(searchParams.get("page")!) : undefined,
        });

        const orders = await OrderService.getOrders(session.user.id, filters);

        return NextResponse.json({
            success: true,
            data: orders,
        });
    } catch (err) {
        return handleError(err);
    }
}

