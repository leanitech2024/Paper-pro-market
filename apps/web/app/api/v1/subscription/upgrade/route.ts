import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionService } from '@/services/subscription/subscription.service';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const upgradeSchema = z.object({
    plan: z.enum(['basic', 'pro']),
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

        await SubscriptionService.upgradePlan(session.user.id, parsed.data.plan);

        const effectivePlan = await SubscriptionService.getEffectivePlan(session.user.id);

        return NextResponse.json({
            message: `Plan upgraded to ${parsed.data.plan}`,
            plan: effectivePlan.plan,
            status: effectivePlan.status,
        });
    } catch (error) {
        logger.error({ err: error }, 'Failed to upgrade subscription');
        return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 });
    }
}
