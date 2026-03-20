'use client';

import { useEffect } from 'react';
import { useSubscriptionStore } from '@/stores/subscription.store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Crown, Lock, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface UpgradeGateProps {
    feature: 'analytics' | 'journal' | 'export';
    children: React.ReactNode;
}

const FEATURE_LABELS: Record<string, string> = {
    analytics: 'Analytics',
    journal: 'Journal',
    export: 'Export Data',
};

export function UpgradeGate({ feature, children }: UpgradeGateProps) {
    const { hasAccess, fetchSubscription, hasFetched, isLoading, plan, status } = useSubscriptionStore();

    useEffect(() => {
        if (!hasFetched) {
            fetchSubscription();
        }
    }, [hasFetched, fetchSubscription]);

    // While loading, show the content (optimistic)
    if (isLoading && !hasFetched) {
        return <>{children}</>;
    }

    // If user has access, render children
    if (hasAccess(feature)) {
        return <>{children}</>;
    }

    const featureLabel = FEATURE_LABELS[feature] ?? feature;
    const isTrialExpired = plan === 'free_trial' && status === 'expired';

    return (
        <div className="flex items-center justify-center min-h-[60vh] p-4 md:p-8">
            <Card className="max-w-lg w-full border-border/50 bg-gradient-to-br from-card via-card to-primary/5 shadow-xl">
                <CardContent className="p-8 text-center space-y-6">
                    {/* Icon */}
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                        <Lock className="h-8 w-8 text-primary" />
                    </div>

                    {/* Title */}
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-foreground">
                            {isTrialExpired ? 'Free Trial Expired' : `Upgrade to Access ${featureLabel}`}
                        </h2>
                        <p className="text-muted-foreground">
                            {isTrialExpired
                                ? `Your 3-day free trial has ended. Upgrade to the Pro plan to continue using ${featureLabel} and other premium features.`
                                : `${featureLabel} is available on the Pro plan. Upgrade now to unlock advanced features.`
                            }
                        </p>
                    </div>

                    {/* Plan comparison */}
                    <div className="grid gap-3 text-left">
                        <div className="flex items-center gap-3 rounded-lg bg-muted/30 p-3">
                            <Sparkles className="h-5 w-5 text-amber-500 flex-shrink-0" />
                            <div>
                                <p className="font-medium text-foreground text-sm">Basic — ₹89/month</p>
                                <p className="text-xs text-muted-foreground">Trading, positions, orders, watchlist</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-lg bg-primary/10 p-3 ring-1 ring-primary/20">
                            <Crown className="h-5 w-5 text-primary flex-shrink-0" />
                            <div>
                                <p className="font-medium text-foreground text-sm">Pro — ₹149/month</p>
                                <p className="text-xs text-muted-foreground">Everything + Analytics, Journal & Export</p>
                            </div>
                        </div>
                    </div>

                    {/* CTA */}
                    <div className="space-y-3">
                        <Link href="/subscription">
                            <Button className="w-full bg-primary hover:bg-primary/90 font-medium" size="lg">
                                <Crown className="h-4 w-4 mr-2" />
                                Upgrade to Pro
                            </Button>
                        </Link>
                        <p className="text-xs text-muted-foreground">
                            Cancel anytime. No questions asked.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
