import { useCallback, useEffect, useRef, useState } from 'react';
import { useMarketStore } from '@/domains/market/stores/market.store';
import { getMarketWebSocket } from '@/domains/market/lib/market-ws';
import { toCanonicalSymbol, toInstrumentKey } from '@paper-market/core';

const ISIN_LIKE = /^[A-Z]{2}[A-Z0-9]{8,14}$/i;

function resolveMarketWsUrl(): string {
    const configured = String(process.env.NEXT_PUBLIC_MARKET_ENGINE_WS_URL || "").trim();
    if (configured) return configured;
    if (process.env.NODE_ENV !== "production") return "ws://localhost:4200";
    return "";
}

function pickFirstFinite(...values: unknown[]): number | null {
    for (const value of values) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return null;
}

function resolveTradingSymbol(rawSymbol: unknown): string {
    if (typeof rawSymbol !== 'string') return '';

    const input = rawSymbol.trim();
    if (!input) return '';

    // Common case: already tradingsymbol (e.g. "ITC")
    if (!input.includes('|') && !ISIN_LIKE.test(input)) {
        return input;
    }

    const symbolPart = input.includes('|') ? (input.split('|')[1] || input) : input;

    // Some feeds send NSE_EQ|ITC. Use direct symbol if RHS is not ISIN-like.
    if (!ISIN_LIKE.test(symbolPart) && symbolPart) {
        return symbolPart;
    }

    // Fallback: resolve from currently loaded instruments/watchlist.
    const state = useMarketStore.getState();
    const all = [...(state.stocks || []), ...(state.indices || []), ...(state.futures || []), ...(state.options || [])];
    const match = all.find((item) =>
        item.instrumentToken === input ||
        item.instrumentToken === symbolPart ||
        item.instrumentToken?.endsWith(`|${symbolPart}`)
    );

    return match?.symbol || symbolPart || input;
}

export function useMarketConnection(collectDesiredKeys: () => string[]) {
    const [isConnected, setIsConnected] = useState(false);
    const wsRef = useRef<ReturnType<typeof getMarketWebSocket> | null>(null);
    const isConnectedRef = useRef(false);
    const subscribedKeysRef = useRef<Set<string>>(new Set());

    const applyTickRef = useRef(useMarketStore.getState().applyTick);
    const updateLiveCandleRef = useRef(useMarketStore.getState().updateLiveCandle);

    const syncSubscriptions = useCallback(() => {
        const ws = wsRef.current;
        if (!ws || !isConnectedRef.current) return;

        const desired = new Set(collectDesiredKeys());
        const current = subscribedKeysRef.current;
        if (desired.size === current.size && [...desired].every(k => current.has(k))) return;

        const toSubscribe = Array.from(desired).filter(k => !current.has(k));
        const toUnsubscribe = Array.from(current).filter(k => !desired.has(k));

        if (toSubscribe.length > 0) ws.subscribe(toSubscribe);
        if (toUnsubscribe.length > 0) ws.unsubscribe(toUnsubscribe);
        subscribedKeysRef.current = desired;
    }, [collectDesiredKeys]);

    /* eslint-disable react-hooks/exhaustive-deps */
    useEffect(() => {
        // Keep action refs fresh without re-running this effect
        const unsubActions = useMarketStore.subscribe((state) => {
            applyTickRef.current = state.applyTick;
            updateLiveCandleRef.current = state.updateLiveCandle;
        });

        let cancelled = false;

        const handleTick = (tickData: any) => {
            if (process.env.NODE_ENV === 'development') console.log('RAW TICK:', tickData);

            const rawInstrument =
                tickData?.instrumentKey ?? tickData?.instrument_key ??
                tickData?.instrumentToken ?? tickData?.instrument_token ?? tickData?.symbol;

            const instrumentKey = toInstrumentKey(String(rawInstrument || ''));
            if (!instrumentKey) return;

            const tradingSymbol = toCanonicalSymbol(tickData?.symbol) || instrumentKey.split('|')[1] || instrumentKey;
            const price =
                Number(tickData?.price) || Number(tickData?.ltp) || Number(tickData?.last_price) ||
                Number(tickData?.lastTradedPrice) || Number(tickData?.lastPrice) ||
                Number(tickData?.ltpc?.ltp) || Number(tickData?.data?.price) || Number(tickData?.data?.ltp);

            if (!Number.isFinite(price)) return;

            const close = pickFirstFinite(
                tickData?.close, tickData?.cp, tickData?.prevClose, tickData?.prev_close,
                tickData?.ltpc?.cp, tickData?.data?.close
            );
            const timestamp = pickFirstFinite(
                tickData?.timestamp, tickData?.ts, tickData?.time, tickData?.ltt,
                tickData?.ltpc?.ltt, tickData?.data?.timestamp
            );

            applyTickRef.current({
                instrumentKey,
                symbol: tradingSymbol,
                price,
                close: close && close > 0 ? close : undefined,
                timestamp: timestamp && timestamp > 0 ? timestamp : undefined,
            });
        };

        const handleCandle = (candleData: any) => {
            const { candle, instrumentKey: rawKey, symbol: rawSymbol } = candleData;
            const instrumentKey = toInstrumentKey(rawKey);
            const tradingSymbol = toCanonicalSymbol(resolveTradingSymbol(rawSymbol || rawKey));
            if (!instrumentKey || !tradingSymbol) return;
            updateLiveCandleRef.current({ price: candle.close, volume: candle.volume || 0, time: candle.time }, tradingSymbol, instrumentKey);
        };

        const connect = async () => {
            if (cancelled) return;

            const wsUrl = resolveMarketWsUrl();
            if (!wsUrl) { setIsConnected(false); return; }

            const ws = getMarketWebSocket({
                url: wsUrl,
                onTick: handleTick,
                onCandle: handleCandle,
                onConnected: () => {
                    isConnectedRef.current = true;
                    setIsConnected(true);
                    syncSubscriptions();
                },
                onDisconnected: () => {
                    isConnectedRef.current = false;
                    setIsConnected(false);
                    subscribedKeysRef.current = new Set();
                },
                onError: () => {
                    isConnectedRef.current = false;
                    setIsConnected(false);
                    subscribedKeysRef.current = new Set();
                },
            });
            wsRef.current = ws;
            ws.connect();
        };

        connect();

        return () => {
            cancelled = true;
            unsubActions();
            subscribedKeysRef.current = new Set();
            isConnectedRef.current = false;
        };
    }, []); // ← empty, truly runs once
    /* eslint-enable react-hooks/exhaustive-deps */

    return { isConnected, syncSubscriptions };
}
