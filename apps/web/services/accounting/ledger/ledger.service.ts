import { and, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { ledgerAccountBalances, ledgerAccounts, ledgerEntries } from "@paper-market/core/db";
import { type LedgerAccountType, type LedgerReferenceType } from "@paper-market/core";
import { ApiError } from "@/lib/errors";
import { ledgerCacheService } from "@/services/accounting/ledger/ledger-cache.service";

const LEDGER_SCALE = 8;
const LEDGER_FACTOR = BigInt(10) ** BigInt(LEDGER_SCALE);
type DecimalInput = string | number | bigint;
type TxExecutor = typeof db;
type TxLike = TxExecutor | any;

type LedgerAccountRef = {
    accountId?: string;
    userId?: string;
    accountType?: LedgerAccountType;
};

type LedgerReference = {
    referenceType: LedgerReferenceType;
    referenceId: string;
    idempotencyKey: string;
    currency?: string;
};

type UserLedgerSnapshot = {
    cash: string;
    marginBlocked: string;
    totalBalance: string;
    unrealizedPnl: string;
    realizedPnl: string;
    fees: string;
    equity: string;
};

function trimTrailingZeros(value: string): string {
    const normalized = value.replace(/\.?0+$/, "");
    return normalized.includes(".") ? normalized : normalized || "0";
}

function toScaledInteger(input: DecimalInput): bigint {
    const raw = typeof input === "bigint" ? input.toString() : String(input ?? "").trim();
    if (!raw) {
        throw new ApiError("Amount is required", 400, "LEDGER_INVALID_AMOUNT");
    }

    const negative = raw.startsWith("-");
    const unsigned = negative ? raw.slice(1) : raw;
    if (!/^\d+(\.\d+)?$/.test(unsigned)) {
        throw new ApiError("Amount must be a valid decimal", 400, "LEDGER_INVALID_AMOUNT");
    }

    const [wholePart, fractionalPart = ""] = unsigned.split(".");
    const fractional = (fractionalPart + "00000000").slice(0, LEDGER_SCALE);
    const scaled = BigInt(wholePart || "0") * LEDGER_FACTOR + BigInt(fractional || "0");
    return negative ? -scaled : scaled;
}

function fromScaledInteger(value: bigint): string {
    const zero = BigInt(0);
    const negative = value < zero;
    const unsigned = negative ? -value : value;
    const whole = unsigned / LEDGER_FACTOR;
    const fraction = (unsigned % LEDGER_FACTOR).toString().padStart(LEDGER_SCALE, "0");
    const compact = trimTrailingZeros(`${whole}.${fraction}`);
    return negative ? `-${compact}` : compact;
}

export class LedgerService {
    static normalizeAmount(value: DecimalInput): string {
        return fromScaledInteger(toScaledInteger(value));
    }

    static add(a: DecimalInput, b: DecimalInput): string {
        return fromScaledInteger(toScaledInteger(a) + toScaledInteger(b));
    }

    static subtract(a: DecimalInput, b: DecimalInput): string {
        return fromScaledInteger(toScaledInteger(a) - toScaledInteger(b));
    }

    static compare(a: DecimalInput, b: DecimalInput): number {
        const left = toScaledInteger(a);
        const right = toScaledInteger(b);
        if (left === right) return 0;
        return left > right ? 1 : -1;
    }

    static multiplyByInteger(amount: DecimalInput, quantity: number): string {
        if (!Number.isInteger(quantity) || quantity < 0) {
            throw new ApiError("Quantity must be a non-negative integer", 400, "LEDGER_INVALID_QUANTITY");
        }
        return fromScaledInteger(toScaledInteger(amount) * BigInt(quantity));
    }

    static async ensureUserAccounts(userId: string, tx?: TxLike): Promise<void> {
        await ledgerCacheService.warmUser(userId, tx);
    }

    static async recordEntry(
        debitAccount: LedgerAccountRef,
        creditAccount: LedgerAccountRef,
        amount: DecimalInput,
        reference: LedgerReference,
        tx?: TxLike
    ): Promise<{ entryId: string; amount: string; globalSequence: number; duplicate: boolean }> {
        const executor = tx || db;
        const normalizedAmount = this.normalizeAmount(amount);
        if (this.compare(normalizedAmount, "0") <= 0) {
            throw new ApiError("Ledger amount must be positive", 400, "LEDGER_INVALID_AMOUNT");
        }
        const normalizedIdempotencyKey = String(reference.idempotencyKey || "").trim();
        if (!normalizedIdempotencyKey) {
            throw new ApiError("Ledger idempotency key is required", 400, "LEDGER_IDEMPOTENCY_REQUIRED");
        }

        const [debitId, creditId] = await Promise.all([
            this.resolveAccountId(debitAccount, executor),
            this.resolveAccountId(creditAccount, executor),
        ]);

        if (!debitId || !creditId || debitId === creditId) {
            throw new ApiError("Invalid ledger account mapping", 400, "LEDGER_ACCOUNT_MAPPING_INVALID");
        }

        const [existing] = await executor
            .select({
                id: ledgerEntries.id,
                globalSequence: ledgerEntries.globalSequence,
            })
            .from(ledgerEntries)
            .where(
                and(
                    eq(ledgerEntries.referenceType, reference.referenceType),
                    eq(ledgerEntries.referenceId, reference.referenceId),
                    eq(ledgerEntries.idempotencyKey, normalizedIdempotencyKey)
                )
            )
            .limit(1);

        if (existing?.id && Number.isFinite(Number(existing.globalSequence))) {
            return {
                entryId: existing.id,
                amount: normalizedAmount,
                globalSequence: Number(existing.globalSequence),
                duplicate: true,
            };
        }

        const [entry] = await executor
            .insert(ledgerEntries)
            .values({
                debitAccountId: debitId,
                creditAccountId: creditId,
                amount: normalizedAmount,
                currency: (reference.currency || "INR").toUpperCase(),
                referenceType: reference.referenceType,
                referenceId: reference.referenceId,
                idempotencyKey: normalizedIdempotencyKey,
            })
            .onConflictDoNothing()
            .returning({
                id: ledgerEntries.id,
                globalSequence: ledgerEntries.globalSequence,
            });

        if (entry?.id && Number.isFinite(Number(entry.globalSequence))) {
            const sequence = Number(entry.globalSequence);
            await this.updateBalanceSnapshot(
                debitId,
                normalizedAmount,
                sequence,
                "DEBIT",
                executor
            );
            await this.updateBalanceSnapshot(
                creditId,
                normalizedAmount,
                sequence,
                "CREDIT",
                executor
            );

            return {
                entryId: entry.id,
                amount: normalizedAmount,
                globalSequence: sequence,
                duplicate: false,
            };
        }

        const [race] = await executor
            .select({
                id: ledgerEntries.id,
                globalSequence: ledgerEntries.globalSequence,
            })
            .from(ledgerEntries)
            .where(
                and(
                    eq(ledgerEntries.referenceType, reference.referenceType),
                    eq(ledgerEntries.referenceId, reference.referenceId),
                    eq(ledgerEntries.idempotencyKey, normalizedIdempotencyKey)
                )
            )
            .limit(1);

        if (race?.id && Number.isFinite(Number(race.globalSequence))) {
            return {
                entryId: race.id,
                amount: normalizedAmount,
                globalSequence: Number(race.globalSequence),
                duplicate: true,
            };
        }

        return {
            entryId: "",
            amount: normalizedAmount,
            globalSequence: 0,
            duplicate: true,
        };
    }

    static async getAccountBalance(accountId: string, tx?: TxLike): Promise<string> {
        const executor = tx || db;
        const [row] = await executor
            .select({ balance: ledgerAccountBalances.balance })
            .from(ledgerAccountBalances)
            .where(eq(ledgerAccountBalances.accountId, accountId))
            .limit(1);

        if (row) {
            return this.normalizeAmount(row.balance);
        }

        // Fallback: Missing snapshot, rebuild it
        const [sumRow] = await executor
            .select({
                balance: sql<string>`
                    coalesce(
                        sum(
                            case
                                when ${ledgerEntries.debitAccountId} = ${accountId} then ${ledgerEntries.amount}::numeric
                                when ${ledgerEntries.creditAccountId} = ${accountId} then -${ledgerEntries.amount}::numeric
                                else 0
                            end
                        ),
                        0
                    )::text
                `,
            })
            .from(ledgerEntries)
            .where(
                or(
                    eq(ledgerEntries.debitAccountId, accountId),
                    eq(ledgerEntries.creditAccountId, accountId)
                )
            );

        const balance = this.normalizeAmount(sumRow?.balance ?? "0");

        // Opportunistically save it
        await executor
            .insert(ledgerAccountBalances)
            .values({
                accountId,
                balance,
                lastSequence: 0,
            })
            .onConflictDoNothing();

        return balance;
    }

    static async reconstructUserEquity(userId: string, tx?: TxLike): Promise<UserLedgerSnapshot> {
        const executor = tx || db;
        const accountSet = await ledgerCacheService.getAccountSet(userId, executor);
        const accountIds = Object.values(accountSet);

        let balanceRowsQuery = executor
            .select({
                accountId: ledgerAccountBalances.accountId,
                accountType: ledgerAccounts.accountType,
                balance: ledgerAccountBalances.balance,
            })
            .from(ledgerAccountBalances)
            .innerJoin(ledgerAccounts, eq(ledgerAccountBalances.accountId, ledgerAccounts.id))
            .where(inArray(ledgerAccountBalances.accountId, accountIds));
            
        // If we are inside an explicit transaction, lock these rows so concurrent operations queue.
        if (tx && executor !== db) {
             balanceRowsQuery = balanceRowsQuery.for("update");
        }
        
        let balanceRows = await balanceRowsQuery;

        if (balanceRows.length < accountIds.length) {
            // Missing snapshots — rebuild by scanning history once
            const legacyRows = await executor
                .select({
                    accountId: ledgerAccounts.id,
                    accountType: ledgerAccounts.accountType,
                    balance: sql<string>`
                        coalesce(
                            sum(
                                case
                                    when ${ledgerEntries.debitAccountId} = ${ledgerAccounts.id} then ${ledgerEntries.amount}::numeric
                                    when ${ledgerEntries.creditAccountId} = ${ledgerAccounts.id} then -${ledgerEntries.amount}::numeric
                                    else 0
                                end
                            ),
                            0
                        )::text
                    `,
                })
                .from(ledgerAccounts)
                .leftJoin(
                    ledgerEntries,
                    or(
                        eq(ledgerEntries.debitAccountId, ledgerAccounts.id),
                        eq(ledgerEntries.creditAccountId, ledgerAccounts.id)
                    )
                )
                .where(inArray(ledgerAccounts.id, accountIds))
                .groupBy(ledgerAccounts.id, ledgerAccounts.accountType);

            // Save snapshots for future reads
            for (const row of legacyRows) {
                const balance = this.normalizeAmount(row.balance);
                await executor
                    .insert(ledgerAccountBalances)
                    .values({
                        accountId: row.accountId,
                        balance,
                        lastSequence: 0,
                    })
                    .onConflictDoUpdate({
                        target: [ledgerAccountBalances.accountId],
                        set: {
                            balance,
                            updatedAt: new Date(),
                        },
                    });
            }

            balanceRows = legacyRows.map((r: any) => ({
                accountId: r.accountId,
                accountType: r.accountType,
                balance: r.balance,
            }));
        }

        const byType = new Map<LedgerAccountType, string>();
        for (const row of balanceRows) {
            byType.set(row.accountType, this.normalizeAmount(row.balance || "0"));
        }

        const cash = byType.get("CASH") || "0";
        const marginBlocked = byType.get("MARGIN_BLOCKED") || "0";
        const unrealized = byType.get("UNREALIZED_PNL") || "0";
        const realized = byType.get("REALIZED_PNL") || "0";
        const fees = byType.get("FEES") || "0";

        const totalBalance = this.add(cash, marginBlocked);
        const equity = this.add(totalBalance, unrealized);

        return {
            cash,
            marginBlocked,
            totalBalance,
            unrealizedPnl: unrealized,
            realizedPnl: realized,
            fees,
            equity,
        };
    }

    static async getAccountIdByType(
        userId: string,
        accountType: LedgerAccountType,
        tx?: TxLike
    ): Promise<string> {
        return ledgerCacheService.getAccountIdByType(userId, accountType, tx);
    }

    private static async resolveAccountId(ref: LedgerAccountRef, tx: TxLike): Promise<string> {
        if (ref.accountId) return ref.accountId;
        if (!ref.userId || !ref.accountType) {
            throw new ApiError("Ledger account reference is invalid", 400, "LEDGER_ACCOUNT_REF_INVALID");
        }
        return this.getAccountIdByType(ref.userId, ref.accountType, tx);
    }

    private static async updateBalanceSnapshot(
        accountId: string,
        amount: string,
        sequence: number,
        side: "DEBIT" | "CREDIT",
        tx: TxLike
    ): Promise<void> {
        const delta = side === "DEBIT" ? amount : this.subtract("0", amount);

        await tx
            .insert(ledgerAccountBalances)
            .values({
                accountId,
                balance: delta,
                lastSequence: sequence,
            })
            .onConflictDoUpdate({
                target: [ledgerAccountBalances.accountId],
                set: {
                    balance: sql`${ledgerAccountBalances.balance} + ${delta}`,
                    lastSequence: sequence,
                    updatedAt: new Date(),
                },
            });
    }
}

