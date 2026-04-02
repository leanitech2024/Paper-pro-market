import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eq, inArray, or } from "drizzle-orm";
import { z } from "zod";
import {
    ledgerAccounts,
    ledgerEntries,
    orders,
    positions,
    trades,
    transactions,
    wallets,
    watchlists,
} from "@paper-market/core/db";
import { handleError, ApiError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { WalletService } from "@/services/accounting/wallet/wallet.service";
import { bootstrapLedgerAccounts } from "@/services/accounting/ledger/ledger-bootstrap.service";
import { ledgerCacheService } from "@/services/accounting/ledger/ledger-cache.service";
import { LedgerService } from "@/services/accounting/ledger/ledger.service";
import { mtmEngineService } from "@/services/trading/valuation/mtm-engine.service";
import { WatchlistService } from "@/services/market/catalog/watchlist.service";

const RESET_BALANCE = "10000000.00";

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            throw new ApiError("Unauthorized", 401, "UNAUTHORIZED");
        }

        const userId = session.user.id;
        const role = typeof (session.user as any)?.role === "string" ? String((session.user as any).role) : "";
        if (role.toLowerCase() !== "admin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const BodySchema = z.object({
            reason: z.string().max(200).optional(),
        });
        const body = await req.json().catch(() => ({}));
        const validatedBody = BodySchema.parse(body);

        logger.info(
            { actorUserId: userId, targetUserId: userId, reason: validatedBody.reason },
            "Admin account reset triggered"
        );

        await db.transaction(async (tx) => {
            await tx.delete(trades).where(eq(trades.userId, userId));
            await tx.delete(orders).where(eq(orders.userId, userId));
            await tx.delete(positions).where(eq(positions.userId, userId));
            await tx.delete(watchlists).where(eq(watchlists.userId, userId));
            await tx.delete(transactions).where(eq(transactions.userId, userId));

            const accountRows = await tx
                .select({ id: ledgerAccounts.id })
                .from(ledgerAccounts)
                .where(eq(ledgerAccounts.userId, userId));
            const accountIds = accountRows.map((row) => row.id);

            if (accountIds.length > 0) {
                await tx
                    .delete(ledgerEntries)
                    .where(
                        or(
                            inArray(ledgerEntries.debitAccountId, accountIds),
                            inArray(ledgerEntries.creditAccountId, accountIds)
                        )
                    );
            }

            await tx.delete(ledgerAccounts).where(eq(ledgerAccounts.userId, userId));
            ledgerCacheService.invalidateUser(userId);

            const wallet = await WalletService.getWallet(userId, tx);

            await tx
                .update(wallets)
                .set({
                    balance: RESET_BALANCE,
                    equity: RESET_BALANCE,
                    marginStatus: "NORMAL",
                    accountState: "NORMAL",
                    blockedBalance: "0.00",
                    updatedAt: new Date(),
                })
                .where(eq(wallets.id, wallet.id));

            await tx.insert(transactions).values({
                userId,
                walletId: wallet.id,
                type: "CREDIT",
                amount: RESET_BALANCE,
                balanceBefore: "0.00",
                balanceAfter: RESET_BALANCE,
                blockedBefore: "0.00",
                blockedAfter: "0.00",
                description: "Account reset - initial deposit",
                referenceType: "SYSTEM",
                referenceId: crypto.randomUUID(),
            });

            await bootstrapLedgerAccounts(userId, tx);
            const resetReference = `USER_RESET_${Date.now()}`;
            await LedgerService.recordEntry(
                { userId, accountType: "CASH" },
                { userId, accountType: "REALIZED_PNL" },
                RESET_BALANCE,
                {
                    referenceType: "ADJUSTMENT",
                    referenceId: resetReference,
                    idempotencyKey: `DEPOSIT-${resetReference}-${userId}`,
                },
                tx
            );
            await WalletService.recalculateFromLedger(userId, tx);

        });

        await WatchlistService.ensureDefaultWatchlist(userId);

        mtmEngineService.requestRefresh(userId);

        return NextResponse.json({
            success: true,
            message: "Account reset successfully. Wallet set to 1000000 and default watchlist created.",
            data: {
                balance: Number(RESET_BALANCE),
            },
        });
    } catch (err) {
        logger.error({ err: err }, "[RESET] Account reset failed");
        return handleError(err);
    }
}



