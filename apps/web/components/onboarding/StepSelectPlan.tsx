"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Check, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface StepSelectPlanProps {
  onNext: () => void;
}

const RUPEE = "\u20B9";

const plans = [
  {
    id: "free_trial",
    name: "Free Trial",
    price: `${RUPEE}0`,
    period: "/3 days",
    description: "3-day free trial with full access",
    features: [
      { text: "Virtual trading account", included: true },
      { text: "Real-time price charts", included: true },
      { text: "Unlimited paper trades", included: true },
      { text: "Positions & orders tracking", included: true },
      { text: "Watchlist management", included: true },
      { text: "Analytics dashboard", included: true },
      { text: "Trade journal", included: true },
      { text: "Export data (CSV)", included: true },
    ],
    color: "zinc",
    cta: "Start Free Trial",
    recommended: false,
  },
  {
    id: "basic",
    name: "Basic",
    price: `${RUPEE}89`,
    period: "/month",
    description: "Essential features for learning paper trading",
    features: [
      { text: "Virtual trading account", included: true },
      { text: "Real-time price charts", included: true },
      { text: "Unlimited paper trades", included: true },
      { text: "Positions & orders tracking", included: true },
      { text: "Watchlist management", included: true },
      { text: "Analytics dashboard", included: false },
      { text: "Trade journal", included: false },
      { text: "Export data (CSV)", included: false },
    ],
    color: "green",
    cta: "Select Basic",
    recommended: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: `${RUPEE}149`,
    period: "/month",
    description: "Full access for serious traders",
    features: [
      { text: "Everything in Basic", included: true },
      { text: "Advanced analytics dashboard", included: true },
      { text: "Trade journal & performance log", included: true },
      { text: "Financial ledger view", included: true },
      { text: "Export data (CSV)", included: true },
      { text: "Weekly performance review", included: true },
      { text: "Equity curve & win/loss charts", included: true },
      { text: "Priority support", included: true },
    ],
    color: "blue",
    cta: "Select Pro",
    recommended: true,
  },
] as const;

export function StepSelectPlan({ onNext }: StepSelectPlanProps) {
  const { update } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleSelectPlan = async (plan: string) => {
    setSelectedPlan(plan);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/subscription/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      if (!res.ok) throw new Error("Failed to select plan");

      await update({ subscriptionStatus: 'active' });

      toast.success(`${plan === "free_trial" ? "Trial" : plan} plan selected`);
      onNext();
    } catch (error) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
      setSelectedPlan(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <h2 className="text-3xl font-bold">Choose your plan</h2>
        <p className="text-zinc-400">Select the plan that best fits your trading needs.</p>
      </div>

      <div className="mx-auto w-full max-w-6xl">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`flex flex-col relative overflow-hidden rounded-2xl ${
                plan.recommended
                  ? "border-blue-600/50 bg-blue-950/20"
                  : "border-zinc-800 bg-zinc-900/50"
              }`}
            >
              {plan.recommended && (
                <div className="absolute top-0 right-0 bg-blue-600 text-[10px] font-bold px-3 py-1 uppercase tracking-wider rounded-bl-lg">
                  Recommended
                </div>
              )}
              <CardHeader className="pb-2">
                <CardTitle className={plan.recommended ? "text-blue-500" : ""}>
                  {plan.name}
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  {plan.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 pt-2">
                <div
                  className="text-3xl font-bold leading-none mb-4"
                  style={{ fontFamily: "Segoe UI, Noto Sans, Arial, sans-serif" }}
                >
                  {plan.price}
                  {plan.period ? (
                    <span className="text-sm text-zinc-500 font-normal">{plan.period}</span>
                  ) : null}
                </div>
                <ul className="space-y-2 text-[13px] leading-5">
                  {plan.features.map((feature) => (
                    <li key={feature.text} className="flex items-start gap-2">
                      {feature.included ? (
                        <Check
                          className={`mt-0.5 h-4 w-4 flex-shrink-0 ${
                            plan.recommended ? "text-blue-500" : "text-green-500"
                          }`}
                        />
                      ) : (
                        <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-zinc-500/60" />
                      )}
                      <span
                        className={
                          feature.included
                            ? "text-zinc-400"
                            : "text-zinc-500/60 line-through"
                        }
                      >
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className={`w-full ${plan.recommended ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                  variant={plan.recommended ? "default" : "outline"}
                  disabled={isSubmitting}
                  onClick={() => handleSelectPlan(plan.id)}
                >
                  {isSubmitting && selectedPlan === plan.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {plan.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
