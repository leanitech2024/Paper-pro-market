import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { payments } from '@paper-market/core/db';
import { eq } from 'drizzle-orm';
import { SubscriptionService } from '@/services/subscription/subscription.service';
import crypto from 'node:crypto';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const schema = z.object({
    razorpayOrderId: z.string(),
    razorpayPaymentId: z.string(),
    razorpaySignature: z.string(),
    plan: z.enum(['basic', 'pro']),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
        }

        const body: unknown = await req.json();
        const parsed = schema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid request body', code: 'VALIDATION_ERROR' }, { status: 400 });
        }

        const { razorpayOrderId, razorpayPaymentId, razorpaySignature, plan } = parsed.data;

        // Verify HMAC signature — prevents tampered payment responses
        const payloadStr = `${razorpayOrderId}|${razorpayPaymentId}`;
        const secret = process.env.RAZORPAY_KEY_SECRET ?? '';
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(payloadStr)
            .digest('hex');

        if (expectedSignature !== razorpaySignature) {
            logger.warn({ userId: session.user.id, razorpayOrderId }, 'Invalid Razorpay signature');

            await db.update(payments)
                .set({ status: 'failed', updatedAt: new Date() })
                .where(eq(payments.razorpayOrderId, razorpayOrderId));

            return NextResponse.json(
                { error: 'Invalid payment signature', code: 'SIGNATURE_INVALID' },
                { status: 400 }
            );
        }

        // Mark payment as paid
        await db.update(payments)
            .set({
                razorpayPaymentId,
                razorpaySignature,
                status: 'paid',
                updatedAt: new Date(),
            })
            .where(eq(payments.razorpayOrderId, razorpayOrderId));

        // Activate subscription
        await SubscriptionService.upgradePlan(session.user.id, plan);

        logger.info(
            { userId: session.user.id, plan, razorpayPaymentId },
            'Payment verified and subscription activated'
        );

        const effectivePlan = await SubscriptionService.getEffectivePlan(session.user.id);

        return NextResponse.json({
            success: true,
            plan: effectivePlan.plan,
            status: effectivePlan.status,
        });
    } catch (error) {
        logger.error({ err: error }, 'Payment verification failed');
        return NextResponse.json({ error: 'Payment verification failed', code: 'VERIFICATION_FAILED' }, { status: 500 });
    }
}
