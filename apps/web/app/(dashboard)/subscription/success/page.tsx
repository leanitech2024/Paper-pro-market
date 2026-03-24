"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useSubscriptionStore } from "@/stores/subscription.store";
import { toast } from "sonner";

function SuccessPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planRaw = searchParams?.get('plan') || 'basic';
  const plan = planRaw.toLowerCase() === 'pro' ? 'Pro' : 'Basic';
  const { update } = useSession();
  
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const initiatedRef = useRef(false);

  useEffect(() => {
    // 1. Smooth Progress Bar Driver (Fixed 5s duration)
    // We start this on the mount and clear on unmount.
    const duration = 5000;
    const interval = 20; // 50fps
    const stepIncrement = (interval / duration) * 100;
    
    const progressTimer = setInterval(() => {
        setProgress(prev => {
            if (prev >= 100) {
                clearInterval(progressTimer);
                return 100;
            }
            return Math.min(prev + stepIncrement, 100);
        });
    }, interval);

    // 2. Activation Logic (Gated to run once)
    async function activate() {
      try {
        const orderId = searchParams?.get('order_id');
        const paymentId = searchParams?.get('payment_id');
        const signature = searchParams?.get('signature');

        const startTime = Date.now();

        // Step 0: Verification (max 1.25s)
        let verified = true;
        if (orderId && paymentId && signature) {
           try {
             const verifyRes = await fetch('/api/v1/payments/verify', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({
                 razorpayOrderId: orderId,
                 razorpayPaymentId: paymentId,
                 razorpaySignature: signature,
                 plan: planRaw,
               }),
             });
             if (!verifyRes.ok) verified = false;
           } catch (e) {
             console.error("Verification fetch error:", e);
             verified = false;
           }
        }

        if (!verified) {
           toast.error("Payment verification failed. Please contact support.");
           router.replace('/subscription');
           return;
        }

        const elapsed0 = Date.now() - startTime;
        if (elapsed0 < 1250) await new Promise(r => setTimeout(r, 1250 - elapsed0));

        // Step 1: Provisioning
        setStep(1);
        try {
            await Promise.race([
                update({ subscriptionStatus: 'active' }),
                new Promise((_, reject) => setTimeout(() => reject("Timeout"), 2000))
            ]);
        } catch (e) { console.warn("Session update took too long, continuing..."); }

        const elapsed1 = Date.now() - startTime;
        if (elapsed1 < 2500) await new Promise(r => setTimeout(r, 2500 - elapsed1));
        
        // Step 2: Activating
        setStep(2);
        try {
            useSubscriptionStore.setState({
                plan: planRaw as any,
                status: 'active',
                hasFetched: true,
                lastFetchedAt: Date.now()
            });
            await useSubscriptionStore.getState().fetchSubscription(true);
        } catch (e) { console.warn("Store sync failed, continuing..."); }
        
        const elapsed2 = Date.now() - startTime;
        if (elapsed2 < 3750) await new Promise(r => setTimeout(r, 3750 - elapsed2));

        // Step 3: Ready
        setStep(3);
        const elapsed3 = Date.now() - startTime;
        if (elapsed3 < 5000) await new Promise(r => setTimeout(r, 5000 - elapsed3));

        router.push('/dashboard');
        router.refresh();
      } catch (err) {
        console.error("Critical activation error:", err);
        router.replace('/subscription');
      }
    }

    if (!initiatedRef.current) {
        initiatedRef.current = true;
        activate();
    }

    // Fallback redirect
    const fallback = setTimeout(() => {
        router.push('/dashboard');
    }, 7000);

    return () => {
        clearInterval(progressTimer);
        clearTimeout(fallback);
    };
  }, [searchParams, planRaw, router, update]);

  const steps = [
    { text: "Verifying payment confirmation..." },
    { text: `Provisioning ${plan} account resources...` },
    { text: "Unlocking institutional analytics & features..." },
    { text: "Your trading environment is ready." }
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center font-sans p-4 bg-background">
      <div className="max-w-md w-full bg-card shadow-2xl border border-border/50 rounded-[40px] p-8 md:p-12 text-center relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/20 blur-[80px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="h-24 w-24 rounded-full border border-border bg-background/50 flex items-center justify-center mb-8 relative shadow-sm">
            {step < 3 ? (
              <div className="relative h-12 w-12">
                <Loader2 className="h-12 w-12 text-primary animate-spin" strokeWidth={2.5} />
              </div>
            ) : (
              <div className="animate-in zoom-in duration-500">
                <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500" strokeWidth={2.5} />
                </div>
              </div>
            )}
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-4 tracking-tight">
            {step < 3 ? "Activating your plan" : "Account Ready"}
          </h1>
          
          <div className="h-10 overflow-hidden w-full relative mb-8">
            {steps.map((s, i) => (
              <div
                key={i}
                className={`absolute inset-0 flex items-center justify-center transition-all duration-700 cubic-bezier(0.4, 0, 0.2, 1) ${
                  step === i
                    ? "opacity-100 translate-y-0 scale-100"
                    : step > i
                    ? "opacity-0 -translate-y-8 scale-90"
                    : "opacity-0 translate-y-8 scale-90"
                }`}
              >
                <p className="text-base md:text-lg font-medium text-muted-foreground">
                    {s.text}
                </p>
              </div>
            ))}
          </div>

          {/* Progress Bar Container */}
          <div className="w-full">
            <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden mb-2">
                <div 
                className="h-full bg-primary transition-all duration-75 ease-linear rounded-full shadow-[0_0_15px_#2563eb66]"
                style={{ width: `${progress}%` }}
                />
            </div>
            <div className="flex justify-between text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em] px-1">
                <span>Initializing</span>
                <span>Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SubscriptionSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center font-sans tracking-tight">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
        <p className="mt-4 text-sm text-muted-foreground font-medium">Mounting activation sequence...</p>
      </div>
    }>
      <SuccessPageContent />
    </Suspense>
  );
}
