// ═══════════════════════════════════════════════════════════
// 📡 MARKET ENGINE WEBSOCKET CLIENT
// ═══════════════════════════════════════════════════════════
/**
 * WebSocket client for connecting to the market-engine service.
 * Replaces the SSE (Server-Sent Events) approach.
 * 
 * Architecture:
 * ```
 * Next.js Client → WebSocket → market-engine → Upstox
 * ```
 */

type MessageHandler = (data: any) => void;

export type MarketWsErrorContext = {
    kind: 'transport_error';
    url: string;
    readyState: number;
    reconnectAttempts: number;
};

interface MarketWsOptions {
    url: string;
    onTick?: MessageHandler;
    onCandle?: MessageHandler;
    onConnected?: () => void;
    onDisconnected?: () => void;
    onError?: (error: MarketWsErrorContext) => void;
}

class MarketWebSocket {
    private ws: WebSocket | null = null;
    private url: string;
    
    // Stable forwarder functions — registered once on ws.onmessage etc.
    // Inner targets are swapped via configure() without re-registering on ws
    private handlers: {
        tick?: MessageHandler;
        candle?: MessageHandler;
        connected?: () => void;
        disconnected?: () => void;
        error?: (error: MarketWsErrorContext) => void;
    } = {};

    private reconnectAttempts = 0;
    private readonly MAX_RECONNECT_ATTEMPTS = 5;
    private readonly RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000];
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private isIntentionalClose = false;
    private connectionRequested = false;

    constructor(options: MarketWsOptions) {
        this.url = options.url;
        this.mergeHandlers(options);
    }

    // Merge handlers — only update what's provided, keep existing for omitted keys
    // This is the key fix: init-realtime only passes onCandle, so tick/connected/etc stay intact
    configure(options: MarketWsOptions) {
        const nextUrl = options.url?.trim();
        if (nextUrl && nextUrl !== this.url) {
            this.url = nextUrl;
        }
        this.mergeHandlers(options);
    }

    private mergeHandlers(options: MarketWsOptions) {
        if (options.onTick !== undefined)         this.handlers.tick         = options.onTick;
        if (options.onCandle !== undefined)       this.handlers.candle       = options.onCandle;
        if (options.onConnected !== undefined)    this.handlers.connected    = options.onConnected;
        if (options.onDisconnected !== undefined) this.handlers.disconnected = options.onDisconnected;
        if (options.onError !== undefined)        this.handlers.error        = options.onError;
    }

    connect() {
        this.connectionRequested = true;
        this.isIntentionalClose = false;

        if (
            this.ws?.readyState === WebSocket.OPEN ||
            this.ws?.readyState === WebSocket.CONNECTING
        ) {
            // Socket already open — fire connected immediately so remounting consumers
            // (e.g. React Strict Mode) can re-sync their subscriptions without waiting
            // for a new onopen event that will never come.
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.handlers.connected?.();
            }
            return;
        }

        try {
            this.ws = new WebSocket(this.url);

            this.ws.onopen = () => {
                this.reconnectAttempts = 0;
                this.handlers.connected?.();
            };

            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    switch (message.type) {
                        case 'tick':        this.handlers.tick?.(message.data); break;
                        case 'candle':      this.handlers.candle?.(message.data); break;
                        case 'connected':
                        case 'subscribed':
                        case 'unsubscribed':
                        case 'subscription_error':
                        case 'heartbeat':   break;
                    }
                } catch { /* non-fatal */ }
            };

            this.ws.onerror = () => {
                this.handlers.error?.({
                    kind: 'transport_error',
                    url: this.url,
                    readyState: this.ws?.readyState ?? WebSocket.CLOSED,
                    reconnectAttempts: this.reconnectAttempts,
                });
            };

            this.ws.onclose = () => {
                this.handlers.disconnected?.();
                if (!this.isIntentionalClose) {
                    this.attemptReconnect();
                }
            };
        } catch {
            this.attemptReconnect();
        }
    }

    private attemptReconnect() {
        const baseDelay = this.RECONNECT_DELAYS[
            Math.min(this.reconnectAttempts, this.RECONNECT_DELAYS.length - 1)
        ];
        const jitter = baseDelay * 0.2 * (Math.random() * 2 - 1);
        const delay = Math.round(baseDelay + jitter);
        this.reconnectAttempts++;
        this.reconnectTimer = setTimeout(() => this.connect(), delay);
    }

    subscribe(symbols: string[]) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'subscribe', symbols }));
        }
    }

    unsubscribe(symbols: string[]) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'unsubscribe', symbols }));
        }
    }

    disconnect() {
        this.connectionRequested = false;
        this.isIntentionalClose = true;
        if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
        if (this.ws) { this.ws.close(); this.ws = null; }
    }

    isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }
}

// ═══════════════════════════════════════════════════════════
// 🛠️ SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════
let marketWsInstance: MarketWebSocket | null = null;

export function getMarketWebSocket(options?: MarketWsOptions): MarketWebSocket {
    if (!marketWsInstance && options) {
        marketWsInstance = new MarketWebSocket(options);
    } else if (marketWsInstance && options) {
        marketWsInstance.configure(options);
    }

    if (!marketWsInstance) {
        throw new Error('MarketWebSocket not initialized. Call with options first.');
    }

    return marketWsInstance;
}

export function destroyMarketWebSocket() {
    if (marketWsInstance) {
        marketWsInstance.disconnect();
        marketWsInstance = null;
    }
}
