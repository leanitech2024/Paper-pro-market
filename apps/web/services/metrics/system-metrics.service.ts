import { logger } from "@/lib/logger";

interface SystemMetrics {
    tickRateTps: number;
    fillLatencyMs: number;
    orderLatencyMs: number;
    priceLatencyMs: number;
    wsReconnects: number;
}

/**
 * Lightweight metrics collection for trading platform observability.
 * Exposes core KPIs like tick speed, latency, and system health.
 */
class SystemMetricsService {
    private metrics: SystemMetrics = {
        tickRateTps: 0,
        fillLatencyMs: 0,
        orderLatencyMs: 0,
        priceLatencyMs: 0,
        wsReconnects: 0,
    };

    private tickCount = 0;
    private interval: NodeJS.Timeout | null = null;
    
    constructor() {
        this.startReporting();
    }

    recordTick(): void {
        this.tickCount++;
    }

    recordFillLatency(ms: number): void {
        this.metrics.fillLatencyMs = this.exponentialMovingAverage(this.metrics.fillLatencyMs, ms, 0.1);
    }

    recordOrderLatency(ms: number): void {
        this.metrics.orderLatencyMs = this.exponentialMovingAverage(this.metrics.orderLatencyMs, ms, 0.1);
    }

    recordPriceLatency(ms: number): void {
        this.metrics.priceLatencyMs = this.exponentialMovingAverage(this.metrics.priceLatencyMs, ms, 0.1);
    }

    recordWsReconnect(): void {
        this.metrics.wsReconnects++;
    }

    private exponentialMovingAverage(current: number, sample: number, alpha: number): number {
        if (current === 0) return sample; // initialization
        return current * (1 - alpha) + sample * alpha;
    }

    private startReporting(): void {
        if (this.interval) return;
        this.interval = setInterval(() => {
            this.metrics.tickRateTps = this.tickCount / 10; // divided by interval securely
            this.tickCount = 0;

            // Log if we have meaningful traffic
            if (this.metrics.tickRateTps > 0 || this.metrics.wsReconnects > 0) {
                logger.info(
                    {
                        event: "SYSTEM_METRICS",
                        tps: Math.round(this.metrics.tickRateTps),
                        fillLatencyMs: Math.round(this.metrics.fillLatencyMs),
                        orderLatencyMs: Math.round(this.metrics.orderLatencyMs),
                        priceLatencyMs: Math.round(this.metrics.priceLatencyMs),
                        reconnects: this.metrics.wsReconnects,
                    },
                    "System Performance Metrics"
                );
            }
        }, 10000); // 10s reporting window
    }

    stopReporting(): void {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
}

export const systemMetricsService = new SystemMetricsService();
