import { bigserial, check, index, numeric, pgEnum, pgTable, text, timestamp, uuid, uniqueIndex, varchar, bigint, } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users.schema.js";
export const ledgerAccountTypeEnum = pgEnum("ledger_account_type", [
    "CASH",
    "MARGIN_BLOCKED",
    "UNREALIZED_PNL",
    "REALIZED_PNL",
    "FEES",
]);
export const ledgerReferenceTypeEnum = pgEnum("ledger_reference_type", [
    "TRADE",
    "ORDER",
    "LIQUIDATION",
    "EXPIRY",
    "ADJUSTMENT",
    "OPTION_PREMIUM_DEBIT",
    "OPTION_PREMIUM_CREDIT",
    "OPTION_MARGIN_BLOCK",
    "OPTION_MARGIN_RELEASE",
    "OPTION_REALIZED_PNL",
]);
export const ledgerAccounts = pgTable("ledger_accounts", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    accountType: ledgerAccountTypeEnum("accountType").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
}, (t) => ({
    userIdx: index("ledger_accounts_userId_idx").on(t.userId),
    accountTypeIdx: index("ledger_accounts_accountType_idx").on(t.accountType),
    userAccountTypeUnique: uniqueIndex("ledger_accounts_userId_accountType_unique").on(t.userId, t.accountType),
}));
export const ledgerEntries = pgTable("ledger_entries", {
    id: uuid("id").primaryKey().defaultRandom(),
    globalSequence: bigserial("globalSequence", { mode: "number" }).notNull(),
    debitAccountId: uuid("debitAccountId")
        .notNull()
        .references(() => ledgerAccounts.id, { onDelete: "restrict" }),
    creditAccountId: uuid("creditAccountId")
        .notNull()
        .references(() => ledgerAccounts.id, { onDelete: "restrict" }),
    amount: numeric("amount", { precision: 28, scale: 8 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("INR"),
    referenceType: ledgerReferenceTypeEnum("referenceType").notNull(),
    referenceId: text("referenceId").notNull(),
    idempotencyKey: text("idempotencyKey").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
}, (t) => ({
    debitIdx: index("ledger_entries_debit_idx").on(t.debitAccountId),
    creditIdx: index("ledger_entries_credit_idx").on(t.creditAccountId),
    referenceIdx: index("ledger_entries_reference_idx").on(t.referenceType, t.referenceId),
    globalSequenceIdx: index("ledger_entries_globalSequence_idx").on(t.globalSequence),
    globalSequenceUnique: uniqueIndex("ledger_entries_globalSequence_unique").on(t.globalSequence),
    referenceIdempotencyUnique: uniqueIndex("ledger_entries_reference_idempotency_unique").on(t.referenceType, t.referenceId, t.idempotencyKey),
    debitSequenceIdx: index("ledger_entries_debit_sequence_idx").on(t.debitAccountId, t.globalSequence),
    creditSequenceIdx: index("ledger_entries_credit_sequence_idx").on(t.creditAccountId, t.globalSequence),
    referenceCreatedIdx: index("ledger_entries_reference_created_idx").on(t.referenceType, t.createdAt),
    amountPositive: check("ledger_entries_amount_positive", sql `${t.amount} > 0`),
    noSelfTransfer: check("ledger_entries_no_self_transfer", sql `${t.debitAccountId} <> ${t.creditAccountId}`),
}));
export const ledgerAccountBalances = pgTable("ledger_account_balances", {
    accountId: uuid("accountId")
        .primaryKey()
        .references(() => ledgerAccounts.id, { onDelete: "cascade" }),
    balance: numeric("balance", { precision: 28, scale: 8 }).notNull().default("0"),
    lastSequence: bigint("lastSequence", { mode: "number" }).notNull().default(0),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
}, (t) => ({
    accountIdIdx: index("ledger_account_balances_accountId_idx").on(t.accountId),
}));
