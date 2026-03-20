import {
    pgTable,
    uuid,
    text,
    timestamp,
    pgEnum,
} from 'drizzle-orm/pg-core';
import { type InferSelectModel, type InferInsertModel } from 'drizzle-orm';
import { users } from './users.schema.js';

export const subscriptionPlanEnum = pgEnum('subscription_plan', [
    'free_trial',
    'basic',
    'pro',
]);

export const subscriptionStatusEnum = pgEnum('subscription_status', [
    'active',
    'expired',
    'cancelled',
]);

export const subscriptions = pgTable('subscriptions', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('userId')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' })
        .unique(),
    plan: subscriptionPlanEnum('plan').notNull().default('free_trial'),
    status: subscriptionStatusEnum('status').notNull().default('active'),
    trialStartDate: timestamp('trialStartDate'),
    trialEndDate: timestamp('trialEndDate'),
    currentPeriodStart: timestamp('currentPeriodStart'),
    currentPeriodEnd: timestamp('currentPeriodEnd'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

export type Subscription = InferSelectModel<typeof subscriptions>;
export type NewSubscription = InferInsertModel<typeof subscriptions>;
export type SubscriptionPlan = typeof subscriptionPlanEnum.enumValues[number];
export type SubscriptionStatus = typeof subscriptionStatusEnum.enumValues[number];
