import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionService } from '@/services/subscription/subscription.service';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const upgradeSchema = z.object({
    plan: z.enum(['free_trial', 'basic', 'pro']),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
        }

        const body: unknown = await request.json();
        const parsed = upgradeSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid request body', code: 'VALIDATION_ERROR' },
                { status: 400 }
            );
        }

        if (parsed.data.plan === 'free_trial') {
            const effectivePlan = await SubscriptionService.getEffectivePlan(session.user.id);
            return NextResponse.json({
                message: 'Trial plan selected',
                plan: effectivePlan.plan,
                status: effectivePlan.status,
            });
        }

        // Paid plans must go through Razorpay — block direct upgrade
        return NextResponse.json(
            { error: 'Paid plans require payment via Razorpay', code: 'PAYMENT_REQUIRED' },
            { status: 402 }
        );
    } catch (err) {
        logger.error({ err: err }, 'Failed to upgrade subscription');
        return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 });
    }
}
