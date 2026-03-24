import Razorpay from 'razorpay';

let _razorpay: Razorpay | null = null;

/** Lazily creates the Razorpay client on first call. Avoids build-time instantiation errors when env vars are not set. */
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
    basic: 8900,  // ₹89 in paise
    pro: 14900,   // ₹149 in paise
};

export const PLAN_LABELS: Record<'basic' | 'pro', string> = {
    basic: 'Basic Plan — Monthly',
    pro: 'Pro Plan — Monthly',
};
