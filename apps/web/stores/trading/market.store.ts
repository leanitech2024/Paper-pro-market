import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { MarketState } from './types';
import { createWatchlistSlice } from './slices/watchlist.slice';
import { createChartDataSlice } from './slices/chart-data.slice';
import { createLiveUpdatesSlice } from './slices/live-updates.slice';

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