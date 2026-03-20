import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, X, Sparkles, Crown } from "lucide-react";
import Link from "next/link";

const plans = [
  {
    name: "Free Trial",
    price: "₹0",
    period: "/3 days",
    description: "Test drive the platform with no commitment",
    buttonText: "Start Free Trial",
    badge: "3-day free trial",
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
    popular: false,
  },
  {
    name: "Basic",
    price: "₹89",
    period: "/month",
    description: "Essential features for learning paper trading",
    buttonText: "Start with Basic",
    badge: "Starter",
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
    popular: false,
  },
  {
    name: "Pro",
    price: "₹149",
    period: "/month",
    description: "All features for serious traders & strategy testing",
    buttonText: "Upgrade to Pro",
    badge: "Pro",
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
    popular: true,
  },
];

const PricingSection = () => {
  return (
    <section
      id="pricing"
      className="py-20 bg-blue-50/45 dark:bg-background transition-colors duration-300"
    >
      <div className="container mx-auto px-4">
        {/* Section Tag */}
        <div className="flex justify-center mb-6">
          <span className="px-4 py-2 bg-muted/50 text-muted-foreground rounded-full text-sm font-medium">
            Pricing
          </span>
        </div>

        {/* Heading */}
        <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-4">
          Simple, Affordable Plans
        </h2>
        <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
          Start with a 3-day free trial. Pick the plan that fits your learning
          journey.
        </p>

        {/* Pricing Cards */}
        <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <Card
              key={index}
              className={`rounded-[32px] transition-all relative overflow-hidden ${
                plan.popular
                  ? "bg-card border-primary/50 scale-105 shadow-lg shadow-primary/10"
                  : "bg-card/50 backdrop-blur-sm border-border/30"
              }`}
            >
              <CardContent className="p-8">
                {/* Trial Badge */}
                <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-4">
                  {plan.badge}
                </span>

                {/* Plan Name */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg font-semibold text-foreground">
                    {plan.name}
                  </span>
                  {plan.popular && (
                    <span className="ml-auto px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-primary/10 text-primary">
                      Popular
                    </span>
                  )}
                </div>

                {/* Price */}
                <div className="mb-4">
                  <span className="text-4xl font-bold text-foreground">
                    {plan.price}
                  </span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>

                <p className="text-muted-foreground text-sm mb-6">
                  {plan.description}
                </p>

                {/* CTA Button */}
                <Link href="/signup">
                  <Button
                    className={`w-full rounded-full mb-6 ${
                      plan.popular
                        ? "bg-primary hover:bg-primary/90"
                        : "bg-muted hover:bg-muted/80 text-foreground"
                    }`}
                  >
                    {plan.buttonText}
                  </Button>
                </Link>

                {/* Features */}
                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      {feature.included ? (
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                      )}
                      <span
                        className={
                          feature.included
                            ? "text-muted-foreground text-sm"
                            : "text-muted-foreground/50 text-sm line-through"
                        }
                      >
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

      </div>
    </section>
  );
};

export default PricingSection;
