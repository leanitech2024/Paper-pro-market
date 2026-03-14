import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { marketSimulation } from "@/services/market/feeds/market-simulation.service";
import { handleError, ApiError } from "@/lib/errors";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ symbol: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            throw new ApiError("Unauthorized", 401, "UNAUTHORIZED");
        }

        const { symbol } = await params;
        const quote = marketSimulation.getQuote(symbol);

        if (!quote) {
            throw new ApiError("Quote not found", 404, "NOT_FOUND");
        }

        return NextResponse.json({
            success: true,
            data: quote,
        });
    } catch (error) {
        return handleError(error);
    }
}
