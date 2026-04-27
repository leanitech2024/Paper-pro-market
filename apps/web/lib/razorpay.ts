import Razorpay from 'razorpay';

let _razorpay: Razorpay | null = null;

export function getRazorpay(): Razorpay {
    if (!_razorpay) {
        _razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID ?? '',
            key_secret: process.env.RAZORPAY_KEY_SECRET ?? '',
        });
    }
    return _razorpay;
}

export const PLAN_AMOUNTS: Record<'basic' | 'pro', number> = {
    basic: 8900,
    pro: 14900,
};

export const PLAN_LABELS: Record<'basic' | 'pro', string> = {
    basic: 'Basic Plan - Monthly',
    pro: 'Pro Plan - Monthly',
};
