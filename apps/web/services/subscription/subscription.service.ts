import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { subscriptions } from '@paper-market/core/db';
import type { SubscriptionPlan, SubscriptionStatus } from '@paper-market/core/db';
import { logger } from '@/lib/logger';

/** Features that can be gated by subscription plan */
type GatedFeature = 'analytics' | 'journal' | 'export';

/** Which features each plan includes */
const PLAN_FEATURES: Record<SubscriptionPlan, Set<GatedFeature>> = {
    free_trial: new Set(['analytics', 'journal', 'export']), // Full access during trial
    basic: new Set([]), // Excludes analytics, journal, export
    pro: new Set(['analytics', 'journal', 'export']), // All features
};

const TRIAL_DURATION_DAYS = 3;

export const SubscriptionService = {

    /**
     * Creates a free trial subscription for a new user.
     * Should be called inside the same transaction as user creation.
     */
    async createTrialSubscription(
        userId: string,
        tx?: Parameters<Parameters<typeof db.transaction>[0]>[0]
    ): Promise<void> {
        const conn = tx ?? db;
        const now = new Date();
        const trialEnd = new Date(now.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);

        await conn.insert(subscriptions).values({
            userId,
            plan: 'free_trial',
            status: 'active',
            trialStartDate: now,
            trialEndDate: trialEnd,
            currentPeriodStart: now,
            currentPeriodEnd: trialEnd,
        });

        logger.info({ userId, trialEnd: trialEnd.toISOString() }, 'Created free trial subscription');
    },

    /**
     * Fetches the subscription for a user, or null if none exists.
     */
    async getSubscription(userId: string) {
        const [subscription] = await db
            .select()
            .from(subscriptions)
            .where(eq(subscriptions.userId, userId))
            .limit(1);

        return subscription ?? null;
    },

    /**
     * Returns the effective plan for a user, accounting for trial expiry.
     * - If on free_trial and trial has expired → returns 'expired'
     * - Otherwise returns the plan as stored
     */
    async getEffectivePlan(userId: string): Promise<{
        plan: SubscriptionPlan;
        status: SubscriptionStatus;
        isTrialActive: boolean;
        isTrialExpired: boolean;
        trialEndDate: Date | null;
    }> {
        const subscription = await this.getSubscription(userId);

        if (!subscription) {
            // No subscription record — treat as expired trial
            return {
                plan: 'free_trial',
                status: 'expired',
                isTrialActive: false,
                isTrialExpired: true,
                trialEndDate: null,
            };
        }

        const now = new Date();
        const isTrialPlan = subscription.plan === 'free_trial';
        const trialExpired = isTrialPlan && subscription.trialEndDate
            ? now > subscription.trialEndDate
            : false;

        // Auto-expire trial if needed
        if (trialExpired && subscription.status === 'active') {
            await db
                .update(subscriptions)
                .set({ status: 'expired', updatedAt: now })
                .where(eq(subscriptions.userId, userId));

            return {
                plan: 'free_trial',
                status: 'expired',
                isTrialActive: false,
                isTrialExpired: true,
                trialEndDate: subscription.trialEndDate,
            };
        }

        return {
            plan: subscription.plan,
            status: subscription.status,
            isTrialActive: isTrialPlan && subscription.status === 'active',
            isTrialExpired: trialExpired,
            trialEndDate: subscription.trialEndDate,
        };
    },

    /**
     * Upgrades a user's subscription plan.
     */
    async upgradePlan(userId: string, plan: 'basic' | 'pro'): Promise<void> {
        const now = new Date();
        const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

        const existing = await this.getSubscription(userId);

        if (existing) {
            await db
                .update(subscriptions)
                .set({
                    plan,
                    status: 'active',
                    currentPeriodStart: now,
                    currentPeriodEnd: periodEnd,
                    updatedAt: now,
                })
                .where(eq(subscriptions.userId, userId));
        } else {
            await db.insert(subscriptions).values({
                userId,
                plan,
                status: 'active',
                currentPeriodStart: now,
                currentPeriodEnd: periodEnd,
            });
        }

        logger.info({ userId, plan, periodEnd: periodEnd.toISOString() }, 'Subscription plan upgraded');
    },

    /**
     * Checks if a user's plan includes access to a specific feature.
     */
    async hasFeatureAccess(userId: string, feature: GatedFeature): Promise<boolean> {
        const { plan, status } = await this.getEffectivePlan(userId);

        // Expired or cancelled subscriptions get no gated features
        if (status !== 'active') return false;

        return PLAN_FEATURES[plan].has(feature);
    },
};
