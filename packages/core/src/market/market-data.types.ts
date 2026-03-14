// lib/market-data/types.ts

// --- Universal Domain Types ---

/**
 * Represents a single financial instrument price update.
 */
export interface Quote {
    /** The standardized symbol (e.g., "NSE:RELIANCE") */
    symbol: string;

    /** Last Traded Price in PAISA (Integer) for precision */
    ltp: number;

    /** Absolute change in price */
    change: number;

    /** Percentage change */
    changePercent: number;

    /** Timestamp of the data */
    timestamp: Date;

    /** Volume traded today */
    volume?: number;
}

/**
 * Represents an OHLCV Candle for charting.
 */
export interface Candle {
    /** Opening price */
    open: number;

    /** Highest price */
    high: number;

    /** Lowest price */
    low: number;

    /** Closing price */
    close: number;

    /** Volume */
    volume?: number;

    /** Timestamp of the candle start */
    timestamp: Date;
}

/**
 * Normalized tick format (broker-agnostic), used by market-engine WebSocket feed.
 */
export interface NormalizedTick {
    instrumentKey: string;
    symbol?: string;
    price: number;
    /** Best bid price — always present; simulated at 5bps below LTP when the feed does not provide it */
    bid: number;
    /** Best ask price — always present; simulated at 5bps above LTP when the feed does not provide it */
    ask: number;
    bidQty?: number;
    askQty?: number;
    volume: number;
    timestamp: number;  // Unix timestamp in SECONDS
    exchange: string;
    close?: number;
}

/**
 * Simulate bid/ask from LTP using a 5bps symmetric spread.
 * Call this in adapters/parsers when the upstream feed doesn't provide real bid/ask.
 *
 * spreadBps = 5  →  bid = price * (1 - 5/20000), ask = price * (1 + 5/20000)
 */
export function ensureBidAsk(
    price: number,
    bid: number | undefined,
    ask: number | undefined,
    spreadBps = 5
): { bid: number; ask: number } {
    const half = spreadBps / 20_000;
    const safeBid = Number.isFinite(bid) && (bid as number) > 0 ? (bid as number) : price * (1 - half);
    const safeAsk = Number.isFinite(ask) && (ask as number) > 0 ? (ask as number) : price * (1 + half);
    // Ensure invariant: bid <= ask
    return safeBid <= safeAsk
        ? { bid: safeBid, ask: safeAsk }
        : { bid: price * (1 - half), ask: price * (1 + half) };
}

/**
 * Realtime OHLCV candle (time in seconds), used by market-engine feed.
 */
export interface RealtimeCandle {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
}

/**
 * Candle update event from market-engine.
 */
export interface CandleUpdate {
    type: 'new' | 'update';
    candle: RealtimeCandle;
    instrumentKey: string;
    symbol?: string;
    interval: number;
}

/**
 * Represents an Option Chain entry.
 */
export interface OptionChainEntry {
    strikePrice: number;
    call: {
        ltp: number;
        oi: number;
        volume: number;
    };
    put: {
        ltp: number;
        oi: number;
        volume: number;
    };
}

// --- Provider Contract ---

/**
 * Interface that all Market Data Providers (Upstox, Mock) must implement.
 */
export interface MarketDataProvider {
    getQuote(symbol: string): Promise<Quote>;
    getHistoricalCandles(symbol: string, interval: string, range: { start: Date; end: Date }): Promise<Candle[]>;
}
