import { pgTable, uuid, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { type InferSelectModel, type InferInsertModel } from 'drizzle-orm';
import { users } from './users.schema.js';
import { subscriptionPlanEnum } from './subscriptions.schema.js';

export const payments = pgTable('payments', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
    razorpayOrderId: text('razorpayOrderId').notNull().unique(),
    razorpayPaymentId: text('razorpayPaymentId'),
    razorpaySignature: text('razorpaySignature'),
    plan: subscriptionPlanEnum('plan').notNull(),
    amount: integer('amount').notNull(),
    currency: text('currency').notNull().default('INR'),
    status: text('status').notNull().default('created'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

export type Payment = InferSelectModel<typeof payments>;
export type NewPayment = InferInsertModel<typeof payments>;
