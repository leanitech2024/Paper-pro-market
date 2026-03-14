"use client";
import { useEffect } from 'react';
import { useMarketStore } from '@/stores/trading/market.store';
import { useTradeExecutionStore } from '@/stores/trading/tradeExecution.store';
import { useDebounce } from 'use-debounce';

export function TradeEngine() {
    // Select specific state to minimize re-renders
    const simulatedToken = useMarketStore(s => s.simulatedSymbol); // Renamed from simulatedSymbol to simulatedToken for clarity with quotesByInstrument
    const livePriceStr = useMarketStore((state) => state.quotesByInstrument[simulatedToken || '']?.price);
    const livePrice = Number(livePriceStr || 0);
    const processTick = useTradeExecutionStore(s => s.processTick);

    // We should debounce processing to prevent excessive re-renders when ticks are coming in rapidly
    const [debouncedLivePrice] = useDebounce(livePrice, 50);

    // Listen to market ticks
    useEffect(() => {
        if (debouncedLivePrice > 0 && simulatedToken) {
            // Pass the tick to execution engine
            processTick(debouncedLivePrice, simulatedToken);
        }
    }, [simulatedToken, debouncedLivePrice, processTick]);

    return null; // Headless
}
