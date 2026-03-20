import { create } from 'zustand';

interface SubscriptionState {
    plan: string;
    status: string;
    isTrialActive: boolean;
    isTrialExpired: boolean;
    trialEndDate: string | null;
    isLoading: boolean;
    hasFetched: boolean;

    fetchSubscription: () => Promise<void>;
    hasAccess: (feature: 'analytics' | 'journal' | 'export') => boolean;
}

/** Features each plan grants access to */
const PLAN_ACCESS: Record<string, Set<string>> = {
    free_trial: new Set(['analytics', 'journal', 'export']),
    basic: new Set([]),
    pro: new Set(['analytics', 'journal', 'export']),
};

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
    plan: 'free_trial',
    status: 'active',
    isTrialActive: true,
    isTrialExpired: false,
    trialEndDate: null,
    isLoading: false,
    hasFetched: false,

    fetchSubscription: async () => {
        if (get().isLoading) return;
        set({ isLoading: true });

        try {
            const res = await fetch('/api/v1/subscription');
            if (!res.ok) {
                // eslint-disable-next-line no-console
                console.warn('[subscription.store] Failed to fetch subscription, status:', res.status);
                return;
            }

            const data: unknown = await res.json();
            if (typeof data === 'object' && data !== null && 'plan' in data) {
                const d = data as {
                    plan: string;
                    status: string;
                    isTrialActive: boolean;
                    isTrialExpired: boolean;
                    trialEndDate: string | null;
                };
                set({
                    plan: d.plan,
                    status: d.status,
                    isTrialActive: d.isTrialActive,
                    isTrialExpired: d.isTrialExpired,
                    trialEndDate: d.trialEndDate,
                    hasFetched: true,
                });
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('[subscription.store] Error fetching subscription:', error);
        } finally {
            set({ isLoading: false });
        }
    },

    hasAccess: (feature: 'analytics' | 'journal' | 'export') => {
        const { plan, status } = get();
        if (status !== 'active') return false;
        return PLAN_ACCESS[plan]?.has(feature) ?? false;
    },
}));
