import WebSocket from "ws";
import { logger } from "@/lib/logger";
import { toInstrumentKey } from "@paper-market/core";
import {
  feedHealthService,
  recordFeedPrice,
} from "@/services/feed-health.service";
import { tickBus } from "@/lib/trading/tick-bus";
import type { NormalizedTick } from "@/lib/trading/tick-bus";

// ═══════════════════════════════════════════════════════════
// 🛠️ SINGLETON PATTERN: Global declaration for Next.js hot reload
// ═══════════════════════════════════════════════════════════
declare global {
  var __realTimeMarketServiceInstance: RealTimeMarketService | undefined;
}

interface Quote {
  instrumentKey: string;
  symbol: string;
  key?: string;
  price: number;
  close?: number;
  timestamp?: number;
  volume?: number;
  lastUpdated: Date;
}

// ═══════════════════════════════════════════════════════════
// 🌐 MARKET ENGINE WS URL
// ═══════════════════════════════════════════════════════════
const MARKET_ENGINE_WS_URL =
  process.env.MARKET_ENGINE_WS_URL || "ws://localhost:4201";

const RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000];

class RealTimeMarketService {
  private ws: WebSocket | null = null;
  private prices: Map<string, Quote> = new Map();
  private quotesByInstrument: Map<string, Quote> = new Map();
  private subscribers: Map<string, number> = new Map();
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;
  private reconnectAttempts: number = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;

  // ─────────────────────────────────────────
  // 🛠️ PRIVATE CONSTRUCTOR
  // ─────────────────────────────────────────
  private constructor() {}

  // ─────────────────────────────────────────
  // 🛠️ SINGLETON ACCESSOR
  // ─────────────────────────────────────────
  public static getInstance(): RealTimeMarketService {
    const globalRef = globalThis as typeof globalThis & {
      __realTimeMarketServiceInstance?: RealTimeMarketService;
    };
    if (!globalRef.__realTimeMarketServiceInstance) {
      globalRef.__realTimeMarketServiceInstance = new RealTimeMarketService();
    }
    return globalRef.__realTimeMarketServiceInstance;
  }

  // ─────────────────────────────────────────
  // 🔌 INITIALIZE: Connect to market-engine WS
  // ─────────────────────────────────────────
  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;
    this.initPromise = this._doInit().finally(() => {
      this.initPromise = null;
    });
    return this.initPromise;
  }

  private async _doInit(): Promise<void> {
    this.connectToEngine();
    this.initialized = true;
    logger.info(
      { url: MARKET_ENGINE_WS_URL },
      "RealTimeMarketService initialized (market-engine WebSocket)",
    );
  }

  // ─────────────────────────────────────────
  // 🔌 CONNECT to market-engine WebSocket
  // ─────────────────────────────────────────
  private connectToEngine(): void {
    if (this.ws) {
      try {
        this.ws.terminate();
      } catch {
        /* ignore */
      }
      this.ws = null;
    }

    logger.info(
      { url: MARKET_ENGINE_WS_URL, attempt: this.reconnectAttempts },
      "Connecting to market-engine WS",
    );

    const socket = new WebSocket(MARKET_ENGINE_WS_URL);
    this.ws = socket;

    socket.on("open", () => {
      logger.info("market-engine WS connected");
      this.reconnectAttempts = 0;
      feedHealthService.setWebsocketConnected(true);

      // Re-subscribe to all tracked symbols on reconnect
      const keys = Array.from(this.subscribers.keys());
      if (keys.length > 0) {
        this.sendSubscribeMessage(keys);
      }

      // Keep-alive ping
      this.startPing(socket);
    });

    socket.on("message", (raw) => {
      this.handleMessage(raw);
    });

    socket.on("error", (err) => {
      logger.error({ err }, "market-engine WS error");
    });

    socket.on("close", () => {
      logger.warn("market-engine WS disconnected");
      feedHealthService.setWebsocketConnected(false);
      this.stopPing();
      this.scheduleReconnect();
    });
  }

  // ─────────────────────────────────────────
  // 📨 HANDLE INCOMING TICK MESSAGE
  // ─────────────────────────────────────────
  private handleMessage(raw: WebSocket.RawData): void {
    let data: unknown;
    try {
      data = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (!data || typeof data !== "object") return;
    const msg = data as Record<string, unknown>;

    const ticks: NormalizedTick[] = [];

    // The market-engine ws-server sends:
    //   { type: 'tick',      data: { instrumentKey, symbol, price, timestamp (ms), volume, close } }
    //   { type: 'heartbeat' }
    //   { type: 'connected' }
    //   { type: 'subscribed', ... }
    //   { type: 'candle',    data: {...} }
    if (msg.type === "tick" && msg.data && typeof msg.data === "object") {
      const t = this.parseTick(msg.data as Record<string, unknown>, true);
      if (t) ticks.push(t);
    } else if (
      msg.type === "heartbeat" ||
      msg.type === "connected" ||
      msg.type === "subscribed" ||
      msg.type === "unsubscribed" ||
      msg.type === "candle" ||
      msg.type === "error"
    ) {
      // Control / status messages — nothing to do
      return;
    } else if (Array.isArray(msg)) {
      // Legacy batch format (forward-compat)
      for (const item of msg) {
        const t = this.parseTick(item as Record<string, unknown>, false);
        if (t) ticks.push(t);
      }
    } else {
      // Bare tick fallback (forward-compat for future bare-object format)
      const t = this.parseTick(msg, false);
      if (t) ticks.push(t);
    }

    for (const tick of ticks) {
      const instrumentKey = toInstrumentKey(tick.instrumentKey || "");
      if (!instrumentKey) continue;

      const quote: Quote = {
        instrumentKey,
        symbol: tick.symbol || instrumentKey,
        key: instrumentKey,
        price: tick.price,
        close: tick.close,
        timestamp: tick.timestamp, // already ms from server
        volume: tick.volume,
        lastUpdated: new Date(),
      };

      if (tick.symbol) this.prices.set(tick.symbol, quote);
      this.prices.set(instrumentKey, quote);
      this.quotesByInstrument.set(instrumentKey, quote);
      recordFeedPrice(instrumentKey, tick.price, Date.now());

      // Forward to in-process TickBus so MTM, FillEngine, etc. all update
      tickBus.emitTick(tick);
    }
  }

  // isServerMs=true when the field is already in milliseconds (sent by ws-server which pre-multiplies)
  // isServerMs=false for bare/legacy tick objects where timestamp is in seconds
  private parseTick(
    obj: Record<string, unknown>,
    isServerMs = false,
  ): NormalizedTick | null {
    const instrumentKey = String(obj.instrumentKey || obj.key || "");
    const price = Number(obj.price || obj.ltp);
    if (!instrumentKey || !Number.isFinite(price) || price <= 0) return null;
    const rawTs = Number(obj.timestamp ?? 0);
    // ws-server sends timestamp in ms; bare/legacy ticks send in seconds
    const timestampSeconds = isServerMs
      ? Math.floor(rawTs / 1000)
      : (rawTs || Math.floor(Date.now() / 1000));
    return {
      instrumentKey,
      symbol: String(obj.symbol || ""),
      price,
      volume: Number(obj.volume ?? 0),
      timestamp: timestampSeconds,
      exchange: String(obj.exchange || instrumentKey.split("|")[0] || ""),
      close: Number.isFinite(Number(obj.close)) ? Number(obj.close) : undefined,
    };
  }

  // ─────────────────────────────────────────
  // 📡 SEND SUBSCRIBE MESSAGE
  // ─────────────────────────────────────────
  private sendSubscribeMessage(instrumentKeys: string[]): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      this.ws.send(
        JSON.stringify({ type: "subscribe", symbols: instrumentKeys }),
      );
    } catch (err) {
      logger.error(
        { err },
        "Failed to send subscribe message to market-engine",
      );
    }
  }

  private sendUnsubscribeMessage(instrumentKeys: string[]): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      this.ws.send(
        JSON.stringify({ type: "unsubscribe", symbols: instrumentKeys }),
      );
    } catch (err) {
      logger.error(
        { err },
        "Failed to send unsubscribe message to market-engine",
      );
    }
  }

  // ─────────────────────────────────────────
  // 🔄 RECONNECT
  // ─────────────────────────────────────────
  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    const delay =
      RECONNECT_DELAYS[
        Math.min(this.reconnectAttempts, RECONNECT_DELAYS.length - 1)
      ];
    this.reconnectAttempts++;
    logger.info(
      { delay, attempt: this.reconnectAttempts },
      "Scheduling market-engine WS reconnect",
    );
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connectToEngine();
    }, delay);
  }

  // ─────────────────────────────────────────
  // 💓 PING / PONG
  // ─────────────────────────────────────────
  private startPing(socket: WebSocket): void {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.ping();
      }
    }, 30_000);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // PUBLIC API — unchanged signatures
  // ═══════════════════════════════════════════════════════════

  /**
   * Subscribe to instruments for real-time updates.
   * @param symbols List of instrument keys (e.g. "NSE_EQ|INE002A01018") or trading symbols
   */
  async subscribe(symbols: string[]): Promise<void> {
    if (!this.initialized) await this.initialize();

    const keys = symbols
      .map(
        (s) =>
          toInstrumentKey(String(s || "").trim()) || String(s || "").trim(),
      )
      .filter(Boolean);

    const unique = Array.from(new Set(keys));
    if (unique.length === 0) return;

    unique.forEach((key) => {
      this.subscribers.set(key, (this.subscribers.get(key) ?? 0) + 1);
    });

    this.sendSubscribeMessage(unique);
    feedHealthService.setWebsocketConnected(
      this.ws?.readyState === WebSocket.OPEN,
    );
  }

  /**
   * Unsubscribe from instruments.
   */
  async unsubscribe(symbols: string[]): Promise<void> {
    if (!this.initialized) return;

    const keys = symbols
      .map(
        (s) =>
          toInstrumentKey(String(s || "").trim()) || String(s || "").trim(),
      )
      .filter(Boolean);

    const approved: string[] = [];
    for (const key of new Set(keys)) {
      const count = this.subscribers.get(key) ?? 0;
      if (count <= 0) continue;
      if (count === 1) {
        this.subscribers.delete(key);
      } else {
        this.subscribers.set(key, count - 1);
      }
      approved.push(key);
    }

    if (approved.length === 0) return;
    this.sendUnsubscribeMessage(approved);
  }

  /**
   * Get latest quote from in-process cache.
   */
  getQuote(symbol: string): Quote | null {
    const instrumentKey = toInstrumentKey(symbol);
    const direct = this.prices.get(instrumentKey || symbol);
    if (direct) return direct;

    // Linear scan fallback by symbol name
    const upper = symbol.toUpperCase();
    for (const quote of this.quotesByInstrument.values()) {
      if (quote.symbol.toUpperCase() === upper) return quote;
    }
    return null;
  }

  /**
   * Check if we have a fresh quote received within maxAgeSeconds.
   */
  hasFreshQuote(symbol: string, maxAgeSeconds: number = 60): boolean {
    const quote = this.getQuote(symbol);
    if (!quote) return false;
    const age = (Date.now() - quote.lastUpdated.getTime()) / 1000;
    return age < maxAgeSeconds;
  }

  /**
   * Get all cached quotes.
   */
  getAllQuotes(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [key, quote] of this.quotesByInstrument.entries()) {
      result[key] = quote.price;
    }
    return result;
  }

  /**
   * Seed snapshot prices from the market-engine REST endpoint or Redis cache
   * for symbols not yet seen on the WebSocket.
   */
  private async seedSnapshotPrices(instrumentKeys: string[]): Promise<void> {
    try {
      const { UpstoxService } = await import("@/services/upstox.service");
      const quotes = await UpstoxService.getSystemQuoteDetails(instrumentKeys);
      const now = Date.now();

      for (const [feedKey, detail] of Object.entries(quotes)) {
        const price = Number(detail?.lastPrice);
        if (!Number.isFinite(price) || price <= 0) continue;

        const instrumentKey = toInstrumentKey(feedKey) || feedKey;
        const closePrice = Number(detail?.closePrice);
        const quote: Quote = {
          instrumentKey,
          symbol: feedKey.split("|")[1] || feedKey,
          key: instrumentKey,
          price,
          close:
            Number.isFinite(closePrice) && closePrice > 0
              ? closePrice
              : undefined,
          timestamp: now,
          lastUpdated: new Date(now),
        };

        this.prices.set(instrumentKey, quote);
        this.quotesByInstrument.set(instrumentKey, quote);
        recordFeedPrice(instrumentKey, price, now);
      }

      logger.info(
        {
          requested: instrumentKeys.length,
          hydrated: Object.keys(quotes).length,
        },
        "Snapshot prices seeded",
      );
    } catch (error) {
      logger.error({ err: error }, "Failed to seed snapshot prices");
    }
  }

  /**
   * Warm snapshot prices for symbols not yet in cache.
   */
  async warmSnapshotForSymbols(symbols: string[]): Promise<void> {
    const unique = Array.from(
      new Set(symbols.map((s) => String(s || "").trim()).filter(Boolean)),
    );
    if (unique.length === 0) return;

    if (!this.initialized) await this.initialize();

    const missing = unique.filter((s) => {
      const q = this.getQuote(s);
      return !(q && Number.isFinite(q.price) && q.price > 0);
    });

    if (missing.length === 0) return;

    const feedKeys = Array.from(
      new Set(missing.map((s) => toInstrumentKey(s) || s)),
    );

    await this.seedSnapshotPrices(feedKeys);
  }

  /**
   * Get snapshot for a list of symbols from in-process cache.
   */
  getSnapshotForSymbols(symbols: string[]): Array<{
    instrumentKey: string;
    symbol: string;
    key: string;
    price: number;
    close?: number;
    timestamp?: number;
  }> {
    const unique = Array.from(
      new Set(symbols.map((s) => String(s || "").trim()).filter(Boolean)),
    );
    const snapshot: Array<{
      instrumentKey: string;
      symbol: string;
      key: string;
      price: number;
      close?: number;
      timestamp?: number;
    }> = [];
    const seen = new Set<string>();

    for (const symbol of unique) {
      const quote = this.getQuote(symbol);
      if (!quote || !Number.isFinite(quote.price) || quote.price <= 0) continue;
      if (seen.has(quote.instrumentKey)) continue;
      seen.add(quote.instrumentKey);
      snapshot.push({
        instrumentKey: quote.instrumentKey,
        symbol: quote.symbol,
        key: quote.instrumentKey,
        price: quote.price,
        close: quote.close,
        timestamp: quote.timestamp,
      });
    }

    return snapshot;
  }
}

// ═══════════════════════════════════════════════════════════
// 🛠️ EXPORT SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════
export const realTimeMarketService = RealTimeMarketService.getInstance();
