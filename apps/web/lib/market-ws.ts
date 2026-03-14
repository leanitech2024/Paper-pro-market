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
    private reconnectTimer: NodeJS.Timeout | null = null;
    private isIntentionalClose = false;
    private loggedPersistentReconnect = false;

    constructor(options: MarketWsOptions) {
        this.url = options.url;
        this.handlers = {
            tick: options.onTick,
            candle: options.onCandle,
            connected: options.onConnected,
            disconnected: options.onDisconnected,
            error: options.onError
        };
    }

    configure(options: MarketWsOptions) {
        const nextUrl = options.url?.trim();
        if (nextUrl && nextUrl !== this.url) {
            this.url = nextUrl;
        }

        this.handlers = {
            tick: options.onTick,
            candle: options.onCandle,
            connected: options.onConnected,
            disconnected: options.onDisconnected,
            error: options.onError,
        };
    }

    connect() {
        if (this.ws?.readyState === WebSocket.OPEN) return;

        try {
            this.ws = new WebSocket(this.url);

            this.ws.onopen = () => {
                this.reconnectAttempts = 0;
                this.loggedPersistentReconnect = false;
                this.handlers.connected?.();
            };

            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    switch (message.type) {
                        case 'tick':
                            this.handlers.tick?.(message.data);
                            break;
                        case 'candle':
                            this.handlers.candle?.(message.data);
                            break;
                        case 'connected':
                        case 'subscribed':
                        case 'unsubscribed':
                        case 'subscription_error':
                        case 'heartbeat':
                            // Handled by caller state or silently acknowledged.
                            break;
                        // Unknown types are silently ignored — avoids noisy client console.
                    }
                } catch {
                    // JSON parse errors are non-fatal; the next valid tick will recover.
                }
            };

            this.ws.onerror = () => {
                const context: MarketWsErrorContext = {
                    kind: 'transport_error',
                    url: this.url,
                    readyState: this.ws?.readyState ?? WebSocket.CLOSED,
                    reconnectAttempts: this.reconnectAttempts,
                };
                // Browser WS error events intentionally hide details.
                // All error signalling flows through the onError callback.
                this.handlers.error?.(context);
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
        // H-8 FIX: Add ±20% jitter to reconnect delay to avoid thundering herd
        // when the market-engine restarts and all clients reconnect simultaneously.
        const baseDelay = this.RECONNECT_DELAYS[
            Math.min(this.reconnectAttempts, this.RECONNECT_DELAYS.length - 1)
        ];
        const jitter = baseDelay * 0.2 * (Math.random() * 2 - 1); // ±20%
        const delay = Math.round(baseDelay + jitter);
        this.reconnectAttempts++;

        this.reconnectTimer = setTimeout(() => {
            this.connect();
        }, delay);
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
        this.isIntentionalClose = true;
        this.loggedPersistentReconnect = false;

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
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
