import { create } from 'zustand';

interface SubscriptionState {
    plan: string;
    status: string;
    isTrialActive: boolean;
    isTrialExpired: boolean;
    trialEndDate: string | null;
    isLoading: boolean;
    hasFetched: boolean;
    lastFetchedAt: number;

    fetchSubscription: (force?: boolean) => Promise<void>;
    seedFromSession: (plan: string, status: string) => void;
    hasAccess: (feature: 'analytics' | 'journal' | 'export') => boolean;
}

/** Features each plan grants access to */
const PLAN_ACCESS: Record<string, Set<string>> = {
    free_trial: new Set(['analytics', 'journal', 'export']),
    basic: new Set([]),
    pro: new Set(['analytics', 'journal', 'export']),
};

// Module-level singleton — deduplicates concurrent calls across components
let _fetchPromise: Promise<void> | null = null;

// How long fetched data is considered fresh
const STALE_MS = 5 * 60 * 1000; // 5 minutes

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
    plan: 'free_trial',
    status: 'active',
    isTrialActive: true,
    isTrialExpired: false,
    trialEndDate: null,
    isLoading: false,
    hasFetched: false,
    lastFetchedAt: 0,

    fetchSubscription: async (force = false) => {
        const { hasFetched, lastFetchedAt, isLoading } = get();

        // Data is still fresh — skip (unless forced)
        if (!force && hasFetched && Date.now() - lastFetchedAt < STALE_MS) return;

        // Already in-flight — skip
        if (isLoading) return;

        // Deduplicate concurrent calls from multiple components
        if (_fetchPromise) return _fetchPromise;

        set({ isLoading: true });
        _fetchPromise = (async () => {
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
                        lastFetchedAt: Date.now(),
                    });
                }
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error('[subscription.store] Error fetching subscription:', error);
            } finally {
                set({ isLoading: false });
                _fetchPromise = null;
            }
        })();

        return _fetchPromise;
    },

    seedFromSession: (plan: string, status: string) => {
        // Only seed if we haven't fetched real data yet — avoids overwriting fresh API data
        if (!get().hasFetched) {
            set({ plan, status });
        }
    },

    hasAccess: (feature: 'analytics' | 'journal' | 'export') => {
        const { plan, status } = get();
        if (status !== 'active') return false;
        return PLAN_ACCESS[plan]?.has(feature) ?? false;
    },
}))
