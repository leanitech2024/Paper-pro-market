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
    volume: number;
    timestamp: number;  // Unix timestamp in SECONDS
    exchange: string;
    close?: number;
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
