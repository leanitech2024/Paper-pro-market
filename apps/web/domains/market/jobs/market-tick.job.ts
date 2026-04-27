import { marketSimulation } from "@/domains/market/server/feeds/market-simulation.service";
import { logger } from "@/lib/logger";
import { SlTargetEngineService } from "@/domains/trading/server/execution/sl-target-engine.service";
import { OrderExecutorService } from "@/domains/trading/server/execution/order-executor/order-executor.service";

class MarketTickJob {
    private intervalId: NodeJS.Timeout | null = null;
    private tickCount: number = 0;
    private isRunning: boolean = false;
    private isExecutingOrders: boolean = false;

    async start(): Promise<void> {
        if (this.isRunning) {
            logger.warn("MarketTickJob already running");
            return;
        }

        try {
            await marketSimulation.initialize();

            this.intervalId = setInterval(() => {
                void this.executeTick();
            }, 1000);

            this.isRunning = true;
            logger.info("MarketTickJob started");
        } catch (err) {
            logger.error({ err: err }, "Failed to start MarketTickJob");
            throw err;
        }
    }

    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        this.isRunning = false;
        this.tickCount = 0;
        logger.info("MarketTickJob stopped");
    }

    getStatus(): { isRunning: boolean; tickCount: number; symbolCount: number } {
        return {
            isRunning: this.isRunning,
            tickCount: this.tickCount,
            symbolCount: marketSimulation.getSymbolCount(),
        };
    }

    private async executeTick(): Promise<void> {
        try {
            marketSimulation.tick();
            this.tickCount++;

            const paperMode =
                String(process.env.PAPER_TRADING_MODE ?? "true").trim().toLowerCase() !== "false";
            if (paperMode && process.env.NODE_ENV !== "production" && !this.isExecutingOrders) {
                this.isExecutingOrders = true;
                try {
                    await OrderExecutorService.executeOpenOrders();
                } catch (err) {
                    logger.warn({ err: err }, "Auto-execute open orders failed");
                } finally {
                    this.isExecutingOrders = false;
                }
            }

            if (this.tickCount % 10 === 0) {
                logger.info(
                    {
                        tickCount: this.tickCount,
                        symbolCount: marketSimulation.getSymbolCount(),
                    },
                    "Market tick checkpoint"
                );
            }

            await SlTargetEngineService.checkAndExecute();
            await SlTargetEngineService.misSquareOff();
        } catch (err) {
            logger.error({ err: err, tickCount: this.tickCount }, "Market tick failed");
        }
    }
}

declare global {
    var __marketTickJob: MarketTickJob | undefined;
}

const globalState = globalThis as unknown as {
    __marketTickJob?: MarketTickJob;
};

export const marketTickJob =
    globalState.__marketTickJob || new MarketTickJob();

globalState.__marketTickJob = marketTickJob;
