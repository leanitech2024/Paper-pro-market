import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { MarketState } from '@/domains/trading/types/trading.types';
import { createWatchlistSlice } from '@/domains/watchlist/stores/watchlist.slice';
import { createChartDataSlice } from './chart-data.slice';
import { createLiveUpdatesSlice } from './live-updates.slice';

// ─────────────────────────────────────────────────────────────────
// 🏗️ Root Store Assembly
// ─────────────────────────────────────────────────────────────────
// Combines all slices into a single unified store
export const useMarketStore = create<MarketState>()(
    subscribeWithSelector((...a) => ({
        ...createWatchlistSlice(...a),
        ...createChartDataSlice(...a),
        ...createLiveUpdatesSlice(...a),
    }))
);