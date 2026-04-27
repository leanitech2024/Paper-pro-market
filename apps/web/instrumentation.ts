export async function register() {
    // Only run on the Node.js server, not in the Edge runtime or client
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { prewarm } = await import('@/lib/startup/prewarm');
        await prewarm();
        
        // Register candle handler on the WS singleton at boot
        // Must happen after prewarm so the singleton URL is known
        if (typeof window === 'undefined') {
            // Server-side only â€” chart registry lives client-side,
            // so this is a no-op on the server but safe to call
            const { initializeCandleSubscription } = await import('@/domains/chart/lib/init-realtime');
            initializeCandleSubscription();
        }
    }
}
