import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { SubscriptionService } from '@/services/subscription/subscription.service';
import { logger } from '@/lib/logger';

export async function GET(): Promise<NextResponse> {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
        }

        const effectivePlan = await SubscriptionService.getEffectivePlan(session.user.id);

        return NextResponse.json({
            plan: effectivePlan.plan,
            status: effectivePlan.status,
            isTrialActive: effectivePlan.isTrialActive,
            isTrialExpired: effectivePlan.isTrialExpired,
            trialEndDate: effectivePlan.trialEndDate?.toISOString() ?? null,
        });
    } catch (err) {
        logger.error({ err: err }, 'Failed to fetch subscription status');
        return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 });
    }
}
