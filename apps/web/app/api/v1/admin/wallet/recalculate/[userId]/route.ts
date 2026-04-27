import { NextResponse } from "next/server";
import { WalletService } from "@/domains/platform/server/accounting/wallet/wallet.service";
import { handleError } from "@/lib/errors";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { z } from "zod";

/**
 * POST /api/v1/admin/wallet/recalculate/[userId]
 * Recalculate wallet balance from transaction ledger (admin recovery tool)
 * 
 * ADMIN ONLY - Use when wallet cache is suspected to be inconsistent
 */
export async function POST(
    req: Request,
    { params }: { params: Promise<{ userId: string }> }
) {
    const { userId } = await params;
    try {
        // 1. Authenticate admin user
        const session = await auth();
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const role = typeof (session.user as any)?.role === "string" ? String((session.user as any).role) : "";
        if (role.toLowerCase() !== "admin") {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const BodySchema = z.object({
            reason: z.string().max(200).optional(),
        });
        const body = await req.json().catch(() => ({}));
        const validatedBody = BodySchema.parse(body);

        const targetUserId = userId;

        logger.info(
            { actorUserId: session.user.id, targetUserId, reason: validatedBody.reason },
            "Admin wallet recalculation triggered"
        );

        // 2. Call service to recalculate
        await WalletService.recalculateFromLedger(targetUserId);

        // 3. Get updated wallet
        const wallet = await WalletService.getWallet(targetUserId);

        // 4. Return result
        return NextResponse.json({
            success: true,
            data: {
                userId: targetUserId,
                balance: parseFloat(wallet.balance),
                blockedBalance: parseFloat(wallet.blockedBalance),
                lastReconciled: wallet.lastReconciled,
                message: "Wallet recalculated successfully from ledger",
            },
        });

    } catch (err) {
        return handleError(err);
    }
}
