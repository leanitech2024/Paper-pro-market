import { eq, inArray, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { ledgerAccounts, ledgerEntries, wallets } from "@paper-market/core/db";
import type { LedgerAccountType } from "@paper-market/core";
import { logger } from "@/lib/logger";
import { LedgerService } from "@/services/accounting/ledger/ledger.service";
import { ledgerCacheService } from "@/services/accounting/ledger/ledger-cache.service";

type TxLike = typeof db | any;

const ACCOUNT_TYPES: readonly LedgerAccountType[] = [
    "CASH",
    "MARGIN_BLOCKED",
    "UNREALIZED_PNL",
    "REALIZED_PNL",
    "FEES",
];

const DEFAULT_WALLET_BALANCE = LedgerService.normalizeAmount(
    process.env.DEFAULT_WALLET_BALANCE ?? "1000000"
);
const PAPER_TRADING_MODE =
    String(process.env.PAPER_TRADING_MODE ?? "true").trim().toLowerCase() !== "false";

function normalizeAmount(value: unknown): string {
    const normalized = LedgerService.normalizeAmount(String(value ?? "0"));
    return LedgerService.compare(normalized, "0") > 0 ? normalized : "0";
}

export async function bootstrapLedgerAccounts(userId: string, tx?: TxLike): Promise<void> {
    const executor = tx || db;

    await executor
        .insert(ledgerAccounts)
        .values(ACCOUNT_TYPES.map((accountType) => ({ userId, accountType })))
        .onConflictDoNothing({
            target: [ledgerAccounts.userId, ledgerAccounts.accountType],
        });

    await ledgerCacheService.warmUser(userId, executor);
}

export async function bootstrapUserLedgerState(userId: string, tx?: TxLike): Promise<void> {
    const executor = tx || db;
    await bootstrapLedgerAccounts(userId, executor);

    const accountSet = await ledgerCacheService.getAccountSet(userId, executor);
    const accountIds = Object.values(accountSet);
    const [existingEntry] = await executor
        .select({ id: ledgerEntries.id })
        .from(ledgerEntries)
        .where(
            or(
                inArray(ledgerEntries.debitAccountId, accountIds),
                inArray(ledgerEntries.creditAccountId, accountIds)
            )
        )
        .limit(1);
    const ledgerEmpty = !existingEntry;

    const [wallet] = await executor
        .select({
            balance: wallets.balance,
            blockedBalance: wallets.blockedBalance,
        })
        .from(wallets)
        .where(eq(wallets.userId, userId))
        .limit(1);

    const walletBalance = normalizeAmount(wallet?.balance ?? "0");
    const blockedBalance = normalizeAmount(wallet?.blockedBalance ?? "0");
    const useDefaultBalance =
        ledgerEmpty &&
        PAPER_TRADING_MODE &&
        LedgerService.compare(walletBalance, "0") <= 0 &&
        LedgerService.compare(blockedBalance, "0") <= 0;
    const totalBalance = useDefaultBalance ? DEFAULT_WALLET_BALANCE : walletBalance;
    let freeCash = LedgerService.subtract(totalBalance, blockedBalance);
    if (LedgerService.compare(freeCash, "0") < 0) {
        freeCash = totalBalance;
    }

    if (LedgerService.compare(freeCash, "0") > 0) {
        await LedgerService.recordEntry(
            { userId, accountType: "CASH" },
            { userId, accountType: "REALIZED_PNL" },
            freeCash,
            {
                referenceType: "ADJUSTMENT",
                referenceId: `WALLET_BOOTSTRAP_CASH-${userId}`,
                idempotencyKey: `ADJUSTMENT-WALLET_BOOTSTRAP_CASH-${userId}`,
            },
            executor
        );
    }

    if (LedgerService.compare(blockedBalance, "0") > 0) {
        await LedgerService.recordEntry(
            { userId, accountType: "MARGIN_BLOCKED" },
            { userId, accountType: "REALIZED_PNL" },
            blockedBalance,
            {
                referenceType: "ADJUSTMENT",
                referenceId: `WALLET_BOOTSTRAP_MARGIN-${userId}`,
                idempotencyKey: `ADJUSTMENT-WALLET_BOOTSTRAP_MARGIN-${userId}`,
            },
            executor
        );
    }

    logger.info({ userId }, "Ledger bootstrap completed");
}



