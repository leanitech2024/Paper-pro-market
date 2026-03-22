"use client";
import { useEffect, useState } from 'react';
import { useSubscriptionStore } from '@/stores/subscription.store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const RUPEE = "\u20B9";

export default function SubscriptionPage() {
  const { plan, status, isTrialActive, trialEndDate, fetchSubscription, hasFetched } = useSubscriptionStore();
  const [isUpgrading, setIsUpgrading] = useState<null | 'basic' | 'pro'>(null);

  useEffect(() => {
    if (!hasFetched) fetchSubscription();
  }, [hasFetched, fetchSubscription]);

  const daysLeft = trialEndDate
    ? Math.max(0, Math.ceil((new Date(trialEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const isExpired = status === 'expired' || status === 'cancelled';
  const planLabel = plan === 'free_trial' ? 'Free Trial' : plan === 'basic' ? 'Basic' : 'Pro';

  const handleUpgrade = async (nextPlan: 'basic' | 'pro') => {
    if (isUpgrading) return;
    setIsUpgrading(nextPlan);
    try {
      const res = await fetch('/api/v1/subscription/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: nextPlan }),
      });
      if (!res.ok) throw new Error('Upgrade failed');
      await fetchSubscription();
      toast.success(`Upgraded to ${nextPlan === 'basic' ? 'Basic' : 'Pro'}`);
    } catch (error) {
      toast.error('Upgrade failed. Please try again.');
    } finally {
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
              onClick={() => handleUpgrade('basic')}
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
              onClick={() => handleUpgrade('pro')}
              disabled={plan === 'pro' && status === 'active' || isUpgrading !== null}
            >
              {isUpgrading === 'pro' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {plan === 'pro' && status === 'active' ? 'Current Plan' : 'Upgrade to Pro'}
            </Button>
          </div>

        </div>

        <div className="pt-8 text-center sm:text-left">
          <p className="text-xs text-muted-foreground font-medium">
            Need help? Contact <a href="mailto:support@papermarket.in" className="text-primary hover:underline">support@papermarket.in</a> for account assistance.
          </p>
        </div>

      </div>
    </div>
  );
}
