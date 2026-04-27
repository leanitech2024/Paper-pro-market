import { logger } from "@/lib/logger";

export class RateLimiter {
    private tokens: number;
    private lastRefill: number;
    private maxTokens: number;
    private refillRateMs: number;
    private queue: Array<(value: void) => void> = [];

    constructor(requestsPerSecond: number = 10) {
        this.maxTokens = requestsPerSecond;
        this.tokens = requestsPerSecond;
        this.lastRefill = Date.now();
        this.refillRateMs = 1000 / requestsPerSecond;
    }

    async waitForToken(context: string = "api"): Promise<void> {
        this.refill();

        if (this.tokens >= 1) {
            this.tokens -= 1;
            return;
        }

        logger.debug({ context, queueLength: this.queue.length }, "Rate limit reached, queuing request");
        return new Promise<void>((resolve) => {
            this.queue.push(resolve);
            if (this.queue.length === 1) {
               this.scheduleQueueProcessor();
            }
        });
    }

    private refill() {
        const now = Date.now();
        const elapsed = now - this.lastRefill;
        const newTokens = Math.floor(elapsed / this.refillRateMs);

        if (newTokens > 0) {
            this.tokens = Math.min(this.maxTokens, this.tokens + newTokens);
            this.lastRefill = now;
        }
    }

    private scheduleQueueProcessor() {
        const checkInterval = setInterval(() => {
            this.refill();

            while (this.tokens >= 1 && this.queue.length > 0) {
                this.tokens -= 1;
                const next = this.queue.shift();
                if (next) next();
            }

            if (this.queue.length === 0) {
                clearInterval(checkInterval);
            }
        }, this.refillRateMs);
    }
}

export const upstoxRateLimiter = new RateLimiter(10);

const windowCounters = new Map<string, { count: number; windowStart: number }>();

export function rateLimit(
    key: string,
    options: { maxRequests: number; windowMs: number }
): { allowed: boolean } {
    const now = Date.now();
    const entry = windowCounters.get(key);

    if (!entry || now - entry.windowStart >= options.windowMs) {
        windowCounters.set(key, { count: 1, windowStart: now });
        return { allowed: true };
    }

    if (entry.count >= options.maxRequests) {
        return { allowed: false };
    }

    entry.count++;
    return { allowed: true };
}
