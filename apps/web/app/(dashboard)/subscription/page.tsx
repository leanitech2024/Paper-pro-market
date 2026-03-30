"use client";
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useSubscriptionStore } from '@/stores/subscription.store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const RUPEE = "\u20B9";


function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.Razorpay) return resolve();
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
    document.body.appendChild(script);
  });
}

function redirectToSuccess(url: string) {
  const topWindow = window.open(url, "_top");
  if (!topWindow) {
    window.location.href = url;
  }
}
export default function SubscriptionPage() {
  const router = useRouter();
  const { data: session, update, status: sessionStatus } = useSession();

  const store = useSubscriptionStore();
  const fetchSubscription = store.fetchSubscription;
  const hasFetched = store.hasFetched;
  const isTrialActive = store.isTrialActive;
  const trialEndDate = store.trialEndDate;

  // Prevent flash by using JWT session data before the API fetch completes
  const plan = hasFetched ? store.plan : ((session?.user as any)?.plan || store.plan);
  const status = hasFetched ? store.status : ((session?.user as any)?.subscriptionStatus || store.status);

  const [isUpgrading, setIsUpgrading] = useState<null | 'basic' | 'pro'>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; targetPlan: 'basic' | 'pro' | null }>({ isOpen: false, targetPlan: null });

  useEffect(() => {
    if (!hasFetched) fetchSubscription();
  }, [hasFetched, fetchSubscription]);

  // Pre-load Razorpay SDK in the background so checkout opens instantly
  useEffect(() => {
    loadRazorpayScript().catch(() => {
      // Non-fatal — will retry on payment initiation
    });
  }, []);

  if (sessionStatus === 'loading' || isNavigating) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center font-sans bg-background/50 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" strokeWidth={2.5} />
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-[0.2em] animate-pulse">
            {isNavigating ? "Redirecting to activation..." : "Loading account details..."}
          </p>
        </div>
      </div>
    );
  }

  const daysLeft = trialEndDate
    ? Math.max(0, Math.ceil((new Date(trialEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const isExpired = status === 'expired' || status === 'cancelled';
  const planLabel = plan === 'free_trial' ? 'Free Trial' : plan === 'basic' ? 'Basic' : 'Pro';

  const initiateUpgrade = (targetPlan: 'basic' | 'pro') => {
    // If user is already on Pro and it's active, prevent downgrade to Basic
    if (plan === 'pro' && status === 'active' && targetPlan === 'basic') {
      toast.info("You already have an active Pro Plan, which includes all Basic features. There is no need to switch!", { id: 'upgrade-info' });
      return;
    }
    
    // If they click on their exact current plan while active, do nothing
    if (plan === targetPlan && status === 'active') {
      return;
    }

    setConfirmModal({ isOpen: true, targetPlan });
  };

  const handleUpgrade = async (nextPlan: 'basic' | 'pro') => {
    if (isUpgrading) return;
    setIsUpgrading(nextPlan);

    try {
      // Step 1 â€” Create Razorpay order server-side
      const orderRes = await fetch('/api/v1/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: nextPlan }),
      });

      if (!orderRes.ok) throw new Error('Failed to create payment order');
      const { orderId, amount, currency, keyId } = await orderRes.json() as {
        orderId: string;
        amount: number;
        currency: string;
        keyId: string;
      };

      // Step 2 â€” Load Razorpay checkout SDK
      await loadRazorpayScript();
      const successUrl = `${window.location.origin}/api/v1/payments/razorpay-callback?plan=${nextPlan}`;

      // Step 3 — Open checkout modal
      // NOTE: @types/razorpay is missing callback_url and redirect — cast to bypass stale type defs
      const rzpOptions: Record<string, unknown> = {
        key: keyId,
        amount,
        currency,
        order_id: orderId,
        name: 'Paper Market Pro',
        description: nextPlan === 'pro' ? 'Pro Plan' : 'Basic Plan',
        callback_url: successUrl,
        redirect: true,
        prefill: {
          email: session?.user?.email ?? '',
          name: session?.user?.name ?? '',
          contact: '',
        },
        method: {
          card: true,
          upi: true,
          netbanking: true,
          wallet: true,
        },
        theme: { color: '#2563eb' },
        modal: {
          ondismiss: () => {
            setIsUpgrading(null);
            toast.error('Payment cancelled.');
          },
        },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          // Immediately show the navigation guard before pushing
          setIsNavigating(true);
          setIsUpgrading(null);
          redirectToSuccess(
            `${successUrl}&order_id=${encodeURIComponent(response.razorpay_order_id)}&payment_id=${encodeURIComponent(response.razorpay_payment_id)}&signature=${encodeURIComponent(response.razorpay_signature)}`
          );
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const rzp = new window.Razorpay(rzpOptions as unknown as RazorpayOptions);

      rzp.open();
      // Close our confirmation modal only AFTER Razorpay has been triggered
      setConfirmModal({ isOpen: false, targetPlan: null });
    } catch {
      toast.error('Failed to initiate payment. Please try again.');
      setIsUpgrading(null);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 md:p-8 lg:p-12 font-sans">
      <div className="max-w-5xl mx-auto space-y-12">
        
        {/* Header Section */}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Subscription Plans
          </h1>
          <p className="text-muted-foreground mt-1">
            Institutional-grade analytics and comprehensive market data for your trading workflow.
          </p>
        </div>

        {/* Current Status Banner */}
        <section className={`rounded-3xl border p-6 flex flex-col sm:flex-row items-center justify-between gap-6 ${
            isExpired ? 'bg-destructive/5 border-destructive/20' : 'bg-card/40 border-border/50 backdrop-blur-xl'
        }`}>
          <div>
            <h3 className="font-bold text-foreground flex items-center gap-3">
              Your Plan: {planLabel}
              <Badge variant={isExpired ? 'destructive' : plan === 'pro' ? 'default' : 'secondary'} className="uppercase text-[10px] tracking-widest">
                {status === 'active' ? 'Active' : 'Expired'}
              </Badge>
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {isExpired 
                ? 'Your access has been restricted. Upgrade to continue using premium features.'
                : isTrialActive 
                  ? `${daysLeft} days remaining in your free trial.`
                  : plan === 'pro' 
                    ? 'You have full access to all features.'
                    : 'Your account is on the basic tier.'
              }
            </p>
          </div>
        </section>

        {/* Pricing Tiers */}
        <div className="grid md:grid-cols-2 gap-8 w-full mt-4">
          
          {/* Basic Tier */}
          <div className={`relative flex flex-col rounded-3xl p-8 border bg-card/40 backdrop-blur-xl ${
            plan === 'basic' && status === 'active' ? 'ring-1 ring-primary border-primary/50' : 'border-border/50'
          }`}>
            <div className="mb-8">
              <h3 className="text-lg font-bold text-foreground">Basic</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span
                  className="text-3xl font-extrabold text-foreground"
                  style={{ fontFamily: "Segoe UI, Noto Sans, Arial, sans-serif" }}
                >
                  {RUPEE}89
                </span>
                <span className="text-sm text-muted-foreground font-medium">/month</span>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Essential tools for paper trading and executing simulated orders.
              </p>
            </div>
            
            <div className="space-y-4 mb-8 flex-grow">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Included Features</div>
              {['Real-time equity & F&O data', 'Simulated order execution', 'Virtual portfolio tracking', 'Configurable watchlists'].map(feature => (
                <div key={feature} className="flex items-center gap-3 text-sm text-foreground">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
              <div className="flex items-center gap-3 text-sm text-muted-foreground pt-2">
                <div className="h-1.5 w-1.5 rounded-full bg-muted flex-shrink-0" />
                <span className="line-through">Advanced analytics</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="h-1.5 w-1.5 rounded-full bg-muted flex-shrink-0" />
                <span className="line-through">Trade journaling</span>
              </div>
            </div>

            <Button
              variant={plan === 'basic' && status === 'active' ? 'outline' : 'secondary'}
              className="w-full rounded-xl py-6 font-semibold mt-auto"
              onClick={() => initiateUpgrade('basic')}
              disabled={plan === 'basic' && status === 'active' || isUpgrading !== null}
            >
              {isUpgrading === 'basic' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {plan === 'basic' && status === 'active' ? 'Current Plan' : 'Select Basic'}
            </Button>
          </div>

          {/* Pro Tier */}
          <div className={`relative flex flex-col rounded-3xl p-8 border bg-card/40 backdrop-blur-xl ${
            plan === 'pro' && status === 'active' ? 'ring-1 ring-primary border-primary/50' : 'border-border/50'
          }`}>
            <div className="mb-8">
              <h3 className="text-lg font-bold text-foreground">Pro</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span
                  className="text-3xl font-extrabold text-foreground"
                  style={{ fontFamily: "Segoe UI, Noto Sans, Arial, sans-serif" }}
                >
                  {RUPEE}149
                </span>
                <span className="text-sm text-muted-foreground font-medium">/month</span>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                The complete suite. Analyze, journal, and perfect your trading strategy.
              </p>
            </div>
            
            <div className="space-y-4 mb-8 flex-grow">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Included Features</div>
              {['Everything in Basic', 'Comprehensive Analytics Dashboard', 'Advanced Trade Journaling system', 'P&L Calendar & Heatmaps', 'CSV Data Export functionality'].map(feature => (
                <div key={feature} className="flex items-center gap-3 text-sm text-foreground font-medium">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl py-6 font-semibold mt-auto"
              onClick={() => initiateUpgrade('pro')}
              disabled={plan === 'pro' && status === 'active' || isUpgrading !== null}
            >
              {isUpgrading === 'pro' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {plan === 'pro' && status === 'active' ? 'Current Plan' : 'Upgrade to Pro'}
            </Button>
          </div>

        </div>

        <Dialog open={confirmModal.isOpen} onOpenChange={(open) => setConfirmModal({ ...confirmModal, isOpen: open })}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm Plan Change</DialogTitle>
              <DialogDescription>
                {confirmModal.targetPlan === 'pro' 
                  ? "You are about to switch to the Pro Plan. This will grant you full access to advanced analytics, trade journaling, and CSV Data Export."
                  : "You are about to select the Basic Plan. This includes essential tools for simulated paper trading and watchlists."}
              </DialogDescription>
            </DialogHeader>
            <div className="py-2 text-sm text-foreground border-y border-border/50">
              {plan === 'free_trial' && (
                <p>Switching now will immediately end your Free Trial and start your new paid subscription.</p>
              )}
              {plan === 'basic' && confirmModal.targetPlan === 'pro' && (
                <p>You are upgrading from your current Basic tier to the full Pro experience. A new billing cycle will begin.</p>
              )}
            </div>
            <DialogFooter className="sm:justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setConfirmModal({ isOpen: false, targetPlan: null })} disabled={isUpgrading !== null}>
                Cancel
              </Button>
              <Button 
                disabled={isUpgrading !== null}
                onClick={() => {
                  const target = confirmModal.targetPlan;
                  if (target) handleUpgrade(target);
                }}
                className="min-w-[140px]"
              >
                {isUpgrading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  "Proceed to Payment"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="pt-8 text-center sm:text-left">
          <p className="text-xs text-muted-foreground font-medium">
            Need help? Contact <a href="mailto:support@papermarket.in" className="text-primary hover:underline">support@papermarket.in</a> for account assistance.
          </p>
        </div>

      </div>
    </div>
  );
}
