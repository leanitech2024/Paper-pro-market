import { chartRegistry } from '@/domains/chart/lib/chart-registry';
import { getMarketWebSocket } from '@/domains/market/lib/market-ws';

export function initializeCandleSubscription() {
    getMarketWebSocket({
        url: process.env.NEXT_PUBLIC_MARKET_ENGINE_WS_URL || 'ws://localhost:4200',
        onCandle: (candleData) => {
            const controller = chartRegistry.get(candleData.instrumentKey);
            controller?.updateCandle(candleData.candle);
        },
        // Explicit undefined — mergeHandlers won't touch existing handlers
        onTick: undefined,
        onConnected: undefined,
        onDisconnected: undefined,
        onError: undefined,
    });
}
