import { useCallback, useEffect, useRef } from 'react';
import { useMarketStore } from '@/domains/market/stores/market.store';
import { usePositionsStore } from '@/domains/trading/stores/positions.store';
import { toInstrumentKey } from '@paper-market/core';
import { TICKER_CONFIG } from '@/domains/market/lib/ticker-config';

const TICKER_KEYS = TICKER_CONFIG.map(cfg => cfg.instrumentKey).filter(Boolean);
const QUOTE_REFRESH_INTERVAL_MS = 20_000;
const QUOTE_REQUEST_BATCH_SIZE = 80;
const QUOTE_MIN_INTERVAL_MS = 1500;
const SNAPSHOT_DELAY_MS = 800;

function chunk<T>(arr: T[], size: number): T[][] {
    if (size <= 0) return [arr];
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        out.push(arr.slice(i, i + size));
    }
    return out;
}

export function useMarketData(
    collectDesiredKeys: () => string[],
    syncSubscriptions: () => void
) {
    const pendingQuoteKeysRef = useRef<Set<string>>(new Set());
    const isFetchingQuotesRef = useRef(false);
    const quoteDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastQuoteFetchAtRef = useRef(0);
    const snapshotRequestedRef = useRef(false);
    const snapshotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const hydrateQuotesRef = useRef(useMarketStore.getState().hydrateQuotes);

    useEffect(() => {
        const unsubActions = useMarketStore.subscribe((state) => {
            hydrateQuotesRef.current = state.hydrateQuotes;
        });
        return () => unsubActions();
    }, []);

    const fetchQuotesFromApi = useCallback(async (requestedKeys: string[], source: string) => {
        const normalizedKeys = Array.from(
            new Set(requestedKeys.map((k) => toInstrumentKey(k)).filter((k): k is string => Boolean(k)))
        );
        if (normalizedKeys.length === 0) return;

        const symbolHintMap = new Map<string, string>();
        for (const k of requestedKeys) {
            const normalized = toInstrumentKey(k);
            if (!normalized) continue;
            const parts = normalized.split('|');
            const suffix = parts[1] ?? '';
            if (suffix && !/^[A-Z]{2}[A-Z0-9]{8,14}$/.test(suffix)) {
                symbolHintMap.set(normalized, suffix);
            }
        }

        const hydrated: Array<{ instrumentKey: string; symbol?: string; price: number; close?: number; timestamp?: number }> = [];
        const batches = chunk(normalizedKeys, QUOTE_REQUEST_BATCH_SIZE);

        const results = await Promise.all(
            batches.map(async (instrumentKeys) => {
                try {
                    const traceId = typeof crypto !== "undefined" && "randomUUID" in crypto
                        ? crypto.randomUUID()
                        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
                    const response = await fetch('/api/v1/market/quotes', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ instrumentKeys, source, traceId }),
                        cache: 'no-store',
                    });
                    if (!response.ok) return [];

                    const payload = await response.json();
                    const quoteMap = payload?.data;
                    if (!payload?.success || !quoteMap) return [];

                    const now = Date.now();
                    const batchHydrated: Array<{ instrumentKey: string; symbol?: string; price: number; close?: number; timestamp?: number }> = [];
                    for (const [rawKey, quote] of Object.entries(quoteMap)) {
                        const instrumentKey = toInstrumentKey(rawKey);
                        const price = Number((quote as any)?.last_price);
                        if (!instrumentKey || !Number.isFinite(price) || price <= 0) continue;
                        const close = Number((quote as any)?.close_price);

                        const rawSuffix = instrumentKey.split('|')[1] || instrumentKey;
                        const symbolHint = symbolHintMap.get(instrumentKey) ?? rawSuffix;

                        batchHydrated.push({
                            instrumentKey,
                            symbol: symbolHint,
                            price,
                            close: Number.isFinite(close) && close > 0 ? close : undefined,
                            timestamp: now,
                        });
                    }
                    return batchHydrated;
                } catch {
                    return [];
                }
            })
        );

        for (const batch of results) {
            if (batch.length > 0) hydrated.push(...batch);
        }

        if (hydrated.length > 0) hydrateQuotesRef.current(hydrated);
    }, []);

    const flushQuoteQueue = useCallback(async (source: string) => {
        if (isFetchingQuotesRef.current) return;
        const keys = Array.from(pendingQuoteKeysRef.current);
        if (keys.length === 0) return;

        pendingQuoteKeysRef.current.clear();
        isFetchingQuotesRef.current = true;

        try {
            lastQuoteFetchAtRef.current = Date.now();
            await fetchQuotesFromApi(keys, source);
        } finally {
            isFetchingQuotesRef.current = false;
            if (pendingQuoteKeysRef.current.size > 0) {
                queueQuotesRefresh(Array.from(pendingQuoteKeysRef.current), `${source}-drain`);
            }
        }
    }, [fetchQuotesFromApi]);

    const queueQuotesRefresh = useCallback((requestedKeys: string[], source: string) => {
        for (const key of requestedKeys) {
            const normalized = toInstrumentKey(key);
            if (normalized) pendingQuoteKeysRef.current.add(normalized);
        }

        if (isFetchingQuotesRef.current) {
            return;
        }

        if (quoteDebounceTimerRef.current) {
            clearTimeout(quoteDebounceTimerRef.current);
        }

        const now = Date.now();
        const sinceLastFetch = now - lastQuoteFetchAtRef.current;
        const minDelay = sinceLastFetch < QUOTE_MIN_INTERVAL_MS
            ? QUOTE_MIN_INTERVAL_MS - sinceLastFetch
            : 0;
        const debounceMs = Math.max(minDelay, sinceLastFetch < 300 ? 500 : 350);

        quoteDebounceTimerRef.current = setTimeout(() => {
            quoteDebounceTimerRef.current = null;
            void flushQuoteQueue(source);
        }, debounceMs);
    }, [flushQuoteQueue]);

    useEffect(() => {
        let cancelled = false;

        snapshotTimerRef.current = setTimeout(() => {
            void (async () => {
                if (cancelled) return;

                const hasAnyQuotes = Object.keys(useMarketStore.getState().quotesByInstrument || {}).length > 0;
                if (!hasAnyQuotes && !snapshotRequestedRef.current) {
                    snapshotRequestedRef.current = true;
                    let snapshotFailed = false;

                    try {
                        const snapshotRes = await fetch('/api/v1/market/snapshot', { cache: 'no-store' });
                        if (!cancelled && snapshotRes.ok) {
                            const snapshot = await snapshotRes.json();
                            if (snapshot?.success && Array.isArray(snapshot?.data?.quotes)) {
                                hydrateQuotesRef.current(snapshot.data.quotes);
                            }
                        } else {
                            snapshotFailed = true;
                        }
                    } catch {
                        snapshotFailed = true;
                    }

                    if (snapshotFailed) {
                        snapshotRequestedRef.current = false;
                    }
                }

                if (cancelled) return;
                const quotesByInstrument = useMarketStore.getState().quotesByInstrument;
                const missingTickerKeys = TICKER_KEYS.filter((k) => {
                    const normalized = toInstrumentKey(k);
                    const quote = normalized ? quotesByInstrument[normalized] : undefined;
                    return !quote || !Number.isFinite(Number(quote.price)) || Number(quote.price) <= 0;
                });
                if (missingTickerKeys.length > 0) {
                    queueQuotesRefresh(missingTickerKeys, 'startup');
                }
            })();
        }, SNAPSHOT_DELAY_MS);

        return () => {
            cancelled = true;
            if (snapshotTimerRef.current) {
                clearTimeout(snapshotTimerRef.current);
                snapshotTimerRef.current = null;
            }
            if (quoteDebounceTimerRef.current) {
                clearTimeout(quoteDebounceTimerRef.current);
                quoteDebounceTimerRef.current = null;
            }
        };
    }, [queueQuotesRefresh]);

    useEffect(() => {
        const handleUniverseChange = () => {
            syncSubscriptions();
            queueQuotesRefresh(collectDesiredKeys(), "universe-change");
        };

        const unsubWatchlist = useMarketStore.subscribe(
            (state) => (state.stocks || []).map(s => s.instrumentToken).join(','),
            () => handleUniverseChange()
        );
        const unsubPositions = usePositionsStore.subscribe(
            (state) => (state.positions || []).map(p => p.instrumentToken).join(','),
            () => handleUniverseChange()
        );
        const unsubChart = useMarketStore.subscribe(
            (state) => state.simulatedInstrumentKey,
            () => handleUniverseChange()
        );

        return () => {
            unsubWatchlist();
            unsubPositions();
            unsubChart();
        };
    }, [collectDesiredKeys, queueQuotesRefresh, syncSubscriptions]);

    useEffect(() => {
        let cancelled = false;
        const poll = async () => {
            if (cancelled) return;
            const keys = collectDesiredKeys();
            if (keys.length === 0) return;

            const now = Date.now();
            const quotesByInstrument = useMarketStore.getState().quotesByInstrument;
            const staleMs = 30_000;

            const missingOrStale = keys.filter((k) => {
                const normalized = toInstrumentKey(k);
                const quote = quotesByInstrument[normalized] || quotesByInstrument[k];
                if (!quote || !Number.isFinite(Number(quote.price)) || Number(quote.price) <= 0) {
                    return true;
                }
                const ts = Number(quote.timestamp || 0);
                return !Number.isFinite(ts) || now - ts > staleMs;
            });

            if (missingOrStale.length > 0) {
                queueQuotesRefresh(missingOrStale, "poll");
            }
        };
        void poll();
        const interval = setInterval(() => void poll(), QUOTE_REFRESH_INTERVAL_MS);
        return () => { cancelled = true; clearInterval(interval); };
    }, [collectDesiredKeys, queueQuotesRefresh]);
}
