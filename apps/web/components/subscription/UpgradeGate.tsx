'use client';

import { useEffect } from 'react';
import { useSubscriptionStore } from '@/domains/platform/stores/subscription.store';
import { useRouter } from 'next/navigation';

interface UpgradeGateProps {
    feature: 'analytics' | 'journal' | 'export';
    children: React.ReactNode;
}

export function UpgradeGate({ feature, children }: UpgradeGateProps) {
    const { hasAccess, fetchSubscription, hasFetched, isLoading } = useSubscriptionStore();
    const router = useRouter();

    useEffect(() => {
        if (!hasFetched) {
            fetchSubscription();
        }
    }, [hasFetched, fetchSubscription]);

    useEffect(() => {
        if (isLoading || !hasFetched) return;
        if (!hasAccess(feature)) {
            router.replace('/subscription');
        }
    }, [isLoading, hasFetched, feature, hasAccess, router]);

    if (!hasFetched || isLoading) return null;
    if (!hasAccess(feature)) return null;
    return <>{children}</>;
}
