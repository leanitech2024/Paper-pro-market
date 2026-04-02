import { SubscriptionService } from "@/services/subscription/subscription.service";
import { logger } from "@/lib/logger";

/**
 * Validates if the user has an active or trialing subscription.
 * Returns true if allowed, false if expired.
 */
export async function requireActiveSubscription(userId: string): Promise<boolean> {
  try {
    const plan = await SubscriptionService.getEffectivePlan(userId);
    return plan.status !== 'expired';
  } catch (err) {
    logger.error({ err: err, userId }, "Failed to validate subscription in guard");
    // Fail closed
    return false;
  }
}
