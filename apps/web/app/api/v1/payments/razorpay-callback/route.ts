import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { payments } from "@paper-market/core/db";
import { eq } from "drizzle-orm";
import { SubscriptionService } from "@/services/subscription/subscription.service";
import crypto from "node:crypto";
import { logger } from "@/lib/logger";

/**
 * Razorpay redirects to this route after checkout.
 *
 * With redirect:true + callback_url, Razorpay redirects the user's browser
 * to callback_url with payment params appended as URL query params (GET).
 * It does NOT POST form data — despite some docs suggesting otherwise.
 *
 * We also export a POST handler as a defensive fallback in case any payment
 * method submits via form POST.
 *
 * Security: No session needed — we identify the user by looking up the
 * razorpay_order_id in our payments table (created when the order was placed).
 * Tampering is prevented by HMAC-SHA256 signature verification.
 *
 * Flow:
 *   Razorpay → GET /api/v1/payments/razorpay-callback?plan=X&onboarding=true
 *              &razorpay_payment_id=X&razorpay_order_id=Y&razorpay_signature=Z
 *   → verify HMAC signature
 *   → update payments + subscription in DB
 *   → set onb_done=1 cookie
 *   → 302 GET redirect to /subscription/success?plan=X&verified=true
 */

async function handleCallback(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
  plan: string,
  isOnboarding: boolean,
  origin: string
): Promise<NextResponse> {
  const failureRedirect = new URL(
    isOnboarding ? "/onboarding" : "/subscription",
    origin
  );

  // Look up userId from our payments table (order was created by authenticated user)
  const [paymentRecord] = await db
    .select({ userId: payments.userId })
    .from(payments)
    .where(eq(payments.razorpayOrderId, razorpayOrderId))
    .limit(1);

  const userId = paymentRecord?.userId;
  if (!userId) {
    logger.error({ razorpayOrderId }, "Razorpay callback: payment record not found");
    return NextResponse.redirect(failureRedirect, { status: 302 });
  }

  // Verify HMAC — prevents tampered payment responses
  const secret = process.env.RAZORPAY_KEY_SECRET ?? "";
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  if (expectedSignature !== razorpaySignature) {
    logger.warn({ userId, razorpayOrderId }, "Razorpay callback: invalid signature");
    await db
      .update(payments)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(payments.razorpayOrderId, razorpayOrderId));
    return NextResponse.redirect(failureRedirect, { status: 302 });
  }

  // Mark payment as paid
  await db
    .update(payments)
    .set({
      razorpayPaymentId,
      razorpaySignature,
      status: "paid",
      updatedAt: new Date(),
    })
    .where(eq(payments.razorpayOrderId, razorpayOrderId));

  // Activate subscription in DB
  await SubscriptionService.upgradePlan(userId, plan as "basic" | "pro");

  logger.info(
    { userId, plan, razorpayPaymentId },
    "Razorpay callback: payment verified, subscription activated"
  );

  // Redirect browser to success page (GET) — client will patch the session JWT
  const successUrl = new URL("/subscription/success", origin);
  successUrl.searchParams.set("plan", plan);
  if (isOnboarding) successUrl.searchParams.set("onboarding", "true");
  successUrl.searchParams.set("verified", "true");

  const response = NextResponse.redirect(successUrl, { status: 302 });

  // Set bypass cookie so middleware lets the user through even with stale JWT
  response.cookies.set("onb_done", "1", {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 86400,
  });

  return response;
}

/** GET handler — Razorpay with redirect:true appends params to the callback URL */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = req.nextUrl;
  const plan = searchParams.get("plan") ?? "basic";
  const isOnboarding = searchParams.get("onboarding") === "true";
  const razorpayOrderId = searchParams.get("razorpay_order_id") ?? "";
  const razorpayPaymentId = searchParams.get("razorpay_payment_id") ?? "";
  const razorpaySignature = searchParams.get("razorpay_signature") ?? "";

  const failureRedirect = new URL(
    isOnboarding ? "/onboarding" : "/subscription",
    origin
  );

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    logger.warn({ searchParams: Object.fromEntries(searchParams) }, "Razorpay GET callback: missing params");
    return NextResponse.redirect(failureRedirect, { status: 302 });
  }

  try {
    return await handleCallback(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      plan,
      isOnboarding,
      origin
    );
  } catch (err) {
    logger.error({ err: err }, "Razorpay GET callback: unexpected error");
    return NextResponse.redirect(failureRedirect, { status: 302 });
  }
}

/** POST handler — defensive fallback for form-POST style callbacks */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = req.nextUrl;
  const plan = searchParams.get("plan") ?? "basic";
  const isOnboarding = searchParams.get("onboarding") === "true";

  const failureRedirect = new URL(
    isOnboarding ? "/onboarding" : "/subscription",
    origin
  );

  try {
    const formData = await req.formData().catch(() => null);
    const razorpayOrderId = formData?.get("razorpay_order_id")?.toString() ?? "";
    const razorpayPaymentId = formData?.get("razorpay_payment_id")?.toString() ?? "";
    const razorpaySignature = formData?.get("razorpay_signature")?.toString() ?? "";

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      logger.warn("Razorpay POST callback: missing payment params in form body");
      return NextResponse.redirect(failureRedirect, { status: 302 });
    }

    return await handleCallback(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      plan,
      isOnboarding,
      origin
    );
  } catch (err) {
    logger.error({ err: err }, "Razorpay POST callback: unexpected error");
    return NextResponse.redirect(failureRedirect, { status: 302 });
  }
}
