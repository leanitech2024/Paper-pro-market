import { useCallback, useEffect, useRef, useState } from 'react';
import { useMarketStore } from '@/stores/trading/market.store';
import { usePositionsStore } from '@/stores/trading/positions.store';
import { getMarketWebSocket } from '@/lib/market-ws';
import { toCanonicalSymbol, toInstrumentKey } from '@paper-market/core';
import { TICKER_CONFIG } from '@/lib/ticker-config';

const ISIN_LIKE = /^[A-Z]{2}[A-Z0-9]{8,14}$/i;
const TICKER_KEYS = TICKER_CONFIG.map(cfg => cfg.instrumentKey).filter(Boolean);
const QUOTE_REFRESH_INTERVAL_MS = 20_000;
const QUOTE_REQUEST_BATCH_SIZE = 80;

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

function chunk<T>(arr: T[], size: number): T[][] {
    if (size <= 0) return [arr];
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        out.push(arr.slice(i, i + size));
    }
    return out;
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

export const useMarketStream = () => {
    const [isConnected, setIsConnected] = useState(false);
    const wsRef = useRef<ReturnType<typeof getMarketWebSocket> | null>(null);
    const subscribedKeysRef = useRef<Set<string>>(new Set());
    const isConnectedRef = useRef(false);

    // Stable function refs
    const applyTickRef = useRef(useMarketStore.getState().applyTick);
    const hydrateQuotesRef = useRef(useMarketStore.getState().hydrateQuotes);
    const updateLiveCandleRef = useRef(useMarketStore.getState().updateLiveCandle);

    // collectDesiredKeys is already reading getState() — fully stable, no deps
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

    const refreshQuotesFromApi = useCallback(async (requestedKeys: string[]) => {
        const normalizedKeys = Array.from(
            new Set(requestedKeys.map((k) => toInstrumentKey(k)).filter((k): k is string => Boolean(k)))
        );
        if (normalizedKeys.length === 0) return;

        // Build a map from human-readable key suffix → symbol name.
        // e.g., TICKER_CONFIG sends "NSE_EQ|RELIANCE" → symbolHintMap.set("NSE_EQ|RELIANCE", "RELIANCE")
        // This lets us annotate ISIN-keyed API responses with the human symbol name.
        const symbolHintMap = new Map<string, string>();
        for (const k of requestedKeys) {
            const normalized = toInstrumentKey(k);
            if (!normalized) continue;
            const parts = normalized.split('|');
            const suffix = parts[1] ?? '';
            if (suffix && !/^[A-Z]{2}[A-Z0-9]{8,14}$/.test(suffix)) {
                // suffix is a human name (e.g. "RELIANCE"), not an ISIN
                symbolHintMap.set(normalized, suffix);
            }
        }

        const hydrated: Array<{ instrumentKey: string; symbol?: string; price: number; close?: number; timestamp?: number }> = [];
        const batches = chunk(normalizedKeys, QUOTE_REQUEST_BATCH_SIZE);

        for (const instrumentKeys of batches) {
            try {
                const response = await fetch('/api/v1/market/quotes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ instrumentKeys }),
                    cache: 'no-store',
                });
                if (!response.ok) continue;

                const payload = await response.json();
                const quoteMap = payload?.data;
                if (!payload?.success || !quoteMap) continue;

                const now = Date.now();
                for (const [rawKey, quote] of Object.entries(quoteMap)) {
                    const instrumentKey = toInstrumentKey(rawKey);
                    const price = Number((quote as any)?.last_price);
                    if (!instrumentKey || !Number.isFinite(price) || price <= 0) continue;
                    const close = Number((quote as any)?.close_price);

                    // Prefer human hint if available; otherwise the raw suffix (may be ISIN)
                    const rawSuffix = instrumentKey.split('|')[1] || instrumentKey;
                    const symbolHint = symbolHintMap.get(instrumentKey) ?? rawSuffix;

                    hydrated.push({
                        instrumentKey,
                        symbol: symbolHint,
                        price,
                        close: Number.isFinite(close) && close > 0 ? close : undefined,
                        timestamp: now,
                    });
                }
            } catch { /* best-effort */ }
        }

        if (hydrated.length > 0) hydrateQuotesRef.current(hydrated);
    }, []); // ← no deps, uses ref

    // ── Effect 1: One-time WS setup (empty deps — never re-runs) ──────
    useEffect(() => {
        // Keep action refs fresh without re-running this effect
        const unsubActions = useMarketStore.subscribe((state) => {
            applyTickRef.current = state.applyTick;
            hydrateQuotesRef.current = state.hydrateQuotes;
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
            try {
                if (cancelled) return;
                const snapshotRes = await fetch('/api/v1/market/snapshot', { cache: 'no-store' });
                if (!cancelled && snapshotRes.ok) {
                    const snapshot = await snapshotRes.json();
                    if (snapshot?.success && Array.isArray(snapshot?.data?.quotes)) {
                        hydrateQuotesRef.current(snapshot.data.quotes);
                    }
                }
            } catch { /* best-effort snapshot pre-hydration — failures do not block WS connect */ }

            if (cancelled) return;
            await refreshQuotesFromApi(TICKER_KEYS);
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
            // DO NOT call ws.unsubscribe or ws.disconnect here
            // The singleton persists across Strict Mode remounts
            // Subscriptions are re-synced on reconnect via onConnected callback
            subscribedKeysRef.current = new Set();
            isConnectedRef.current = false;
        };
    }, []); // ← empty, truly runs once

    // ── Effect 2: Re-sync subscriptions when instrument universe changes ──
    // Uses Zustand's subscribeWithSelector to avoid firing on price ticks —
    // only fires when the actual list of instruments changes
    useEffect(() => {
        // Subscribe to structural changes only (watchlist items, positions)
        // NOT quotesByInstrument which changes on every tick
        const unsubWatchlist = useMarketStore.subscribe(
            (state) => (state.stocks || []).map(s => s.instrumentToken).join(','),
            () => syncSubscriptions()
        );
        const unsubPositions = usePositionsStore.subscribe(
            (state) => (state.positions || []).map(p => p.instrumentToken).join(','),
            () => syncSubscriptions()
        );
        const unsubChart = useMarketStore.subscribe(
            (state) => state.simulatedInstrumentKey,
            () => syncSubscriptions()
        );

        return () => {
            unsubWatchlist();
            unsubPositions();
            unsubChart();
        };
    }, [syncSubscriptions]);

    // ── Effect 3: Polling fallback ─────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        const poll = async () => {
            if (cancelled || wsRef.current?.isConnected()) return;
            const keys = collectDesiredKeys();
            if (keys.length > 0) await refreshQuotesFromApi(keys);
        };
        void poll();
        const interval = setInterval(() => void poll(), QUOTE_REFRESH_INTERVAL_MS);
        return () => { cancelled = true; clearInterval(interval); };
    }, [collectDesiredKeys, refreshQuotesFromApi]);

    return { isConnected };
};
