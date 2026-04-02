import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { payments } from '@paper-market/core/db';
import { getRazorpay, PLAN_AMOUNTS } from '@/lib/razorpay';
import { z } from 'zod';
import { logger } from '@/lib/logger';

type RazorpayOrder = { id: string; amount: number | string; currency: string };

const RAZORPAY_TIMEOUT_MS = 8_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return Promise.race([
        promise,
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
        ),
    ]);
}

const schema = z.object({
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

        const { plan } = parsed.data;
        const amount = PLAN_AMOUNTS[plan];

        // Create Razorpay order with explicit timeout to prevent indefinite hangs
        let order: RazorpayOrder;
        try {
            order = await withTimeout(
                getRazorpay().orders.create({
                    amount,
                    currency: 'INR',
                    receipt: `rcpt_${session.user.id.slice(0, 8)}_${Date.now()}`,
                    notes: {
                        userId: session.user.id,
                        plan,
                    },
                }),
                RAZORPAY_TIMEOUT_MS,
                'Razorpay orders.create'
            );
        } catch (err) {
            const isTimeout = err instanceof Error && err.message.includes('timed out');
            logger.error({ err, userId: session.user.id, plan }, isTimeout ? 'Razorpay order creation timed out' : 'Razorpay order creation failed');
            return NextResponse.json(
                { error: isTimeout ? 'Payment provider is currently slow. Please try again.' : 'Failed to create payment order', code: isTimeout ? 'PAYMENT_TIMEOUT' : 'ORDER_CREATION_FAILED' },
                { status: isTimeout ? 504 : 502 }
            );
        }

        // Persist payment record
        await db.insert(payments).values({
            userId: session.user.id,
            razorpayOrderId: order.id,
            plan,
            amount,
            currency: 'INR',
            status: 'created',
        });

        logger.info({ userId: session.user.id, plan, orderId: order.id }, 'Razorpay order created');

        return NextResponse.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        });
    } catch (err) {
        logger.error({ err: err }, 'Failed to create Razorpay order');
        return NextResponse.json({ error: 'Failed to create payment order', code: 'ORDER_CREATION_FAILED' }, { status: 500 });
    }
}
