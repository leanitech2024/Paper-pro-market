import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { payments } from '@paper-market/core/db';
import { eq } from 'drizzle-orm';
import { SubscriptionService } from '@/services/subscription/subscription.service';
import crypto from 'node:crypto';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest): Promise<NextResponse> {
    try {
        const signature = req.headers.get('x-razorpay-signature');
        if (!signature) {
            return NextResponse.json({ error: 'Missing signature', code: 'MISSING_SIGNATURE' }, { status: 400 });
        }

        const rawBody = await req.text();

        // Verify webhook signature
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET ?? '';
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(rawBody)
            .digest('hex');

        if (expectedSignature !== signature) {
            logger.warn('Invalid Razorpay webhook signature');
            return NextResponse.json({ error: 'Invalid signature', code: 'SIGNATURE_INVALID' }, { status: 400 });
        }

        const event: unknown = JSON.parse(rawBody);

        if (
            typeof event !== 'object' ||
            event === null ||
            !('event' in event) ||
            !('payload' in event)
        ) {
            return NextResponse.json({ error: 'Invalid event payload', code: 'INVALID_PAYLOAD' }, { status: 400 });
        }

        const eventType = (event as Record<string, unknown>).event as string;
        const payload = (event as Record<string, unknown>).payload as Record<string, unknown>;

        logger.info({ eventType }, 'Razorpay webhook received');

        if (eventType === 'payment.captured') {
            const paymentObj = (payload.payment as Record<string, unknown>).entity as Record<string, string>;
            const razorpayOrderId = paymentObj['order_id'];
            const razorpayPaymentId = paymentObj['id'];

            if (!razorpayOrderId || !razorpayPaymentId) {
                logger.warn({ eventType }, 'Missing payment entity fields in webhook');
                return NextResponse.json({ received: true });
            }

            const [payment] = await db
                .select()
                .from(payments)
                .where(eq(payments.razorpayOrderId, razorpayOrderId))
                .limit(1);

            if (!payment) {
                logger.warn({ razorpayOrderId }, 'Payment record not found for webhook');
                return NextResponse.json({ received: true });
            }

            // Idempotency — skip if already processed
            if (payment.status === 'paid') {
                return NextResponse.json({ received: true });
            }

            await db.update(payments)
                .set({
                    razorpayPaymentId,
                    status: 'paid',
                    updatedAt: new Date(),
                })
                .where(eq(payments.razorpayOrderId, razorpayOrderId));

            if (payment.plan === 'basic' || payment.plan === 'pro') {
                await SubscriptionService.upgradePlan(payment.userId, payment.plan);
                logger.info({ userId: payment.userId, plan: payment.plan }, 'Subscription activated via webhook');
            }
        }

        if (eventType === 'payment.failed') {
            const paymentObj = (payload.payment as Record<string, unknown>).entity as Record<string, string>;
            const razorpayOrderId = paymentObj['order_id'];

            if (razorpayOrderId) {
                await db.update(payments)
                    .set({ status: 'failed', updatedAt: new Date() })
                    .where(eq(payments.razorpayOrderId, razorpayOrderId));

                logger.warn({ razorpayOrderId }, 'Payment failed via webhook');
            }
        }

        return NextResponse.json({ received: true });
    } catch (err) {
        logger.error({ err:err

         }, 'Webhook processing failed');
        return NextResponse.json({ error: 'Webhook processing failed', code: 'WEBHOOK_FAILED' }, { status: 500 });
    }
}
