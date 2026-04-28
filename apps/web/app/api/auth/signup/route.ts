import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@paper-market/core/db";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { SignupSchema } from "@paper-market/core";
import { handleError, ApiError } from "@/lib/errors";
import { WalletService } from "@/domains/platform/server/accounting/wallet/wallet.service";
import { bootstrapUserLedgerState } from "@/domains/platform/server/accounting/ledger/ledger-bootstrap.service";
import { WatchlistService } from "@/domains/market/server/catalog/watchlist.service";
import { SubscriptionService } from "@/domains/platform/server/subscription/subscription.service";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const validated = SignupSchema.parse(body);

        const [existing] = await db
            .select()
            .from(users)
            .where(eq(users.email, validated.email))
            .limit(1);

        if (existing) {
            throw new ApiError("Email already registered", 400, "EMAIL_EXISTS");
        }

        const hashedPassword = await hash(validated.password, 12);

        const [user] = await db
            .insert(users)
            .values({
                name: validated.name,
                email: validated.email,
                password: hashedPassword,
                balance: "1000000.00",
            })
            .returning();

        await db.transaction(async (tx) => {
            await WalletService.getWallet(user.id, tx);
            await bootstrapUserLedgerState(user.id, tx);
            await SubscriptionService.createTrialSubscription(user.id, tx);
        });

        try {
            await WatchlistService.ensureDefaultWatchlist(user.id);
        } catch (err) {
            logger.error({ err, userId: user.id }, "Failed to create default watchlist during signup");
        }

        return NextResponse.json(
            {
                success: true,
                data: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                },
                message: "User created successfully",
            },
            { status: 201 }
        );
    } catch (err) {
        return handleError(err);
    }
}


