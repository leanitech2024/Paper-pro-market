import { NextRequest, NextResponse } from "next/server";
import { OptionChainSchema } from "@paper-market/core";
import { OptionChainService } from "@/services/market/instruments/option-chain.service";
import { handleError, ApiError } from "@/lib/errors";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            throw new ApiError("Unauthorized", 401, "UNAUTHORIZED");
        }

        const { searchParams } = new URL(req.url);

        const input = OptionChainSchema.parse({
            symbol: searchParams.get("symbol") || "",
            expiry: searchParams.get("expiry") || undefined,
        });

        const data = await OptionChainService.getOptionChain(input);

        return NextResponse.json({
            success: true,
            data: data,
        });

    } catch (error) {
        return handleError(error);
    }
}

