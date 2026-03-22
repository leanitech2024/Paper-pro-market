import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test, { after } from "node:test";
import dotenv from "dotenv";
import { and, eq, inArray, or } from "drizzle-orm";

function resolveEnvPath(): string | null {
  const roots = [
    process.cwd(),
    path.resolve(process.cwd(), ".."),
    path.resolve(process.cwd(), "../.."),
    path.resolve(process.cwd(), "../../.."),
    path.resolve(process.cwd(), "../../../.."),
  ];

  for (const root of roots) {
    const candidate = path.resolve(root, ".env.local");
    if (fs.existsSync(candidate)) return candidate;
  }

  return null;
}

const envPath = resolveEnvPath();
if (envPath) {
  dotenv.config({ path: envPath });
}

// Prevent Redis client initialization in tests (avoids hanging open handles).
process.env.DISABLE_REDIS = "true";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for admin service tests.");
}

const { AdminService } = await import("./admin.service");
const { WalletService } = await import("../accounting/wallet/wallet.service");
const { bootstrapUserLedgerState } = await import(
  "../accounting/ledger/ledger-bootstrap.service"
);
const { db, pool } = await import("../../lib/db");
const {
  adminAuditLogs,
  ledgerAccountBalances,
  ledgerAccounts,
  ledgerEntries,
  users,
  wallets,
} = await import("@paper-market/core/db");

after(async () => {
  await pool.end();
});

async function createUser(role: "admin" | "user") {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `${role}-${suffix}@example.com`;
  const name = `${role}-${suffix}`;

  const [row] = await db
    .insert(users)
    .values({
      name,
      email,
      role,
    })
    .returning({ id: users.id, email: users.email });

  assert.ok(row?.id, "Expected user row to be created.");
  return row!;
}

async function ensureLedgerReady(userId: string) {
  await WalletService.getWallet(userId);
  await bootstrapUserLedgerState(userId);
}

async function cleanupUser(userId: string, adminId?: string) {
  const auditCondition = adminId
    ? or(eq(adminAuditLogs.adminId, adminId), eq(adminAuditLogs.targetUserId, userId))
    : eq(adminAuditLogs.targetUserId, userId);

  await db.delete(adminAuditLogs).where(auditCondition);

  const accountRows = await db
    .select({ id: ledgerAccounts.id })
    .from(ledgerAccounts)
    .where(eq(ledgerAccounts.userId, userId));
  const accountIds = accountRows.map((row) => row.id);

  if (accountIds.length > 0) {
    await db
      .delete(ledgerEntries)
      .where(
        or(
          inArray(ledgerEntries.debitAccountId, accountIds),
          inArray(ledgerEntries.creditAccountId, accountIds)
        )
      );
    await db
      .delete(ledgerAccountBalances)
      .where(inArray(ledgerAccountBalances.accountId, accountIds));
    await db.delete(ledgerAccounts).where(inArray(ledgerAccounts.id, accountIds));
  }

  await db.delete(wallets).where(eq(wallets.userId, userId));
  await db.delete(users).where(eq(users.id, userId));
}

test("AdminService.resetUserBalance creates ledger entries + audit log", async () => {
  const admin = await createUser("admin");
  const user = await createUser("user");

  try {
    await ensureLedgerReady(user.id);

    const beforeCount = await AdminService.countLedgerEntriesForUser(user.id);

    await AdminService.resetUserBalance(admin.id, user.id, {
      targetBalance: 500000,
      reason: "test reset",
    });

    const afterCount = await AdminService.countLedgerEntriesForUser(user.id);

    assert.ok(
      afterCount > beforeCount,
      `Expected ledger entries to increase (before=${beforeCount}, after=${afterCount})`
    );

    const [audit] = await db
      .select({
        id: adminAuditLogs.id,
        action: adminAuditLogs.action,
      })
      .from(adminAuditLogs)
      .where(
        and(
          eq(adminAuditLogs.adminId, admin.id),
          eq(adminAuditLogs.targetUserId, user.id),
          eq(adminAuditLogs.action, "RESET_BALANCE")
        )
      )
      .limit(1);

    assert.ok(audit?.id, "Expected audit log for reset balance.");
  } finally {
    await cleanupUser(user.id, admin.id);
    await cleanupUser(admin.id, admin.id);
  }
});

test("AdminService.deactivateUser flips isActive + audit log", async () => {
  const admin = await createUser("admin");
  const user = await createUser("user");

  try {
    await AdminService.deactivateUser(admin.id, user.id, "test deactivate");

    const [row] = await db
      .select({ isActive: users.isActive })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    assert.equal(row?.isActive, false);

    const [audit] = await db
      .select({
        id: adminAuditLogs.id,
        action: adminAuditLogs.action,
      })
      .from(adminAuditLogs)
      .where(
        and(
          eq(adminAuditLogs.adminId, admin.id),
          eq(adminAuditLogs.targetUserId, user.id),
          eq(adminAuditLogs.action, "DEACTIVATE_USER")
        )
      )
      .limit(1);

    assert.ok(audit?.id, "Expected audit log for deactivation.");
  } finally {
    await cleanupUser(user.id, admin.id);
    await cleanupUser(admin.id, admin.id);
  }
});
