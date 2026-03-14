import { pgTable, text, integer, numeric, timestamp, pgEnum, uuid, index, uniqueIndex, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users.schema.js';
import { instruments } from './market.schema.js';
export const OrderSide = pgEnum('order_side', ['BUY', 'SELL']);
export const OrderType = pgEnum('order_type', ['MARKET', 'LIMIT']);
export const OrderStatus = pgEnum('order_status', ['PENDING', 'OPEN', 'PROCESSING', 'FILLED', 'CANCELLED', 'REJECTED']);
// ─── ProductType ─────────────────────────────────────────────────────────────
// CNC  = Cash-and-Carry   (multi-day, no leverage enforcement, no auto-square-off)
// MIS  = Margin Intraday  (leverage applied, auto-square-off at market close)
export const ProductType = pgEnum('product_type', ['CNC', 'MIS']);
// ─── ChildOrderType ───────────────────────────────────────────────────────────
// Marks whether this order is a SL or Target child spawned by a parent entry order.
// NULL = normal parent order.
export const ChildOrderType = pgEnum('child_order_type', ['STOP_LOSS', 'TARGET']);
export const orders = pgTable('orders', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('userId').notNull().references(() => users.id),
    symbol: text('symbol').notNull(),
    instrumentToken: text('instrumentToken').notNull().references(() => instruments.instrumentToken),
    side: OrderSide('side').notNull(),
    quantity: integer('quantity').notNull(),
    orderType: OrderType('orderType').notNull(),
    limitPrice: numeric('limitPrice', { precision: 10, scale: 2 }),
    // ── New: product type & leverage ─────────────────────────────────────────
    productType: text('productType').notNull().default('CNC'),
    leverage: integer('leverage').notNull().default(1),
    reservedMargin: numeric('reservedMargin', { precision: 12, scale: 2 }).notNull().default('0'),
    // ── New: stop-loss and target child order links ───────────────────────────
    // Stored on the *parent* order at placement time.
    stopLossPrice: numeric('stopLossPrice', { precision: 10, scale: 2 }),
    targetPrice: numeric('targetPrice', { precision: 10, scale: 2 }),
    // Stored on the *child* SL / Target order itself.
    childOrderType: text('childOrderType'), // 'STOP_LOSS' | 'TARGET' | null
    parentOrderId: uuid('parentOrderId'), // FK to orders.id (self-referential)
    status: OrderStatus('status').notNull().default('PENDING'),
    executionPrice: numeric('executionPrice', { precision: 10, scale: 2 }),
    executedAt: timestamp('executedAt'),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),
    rejectionReason: text('rejectionReason'),
    exitReason: text('exitReason'),
    idempotencyKey: text('idempotencyKey'),
    averagePrice: numeric('averagePrice', { precision: 10, scale: 2 }),
    realizedPnL: numeric('realizedPnL', { precision: 12, scale: 2 }),
}, (t) => {
    return {
        userIdIdx: index('orders_userId_idx').on(t.userId),
        symbolIdx: index('orders_symbol_idx').on(t.symbol),
        instrumentTokenIdx: index('orders_instrumentToken_idx').on(t.instrumentToken),
        statusIdx: index('orders_status_idx').on(t.status),
        statusCreatedAtIdx: index('orders_status_createdAt_idx').on(t.status, t.createdAt),
        statusTokenIdx: index('orders_status_token_idx').on(t.status, t.instrumentToken),
        createdAtIdx: index('orders_createdAt_idx').on(t.createdAt),
        idempotencyIdx: index('orders_userId_idempotency_idx').on(t.userId, t.idempotencyKey),
        // Quickly find all child SL/Target orders belonging to a parent
        parentOrderIdIdx: index('orders_parentOrderId_idx').on(t.parentOrderId),
        quantityPositive: check('orders_quantity_positive', sql `${t.quantity} > 0`),
        limitPricePositive: check('orders_limitPrice_positive', sql `${t.limitPrice} IS NULL OR ${t.limitPrice} >= 0`),
        leverageRange: check('orders_leverage_range', sql `${t.leverage} >= 1 AND ${t.leverage} <= 10`),
        reservedMarginNonNegative: check('orders_reservedMargin_non_negative', sql `${t.reservedMargin} >= 0`),
        stopLossPositive: check('orders_stopLossPrice_positive', sql `${t.stopLossPrice} IS NULL OR ${t.stopLossPrice} > 0`),
        targetPositive: check('orders_targetPrice_positive', sql `${t.targetPrice} IS NULL OR ${t.targetPrice} > 0`),
    };
});
export const trades = pgTable('trades', {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('orderId').notNull().references(() => orders.id),
    userId: text('userId').notNull().references(() => users.id),
    symbol: text('symbol').notNull(),
    instrumentToken: text('instrumentToken').references(() => instruments.instrumentToken),
    side: OrderSide('side').notNull(),
    quantity: integer('quantity').notNull(),
    price: numeric('price', { precision: 10, scale: 2 }).notNull(),
    executedAt: timestamp('executedAt').notNull(),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
}, (t) => {
    return {
        userIdIdx: index('trades_userId_idx').on(t.userId),
        symbolIdx: index('trades_symbol_idx').on(t.symbol),
        executedAtIdx: index('trades_executedAt_idx').on(t.executedAt),
        quantityPositive: check('trades_quantity_positive', sql `${t.quantity} > 0`),
        pricePositive: check('trades_price_positive', sql `${t.price} >= 0`),
    };
});
export const positions = pgTable('positions', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('userId').notNull().references(() => users.id),
    symbol: text('symbol').notNull(),
    instrumentToken: text('instrumentToken').notNull().references(() => instruments.instrumentToken),
    quantity: integer('quantity').notNull(),
    averagePrice: numeric('averagePrice', { precision: 10, scale: 2 }).notNull(),
    realizedPnL: numeric('realizedPnL', { precision: 12, scale: 2 }).notNull().default('0'),
    // ── New: product type & leverage propagated from the entry order ──────────
    productType: text('productType').notNull().default('CNC'),
    leverage: integer('leverage').notNull().default(1),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (t) => {
    return {
        userTokenUnique: uniqueIndex('positions_userId_instrumentToken_unique').on(t.userId, t.instrumentToken),
        userIdIdx: index('idx_positions_userId').on(t.userId),
        userTokenIdx: index('idx_positions_user_token').on(t.userId, t.instrumentToken),
        instrumentTokenIdx: index('idx_positions_token').on(t.instrumentToken),
        averagePricePositive: check('positions_averagePrice_positive', sql `${t.averagePrice} > 0`),
        leverageRange: check('positions_leverage_range', sql `${t.leverage} >= 1 AND ${t.leverage} <= 10`),
    };
});
