import {
    pgTable,
    uuid,
    numeric,
    varchar,
    timestamp,
    text,
    pgEnum,
    uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema';

// Transaction Type Enum
export const transactionTypeEnum = pgEnum('transaction_type', [
    'CREDIT',
    'DEBIT',
    'BLOCK',
    'UNBLOCK',
    'SETTLEMENT',
]);

// User Wallet (1:1 with User) - MATERIALIZED CACHE
// Design: wallets.balance is cash. wallets.equity is real-time MTM equity.
export const wallets = pgTable('wallets', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
    balance: numeric('balance', { precision: 28, scale: 8 }).notNull().default('1000000.00'),
    equity: numeric('equity', { precision: 28, scale: 8 }).notNull().default('1000000.00'),
    marginStatus: varchar('marginStatus', { length: 32 }).notNull().default('NORMAL'),
    accountState: varchar('accountState', { length: 32 }).notNull().default('NORMAL'),
    blockedBalance: numeric('blockedBalance', { precision: 28, scale: 8 }).notNull().default('0.00'),
    currency: varchar('currency', { length: 3 }).notNull().default('INR'),
    lastReconciled: timestamp('lastReconciled').notNull().defaultNow(),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

// Transaction Ledger (IMMUTABLE SOURCE OF TRUTH)
export const transactions = pgTable('transactions', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('userId').notNull().references(() => users.id),
    walletId: uuid('walletId').notNull().references(() => wallets.id),
    type: transactionTypeEnum('type').notNull(),
    amount: numeric('amount', { precision: 28, scale: 8 }).notNull(),

    // Audit Trail: Capture state before and after
    balanceBefore: numeric('balanceBefore', { precision: 28, scale: 8 }).notNull(),
    balanceAfter: numeric('balanceAfter', { precision: 28, scale: 8 }).notNull(),
    blockedBefore: numeric('blockedBefore', { precision: 28, scale: 8 }).notNull(),
    blockedAfter: numeric('blockedAfter', { precision: 28, scale: 8 }).notNull(),

    // Reference to related entity (Order, Trade, Position)
    referenceType: varchar('referenceType', { length: 50 }),
    referenceId: uuid('referenceId'),

    description: text('description'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
}, (table) => ({
    // Prevent duplicate transactions for same reference
    uniqueRef: uniqueIndex('wallet_txn_unique_ref').on(
        table.userId,
        table.type,
        table.referenceType,
        table.referenceId
    ),
}));

export type Wallet = typeof wallets.$inferSelect;
export type NewWallet = typeof wallets.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type TransactionType = typeof transactionTypeEnum.enumValues[number];
