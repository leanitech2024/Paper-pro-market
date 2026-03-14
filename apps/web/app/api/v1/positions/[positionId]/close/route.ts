import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { PositionService } from "@/services/trading/positions/position.service";
import { handleError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { z } from "zod";

/**
 * Close a position (full or partial)
 * POST /api/v1/positions/{positionId}/close
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ positionId: string }> }
) {
    const { positionId } = await params;
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: { message: "Unauthorized" } },
                { status: 401 }
            );
        }

        const body = await req.json();
        const { quantity } = z.object({ 
            quantity: z.number().int().positive().optional() 
        }).parse(body);

        logger.info({ userId: session.user.id, positionId, quantity }, "Closing position");

        // Close position via service
        const result = await PositionService.closePosition(
            session.user.id,
            positionId,
            quantity
        );

        return NextResponse.json({
            success: true,
            data: result,
            message: quantity 
                ? `Partially closed ${quantity} units` 
                : "Position closed successfully"
        });
    } catch (error) {
        return handleError(error);
    }
}
