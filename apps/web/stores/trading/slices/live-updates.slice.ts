import { MarketSlice, Quote } from "../types";
import { candleEngine } from "@/lib/trading/candle-engine";
import { toCanonicalSymbol, toInstrumentKey, toSymbolKey } from "@paper-market/core";

const toFiniteNumber = (value: unknown): number =>
  Number.isFinite(Number(value)) ? Number(value) : 0;

function toDateKey(raw?: string): string {
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function buildOptionChainKey(symbol: string, expiry?: string): string {
  const normalizedSymbol = String(symbol || "").trim().toUpperCase();
  const expiryKey = toDateKey(expiry);
  return `${normalizedSymbol}::${expiryKey || "NEAREST"}`;
}

function quoteLookupKeys(rawKey: string): string[] {
  const normalized = toInstrumentKey(rawKey);
  if (!normalized) return [];

  const keys = new Set<string>([normalized]);
  const colonVariant = normalized.replace("|", ":");
  const pipeVariant = normalized.replace(":", "|");

  if (colonVariant) keys.add(colonVariant);
  if (pipeVariant) keys.add(pipeVariant);

  const raw = String(rawKey || "").trim();
  if (raw) keys.add(raw);

  return Array.from(keys);
}

function buildQuoteFromTick(
  previousQuote: Quote | undefined,
  tick: { instrumentKey: string; symbol?: string; price: number; close?: number; timestamp?: number }
): Quote | null {
  const instrumentKey = toInstrumentKey(tick.instrumentKey || tick.symbol || "");
  const canonicalSymbol = toCanonicalSymbol(tick.symbol || "");
  const price = toFiniteNumber(tick.price);
  if (!instrumentKey || price <= 0) return null;

  const previousClose =
    previousQuote && Number.isFinite(previousQuote.close) && previousQuote.close > 0
      ? previousQuote.close
      : 0;

  const incomingClose = toFiniteNumber(tick.close);
  const close = incomingClose > 0 ? incomingClose : previousClose;
  const change = close > 0 ? price - close : 0;
  const changePercent = close > 0 ? (change / close) * 100 : 0;

  return {
    instrumentKey,
    symbol: canonicalSymbol || previousQuote?.symbol,
    key: instrumentKey,
    price,
    close,
    change,
    changePercent,
    timestamp:
      Number.isFinite(tick.timestamp) && Number(tick.timestamp) > 0
        ? Number(tick.timestamp)
        : Date.now(),
  };
}

export const createLiveUpdatesSlice: MarketSlice<any> = (set, get) => ({
  livePrice: 0,
  quotesByInstrument: {},
  quotesByKey: {},
  optionChain: null,
  optionChainByKey: {},
  isFetchingChain: false,
  fetchingOptionChainKey: null,

  fetchOptionChain: async (symbol: string, expiry?: string) => {
    const normalizedSymbol = String(symbol || "").trim().toUpperCase();
    if (!normalizedSymbol) return;

    const key = buildOptionChainKey(normalizedSymbol, expiry);
    const { isFetchingChain, fetchingOptionChainKey } = get();
    if (isFetchingChain && fetchingOptionChainKey === key) {
      return;
    }

    set({ isFetchingChain: true, fetchingOptionChainKey: key });
    try {
      const params = new URLSearchParams({ symbol: normalizedSymbol });
      if (expiry) {
        params.set("expiry", expiry);
      }
      const res = await fetch(`/api/v1/market/option-chain?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        set((state: any) => ({
          optionChain: data.data,
          optionChainByKey: {
            ...state.optionChainByKey,
            [key]: data.data,
          },
        }));
      }
    } catch (error) {
      console.error("Option Chain fetch failed", error);
    } finally {
      if (get().fetchingOptionChainKey === key) {
        set({ isFetchingChain: false, fetchingOptionChainKey: null });
      }
    }
  },

  applyTick: (tick: { instrumentKey: string; symbol?: string; price: number; close?: number; timestamp?: number }) => {
    const state = get() as any;
    const seed = buildQuoteFromTick(undefined, tick);
    if (!seed) return;

    // ← Bail early if price is identical — avoids unnecessary set() and re-renders
    const existing = state.quotesByInstrument[seed.instrumentKey];
    if (existing && existing.price === tick.price) return;

    const nextQuote = buildQuoteFromTick(existing, tick);
    if (!nextQuote) return;

    set((s: any) => {
        const nextQuotesByInstrument = { ...s.quotesByInstrument };
        for (const key of quoteLookupKeys(tick.instrumentKey || nextQuote.instrumentKey)) {
            nextQuotesByInstrument[key] = nextQuote;
        }
        return {
            quotesByInstrument: nextQuotesByInstrument,
            quotesByKey: nextQuotesByInstrument,
            livePrice: nextQuote.price,
        };
    });
  },

  hydrateQuotes: (
    quotes: Array<{ instrumentKey: string; symbol?: string; price: number; close?: number; timestamp?: number }>
  ) => {
    if (!Array.isArray(quotes) || quotes.length === 0) return;

    set((state: any) => {
      const nextByKey: Record<string, Quote> = { ...state.quotesByInstrument };
      let latestPrice = state.livePrice;

      for (const tick of quotes) {
        const seed = buildQuoteFromTick(undefined, tick);
        if (!seed) continue;
        const nextQuote = buildQuoteFromTick(nextByKey[seed.instrumentKey], tick);
        if (!nextQuote) continue;
        for (const key of quoteLookupKeys(tick.instrumentKey || nextQuote.instrumentKey)) {
          nextByKey[key] = nextQuote;
        }
        latestPrice = nextQuote.price;
      }

      return {
        quotesByInstrument: nextByKey,
        quotesByKey: nextByKey,
        livePrice: latestPrice,
      };
    });
  },

  selectQuote: (instrumentKeyOrSymbol: string) => {
    const keyCandidates = quoteLookupKeys(instrumentKeyOrSymbol);
    if (keyCandidates.length > 0) {
      const quoteBook = get().quotesByInstrument;
      for (const candidate of keyCandidates) {
        const byInstrument = quoteBook[candidate];
        if (byInstrument) return byInstrument;
      }
    }

    const instrumentKey = toInstrumentKey(instrumentKeyOrSymbol);
    if (instrumentKey) {
      const byInstrument = get().quotesByInstrument[instrumentKey];
      if (byInstrument) return byInstrument;
    }

    const symbolKey = toSymbolKey(toCanonicalSymbol(instrumentKeyOrSymbol));
    if (!symbolKey) return null;
    const allQuotes = Object.values(get().quotesByInstrument) as Quote[];
    return (
      allQuotes.find((quote) => toSymbolKey(toCanonicalSymbol(quote.symbol || "")) === symbolKey) || null
    );
  },

  selectPrice: (instrumentKeyOrSymbol: string) => {
    const quote = get().selectQuote(instrumentKeyOrSymbol);
    return quote?.price ?? 0;
  },

  // Backward-compatible wrapper. New SSE flow should call applyTick directly.
  updateStockPrice: (symbol: string, price: number, close?: number) => {
    get().applyTick({
      instrumentKey: symbol,
      symbol,
      price,
      close,
      timestamp: Date.now(),
    });
  },

  updateLiveCandle: (
    tick: { price: number; volume?: number; time: number },
    symbol: string,
    instrumentKey?: string
  ) => {
    const { historicalData, simulatedSymbol, simulatedInstrumentKey, activeInterval } = get();

    const normalizeForChart = (value: string) =>
      toCanonicalSymbol(String(value || "").replace(/^[A-Z_]+[:|]/, ""));

    const tickSymbol = normalizeForChart(symbol);
    const chartSymbol = normalizeForChart(simulatedSymbol || "");
    const tickKey = toInstrumentKey(instrumentKey || symbol);
    const chartKey = toInstrumentKey(simulatedInstrumentKey || simulatedSymbol || "");

    if (!chartKey || !tickKey || tickKey !== chartKey) {
      const tickSymbolKey = toSymbolKey(tickSymbol);
      const chartSymbolKey = toSymbolKey(chartSymbol);
      if (!tickSymbolKey || !chartSymbolKey || tickSymbolKey !== chartSymbolKey) {
        return;
      }
    }

    if (!historicalData || historicalData.length === 0) return;

    const intervalMap: Record<string, number> = {
      "1m": 60,
      "5m": 300,
      "10m": 600,
      "15m": 900,
      "30m": 1800,
      "1h": 3600,
      "2h": 7200,
      "3h": 10800,
      "4h": 14400,
      "1d": 86400,
      "1w": 604800,
      "1mo": 2592000,
    };

    const intervalSeconds = intervalMap[activeInterval] || 60;

    const normalizedTick = {
      instrumentKey: chartKey,
      symbol: chartSymbol,
      price: tick.price,
      bid: tick.price,
      ask: tick.price,
      volume: tick.volume || 0,
      timestamp: tick.time,
      exchange: "NSE",
    };

    const candleUpdate = candleEngine.processTick(normalizedTick, intervalSeconds);
    if (!candleUpdate) {
      return;
    }

    if (candleUpdate.type === "new") {
      set((state: any) => ({
        historicalData: [...state.historicalData, candleUpdate.candle],
        livePrice: tick.price,
      }));
      return;
    }

    set((state: any) => ({
      historicalData: [...state.historicalData.slice(0, -1), candleUpdate.candle],
      livePrice: tick.price,
    }));
  },
});
