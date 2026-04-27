import { alias } from "drizzle-orm/pg-core";
import { count, desc, eq, inArray, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/errors";
import {
  adminAuditLogs,
  ledgerAccounts,
  ledgerEntries,
  orders,
  positions,
  subscriptions,
  users,
  wallets,
} from "@paper-market/core/db";
import { LedgerService } from "@/domains/platform/server/accounting/ledger/ledger.service";
import { WalletService } from "@/domains/platform/server/accounting/wallet/wallet.service";

type TxLike = typeof db | any;

type PaginationInput = {
  page?: number;
  limit?: number;
};

type ResetBalanceInput = {
  targetBalance?: number;
  reason?: string;
};

function normalizePagination(input: PaginationInput = {}) {
  const limit = Math.max(1, Math.min(100, Number(input.limit ?? 20)));
  const page = Math.max(1, Number(input.page ?? 1));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

export class AdminService {
  static async listUsers(input: PaginationInput = {}, tx?: TxLike) {
    const executor = tx || db;
    const { page, limit, offset } = normalizePagination(input);

    const [{ total }] = await executor
      .select({ total: count() })
      .from(users);

    const rows = await executor
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        balance: users.balance,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      users: rows,
      pagination: {
        page,
        limit,
        total: Number(total ?? 0),
      },
    };
  }

  static async getUserDetails(userId: string, tx?: TxLike) {
    const executor = tx || db;

    const [user] = await executor
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new ApiError("User not found", 404, "NOT_FOUND");
    }

    const [wallet] = await executor
      .select()
      .from(wallets)
      .where(eq(wallets.userId, userId))
      .limit(1);

    const [subscription] = await executor
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);

    const ledgerSnapshot = await LedgerService.reconstructUserEquity(userId, executor);

    return {
      user,
      wallet,
      subscription,
      ledgerSnapshot,
    };
  }

  static async resetUserBalance(
    adminId: string,
    userId: string,
    input: ResetBalanceInput = {},
    tx?: TxLike
  ) {
    const apply = async (executor: TxLike) => {
      const [user] = await executor
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        throw new ApiError("User not found", 404, "NOT_FOUND");
      }

      await LedgerService.ensureUserAccounts(userId, executor);

      const defaultTarget = Number(process.env.DEFAULT_WALLET_BALANCE ?? "1000000");
      const targetBalance = LedgerService.normalizeAmount(
        input.targetBalance ?? defaultTarget
      );

      const resetReferenceId = `ADMIN_RESET_${userId}_${Date.now()}`;
      const description = input.reason || "Admin balance reset";

      const snapshot = await LedgerService.reconstructUserEquity(userId, executor);
      const targetBlocked = "0";
      const blockedDelta = LedgerService.subtract(targetBlocked, snapshot.marginBlocked);
      let cashAfterBlocked = snapshot.cash;

      if (LedgerService.compare(blockedDelta, "0") < 0) {
        const releaseAmount = LedgerService.subtract("0", blockedDelta);
        await WalletService.releaseMarginBlock(
          userId,
          releaseAmount,
          resetReferenceId,
          executor,
          description,
          { ledgerReferenceType: "ADJUSTMENT" }
        );
        cashAfterBlocked = LedgerService.add(cashAfterBlocked, releaseAmount);
      } else if (LedgerService.compare(blockedDelta, "0") > 0) {
        throw new ApiError(
          "Cannot increase blocked balance via reset",
          400,
          "RESET_BLOCKED_UNSUPPORTED"
        );
      }

      const cashDelta = LedgerService.subtract(targetBalance, cashAfterBlocked);
      if (LedgerService.compare(cashDelta, "0") > 0) {
        await WalletService.creditBalance(
          userId,
          cashDelta,
          "ADJUSTMENT",
          resetReferenceId,
          description,
          executor,
          { ledgerReferenceType: "ADJUSTMENT" }
        );
      } else if (LedgerService.compare(cashDelta, "0") < 0) {
        const debitAmount = LedgerService.subtract("0", cashDelta);
        await WalletService.debitBalance(
          userId,
          debitAmount,
          "ADJUSTMENT",
          resetReferenceId,
          executor,
          description,
          { ledgerReferenceType: "ADJUSTMENT" }
        );
      }

      await WalletService.recalculateFromLedger(userId, executor);

      await executor.insert(adminAuditLogs).values({
        adminId,
        targetUserId: userId,
        action: "RESET_BALANCE",
        details: {
          reason: input.reason || null,
          targetBalance,
        },
      });

      return LedgerService.reconstructUserEquity(userId, executor);
    };

    if (tx) {
      return apply(tx);
    }

    return db.transaction(async (executor) => apply(executor));
  }

  static async deactivateUser(
    adminId: string,
    userId: string,
    reason?: string,
    tx?: TxLike
  ) {
    const executor = tx || db;

    const [user] = await executor
      .select({ id: users.id, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new ApiError("User not found", 404, "NOT_FOUND");
    }

    if (user.isActive) {
      await executor
        .update(users)
        .set({ isActive: false })
        .where(eq(users.id, userId));
    }

    await executor.insert(adminAuditLogs).values({
      adminId,
      targetUserId: userId,
      action: "DEACTIVATE_USER",
      details: {
        reason: reason || null,
      },
    });

    return {
      userId,
      isActive: false,
    };
  }

  static async listTransactions(input: PaginationInput = {}, tx?: TxLike) {
    const executor = tx || db;
    const { page, limit, offset } = normalizePagination(input);

    const [{ total }] = await executor
      .select({ total: count() })
      .from(ledgerEntries);

    const debitAccounts = alias(ledgerAccounts, "debit_accounts");
    const creditAccounts = alias(ledgerAccounts, "credit_accounts");
    const debitUsers = alias(users, "debit_users");
    const creditUsers = alias(users, "credit_users");

    const rows = await executor
      .select({
        id: ledgerEntries.id,
        globalSequence: ledgerEntries.globalSequence,
        amount: ledgerEntries.amount,
        currency: ledgerEntries.currency,
        referenceType: ledgerEntries.referenceType,
        referenceId: ledgerEntries.referenceId,
        createdAt: ledgerEntries.createdAt,
        debitAccountType: debitAccounts.accountType,
        creditAccountType: creditAccounts.accountType,
        debitUserId: debitAccounts.userId,
        creditUserId: creditAccounts.userId,
        debitUserEmail: debitUsers.email,
        creditUserEmail: creditUsers.email,
      })
      .from(ledgerEntries)
      .innerJoin(debitAccounts, eq(ledgerEntries.debitAccountId, debitAccounts.id))
      .innerJoin(creditAccounts, eq(ledgerEntries.creditAccountId, creditAccounts.id))
      .innerJoin(debitUsers, eq(debitAccounts.userId, debitUsers.id))
      .innerJoin(creditUsers, eq(creditAccounts.userId, creditUsers.id))
      .orderBy(desc(ledgerEntries.globalSequence))
      .limit(limit)
      .offset(offset);

    return {
      transactions: rows,
      pagination: {
        page,
        limit,
        total: Number(total ?? 0),
      },
    };
  }

  static async listOrders(input: PaginationInput = {}, tx?: TxLike) {
    const executor = tx || db;
    const { page, limit, offset } = normalizePagination(input);

    const [{ total }] = await executor.select({ total: count() }).from(orders);

    const rows = await executor
      .select({
        id: orders.id,
        userId: orders.userId,
        userEmail: users.email,
        symbol: orders.symbol,
        side: orders.side,
        quantity: orders.quantity,
        orderType: orders.orderType,
        status: orders.status,
        limitPrice: orders.limitPrice,
        executionPrice: orders.executionPrice,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .innerJoin(users, eq(orders.userId, users.id))
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      orders: rows,
      pagination: {
        page,
        limit,
        total: Number(total ?? 0),
      },
    };
  }

  static async listPositions(input: PaginationInput = {}, tx?: TxLike) {
    const executor = tx || db;
    const { page, limit, offset } = normalizePagination(input);

    const [{ total }] = await executor.select({ total: count() }).from(positions);

    const rows = await executor
      .select({
        id: positions.id,
        userId: positions.userId,
        userEmail: users.email,
        symbol: positions.symbol,
        quantity: positions.quantity,
        averagePrice: positions.averagePrice,
        realizedPnL: positions.realizedPnL,
        productType: positions.productType,
        leverage: positions.leverage,
        updatedAt: positions.updatedAt,
      })
      .from(positions)
      .innerJoin(users, eq(positions.userId, users.id))
      .orderBy(desc(positions.updatedAt))
      .limit(limit)
      .offset(offset);

    return {
      positions: rows,
      pagination: {
        page,
        limit,
        total: Number(total ?? 0),
      },
    };
  }

  static async listPlans(input: PaginationInput = {}, tx?: TxLike) {
    const executor = tx || db;
    const { page, limit, offset } = normalizePagination(input);

    const [{ total }] = await executor.select({ total: count() }).from(subscriptions);

    const rows = await executor
      .select({
        id: subscriptions.id,
        userId: subscriptions.userId,
        userEmail: users.email,
        plan: subscriptions.plan,
        status: subscriptions.status,
        currentPeriodStart: subscriptions.currentPeriodStart,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        updatedAt: subscriptions.updatedAt,
      })
      .from(subscriptions)
      .innerJoin(users, eq(subscriptions.userId, users.id))
      .orderBy(desc(subscriptions.updatedAt))
      .limit(limit)
      .offset(offset);

    return {
      plans: rows,
      pagination: {
        page,
        limit,
        total: Number(total ?? 0),
      },
    };
  }

  static async listAuditLogs(input: PaginationInput = {}, tx?: TxLike) {
    const executor = tx || db;
    const { page, limit, offset } = normalizePagination(input);

    const [{ total }] = await executor
      .select({ total: count() })
      .from(adminAuditLogs);

    const adminUsers = alias(users, "admin_users");
    const targetUsers = alias(users, "target_users");

    const rows = await executor
      .select({
        id: adminAuditLogs.id,
        action: adminAuditLogs.action,
        details: adminAuditLogs.details,
        createdAt: adminAuditLogs.createdAt,
        adminId: adminAuditLogs.adminId,
        adminEmail: adminUsers.email,
        targetUserId: adminAuditLogs.targetUserId,
        targetUserEmail: targetUsers.email,
      })
      .from(adminAuditLogs)
      .innerJoin(adminUsers, eq(adminAuditLogs.adminId, adminUsers.id))
      .leftJoin(targetUsers, eq(adminAuditLogs.targetUserId, targetUsers.id))
      .orderBy(desc(adminAuditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      auditLogs: rows,
      pagination: {
        page,
        limit,
        total: Number(total ?? 0),
      },
    };
  }

  static async countLedgerEntriesForUser(userId: string, tx?: TxLike) {
    const executor = tx || db;
    const accountRows = await executor
      .select({ id: ledgerAccounts.id })
      .from(ledgerAccounts)
      .where(eq(ledgerAccounts.userId, userId));
    const accountIds = accountRows.map((row: { id: string }) => row.id);
    if (accountIds.length === 0) return 0;

    const [{ total }] = await executor
      .select({ total: count() })
      .from(ledgerEntries)
      .where(
        or(
          inArray(ledgerEntries.debitAccountId, accountIds),
          inArray(ledgerEntries.creditAccountId, accountIds)
        )
      );

    return Number(total ?? 0);
  }
}
