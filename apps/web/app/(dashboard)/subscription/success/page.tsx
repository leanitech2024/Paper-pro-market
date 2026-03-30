"use client";

import { useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * This page is reached via a GET redirect from /api/v1/payments/razorpay-callback.
 * By the time we land here, the server has already:
 *   - verified the Razorpay signature
 *   - updated the subscription in DB
 *   - set the onb_done=1 cookie
 *
 * Our job: update the client session JWT and navigate to the dashboard.
 */
function SuccessPageContent() {
  const searchParams = useSearchParams();
  const { update } = useSession();
  const initiatedRef = useRef(false);

  const planRaw = searchParams?.get("plan") || "basic";
  const isOnboarding = searchParams?.get("onboarding") === "true";
  const verified = searchParams?.get("verified") === "true";

  useEffect(() => {
    if (initiatedRef.current) return;
    initiatedRef.current = true;

    async function activate() {
      try {
        if (!verified) {
          // Landed here directly without going through the callback route
          toast.error("Payment not verified. Please contact support.");
          window.location.href = isOnboarding ? "/onboarding" : "/subscription";
          return;
        }

        // DB is already updated by the server callback. Just need to:
        // 1. Ensure onb_done cookie is fresh (idempotent, no-op if already set by callback)
        await fetch("/api/v1/onboarding/complete", { method: "POST" });

        // 2. Patch the client-side JWT so session reflects the new plan
        await update({
          onboardingCompleted: true,
          subscriptionStatus: "active",
          plan: planRaw,
        });

        // 3. Navigate to dashboard
        window.location.href = isOnboarding ? "/trade/equity" : "/dashboard";
      } catch {
        toast.error("Something went wrong. Redirecting...");
        window.location.href = isOnboarding ? "/onboarding" : "/subscription";
      }
    }

    activate();
  }, [searchParams, planRaw, isOnboarding, verified, update]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center font-sans p-4 bg-background">
      <div className="max-w-md w-full bg-card shadow-2xl border border-border/50 rounded-[40px] p-8 md:p-12 text-center relative overflow-hidden">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/20 blur-[80px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="h-24 w-24 rounded-full border border-border bg-background/50 flex items-center justify-center shadow-sm">
            <Loader2 className="h-12 w-12 text-primary animate-spin" strokeWidth={2.5} />
          </div>

          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2 tracking-tight">
              Activating your plan
            </h1>
            <p className="text-base text-muted-foreground">
              Setting up your trading environment...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SubscriptionSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center font-sans">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="mt-4 text-sm text-muted-foreground font-medium">Loading...</p>
        </div>
      }
    >
      <SuccessPageContent />
    </Suspense>
  );
}
