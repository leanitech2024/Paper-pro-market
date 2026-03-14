// lib/market-data/types.ts
/**
 * Simulate bid/ask from LTP using a 5bps symmetric spread.
 * Call this in adapters/parsers when the upstream feed doesn't provide real bid/ask.
 *
 * spreadBps = 5  →  bid = price * (1 - 5/20000), ask = price * (1 + 5/20000)
 */
export function ensureBidAsk(price, bid, ask, spreadBps = 5) {
    const half = spreadBps / 20000;
    const safeBid = Number.isFinite(bid) && bid > 0 ? bid : price * (1 - half);
    const safeAsk = Number.isFinite(ask) && ask > 0 ? ask : price * (1 + half);
    // Ensure invariant: bid <= ask
    return safeBid <= safeAsk
        ? { bid: safeBid, ask: safeAsk }
        : { bid: price * (1 - half), ask: price * (1 + half) };
}
