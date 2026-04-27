import { useCallback } from 'react';
import { useMarketStore } from '@/domains/market/stores/market.store';
import { usePositionsStore } from '@/domains/trading/stores/positions.store';
import { toInstrumentKey } from '@paper-market/core';
import { TICKER_CONFIG } from '@/domains/market/lib/ticker-config';

import { useMarketConnection } from '@/domains/market/hooks/useMarketConnection';
import { useMarketData } from '@/domains/market/hooks/useMarketData';

const TICKER_KEYS = TICKER_CONFIG.map(cfg => cfg.instrumentKey).filter(Boolean);

export const useMarketStream = (userId?: string | null) => {
    // collectDesiredKeys is purely reading Zustand state — fully stable, no deps
    const collectDesiredKeys = useCallback((): string[] => {
        const state = useMarketStore.getState();
        const posState = usePositionsStore.getState();
        const keys = new Set<string>();

        for (const item of [...(state.stocks||[]), ...(state.indices||[]), ...(state.futures||[]), ...(state.options||[])]) {
            const key = toInstrumentKey(item.instrumentToken || item.symbol || '');
            if (key) keys.add(key);
        }
        for (const key of TICKER_KEYS) keys.add(key);

        const chartKey = toInstrumentKey(state.simulatedInstrumentKey || state.simulatedSymbol || '');
        if (chartKey) keys.add(chartKey);

        for (const pos of (posState.positions || [])) {
            const key = toInstrumentKey(pos.instrumentToken || pos.symbol || '');
            if (key) keys.add(key);
        }

        const arr = Array.from(keys);
        if (arr.length > 150) return arr.slice(0, 150);
        return arr;
    }, []);

    // 1. Connection Hook: handles WS setup, teardown, reconnects, tick/candle events
    const { isConnected, syncSubscriptions } = useMarketConnection(collectDesiredKeys, userId);

    // 2. Data Hook: handles snapshot fetch, polling, store hydration
    const { staleWarning } = useMarketData(collectDesiredKeys, syncSubscriptions);

    return { isConnected, staleWarning };
};
