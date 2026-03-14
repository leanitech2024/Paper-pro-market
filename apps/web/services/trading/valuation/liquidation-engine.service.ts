import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { type Instrument, type NewOrder } from "@paper-market/core";
import { instruments, orders, positions, wallets } from "@paper-market/core/db";
import { logger } from "@/lib/logger";
import { InstrumentRepository } from "@/lib/instruments/repository";
import { maintenanceMarginService } from "@/services/trading/valuation/maintenance-margin.service";
import { marketSimulation } from "@/services/market/feeds/market-simulation.service";
import { realTimeMarketService } from "@/services/market/feeds/realtime-market.service";
import { isTradingEnabled } from "@/lib/system-control";
import { calculateFuturesRequiredMargin } from "@paper-market/core";
import { LedgerService } from "@/services/accounting/ledger/ledger.service";
import { MarginCalculatorService } from "@/services/trading/margin/margin-calculator.service";
import { instrumentStore } from "@/stores/instrument.store";
import { OrderPipelineService } from "@/services/trading/pipeline/order-pipeline.service";

type AccountState = "NORMAL" | "MARGIN_STRESSED" | "LIQUIDATING";

export type LiquidationMtmSnapshot = {
    equity: number;
    requiredMargin: number;
    maintenanceMargin: number;
    accountState: AccountState;
};

type PositionRisk = {
    positionId: string;
    instrumentToken: string;
    symbol: string;
    quantity: number;
    averagePrice: number;
    instrumentType: string;
    markPrice: number;
    marginUsage: number;
    unrealizedLoss: number;
    notional: number;
    underlying: string | null;
};

type RiskState = {
    equity: number;
    requiredMargin: number;
    maintenanceMargin: number;
    positions: PositionRisk[];
};

const MAX_LIQUIDATION_STEPS = Number.isFinite(Number(process.env.LIQUIDATION_MAX_STEPS))
    ? Math.max(1, Number(process.env.LIQUIDATION_MAX_STEPS))
    : 32;
const EPSILON = 0.005;

function toNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function round2(value: number): number {
    return Math.round(value * 100) / 100;
}

async function computeRequiredMargin(position: PositionRisk): Promise<number> {
    const instrument = instrumentStore.isReady()
        ? instrumentStore.getByToken(position.instrumentToken)
        : null;
    
    return await MarginCalculatorService.calculateRequiredMargin({
        symbol: position.symbol,
        instrumentToken: position.instrumentToken,
        side: position.quantity > 0 ? "BUY" : "SELL",
        quantity: Math.abs(position.quantity),
        orderType: "MARKET",
        productType: "CNC", // dummy
        leverage: 1, // dummy
    }, instrument as any);
}

function computeUnrealizedLoss(position: PositionRisk): number {
    const qty = position.quantity;
    if (qty === 0) return 0;

    const pnl = qty >= 0
        ? (position.markPrice - position.averagePrice) * qty
        : (position.averagePrice - position.markPrice) * Math.abs(qty);

    return pnl < 0 ? Math.abs(pnl) : 0;
}

function nextNonLiquidatingState(risk: RiskState): AccountState {
    if (risk.requiredMargin <= EPSILON) return "NORMAL";
    return risk.equity < risk.requiredMargin ? "MARGIN_STRESSED" : "NORMAL";
}

export class LiquidationEngineService {
    private activeUsers = new Set<string>();
    private lastStateByUser = new Map<string, AccountState>();

    async evaluateFromMtm(
        userId: string,
        snapshot: LiquidationMtmSnapshot,
        options: { force?: boolean } = {}
    ): Promise<void> {
        const force = Boolean(options.force);
        if (!force && !isTradingEnabled()) {
            return;
        }

        const maintenanceMargin = Number.isFinite(snapshot.maintenanceMargin)
            ? Math.max(0, Number(snapshot.maintenanceMargin))
            : maintenanceMarginService.getMaintenanceMargin(snapshot.requiredMargin);
        const breached = maintenanceMarginService.isImmediateLiquidationEligible(
            snapshot.equity,
            snapshot.requiredMargin
        ) || (snapshot.requiredMargin > EPSILON && snapshot.equity <= maintenanceMargin);

        if (!breached) {
            const targetState = snapshot.requiredMargin > EPSILON && snapshot.equity < snapshot.requiredMargin
                ? "MARGIN_STRESSED"
                : "NORMAL";
            await this.persistAccountState(userId, targetState);
            return;
        }

        // C-3 FIX: Guard must be set BEFORE the first await so concurrent
        // tick-driven callers see it immediately and do not start a second loop.
        if (this.activeUsers.has(userId)) return;
        this.activeUsers.add(userId);

        try {
            await this.persistAccountState(userId, "LIQUIDATING");
            await this.liquidationLoop(userId, force);
        } finally {
            this.activeUsers.delete(userId);
        }
    }

    private async liquidationLoop(userId: string, force: boolean): Promise<void> {
        // Load state ONCE before the loop — avoids N+1 DB reads during liquidation
        let risk = await this.computeRiskState(userId);
        if (!risk) {
            await this.persistAccountState(userId, "NORMAL");
            return;
        }

        logger.warn(
            {
                event: "LIQUIDATION_STARTED",
                userId,
                equity: risk.equity,
                requiredMargin: risk.requiredMargin,
                maintenanceMargin: risk.maintenanceMargin,
                positions: risk.positions.length,
            },
            "LIQUIDATION_STARTED"
        );

        for (let step = 0; step < MAX_LIQUIDATION_STEPS; step++) {
            if (!force && !isTradingEnabled()) {
                return;
            }

            // Check breach using already-loaded risk — no DB query per iteration
            const breached =
                maintenanceMarginService.isImmediateLiquidationEligible(risk.equity, risk.requiredMargin) ||
                (risk.requiredMargin > EPSILON && risk.equity <= risk.maintenanceMargin);

            if (!breached) {
                const targetState = nextNonLiquidatingState(risk);
                await this.persistAccountState(userId, targetState);
                logger.info(
                    {
                        event: "ACCOUNT_STABILIZED",
                        userId,
                        equity: risk.equity,
                        requiredMargin: risk.requiredMargin,
                        maintenanceMargin: risk.maintenanceMargin,
                        state: targetState,
                    },
                    "ACCOUNT_STABILIZED"
                );
                return;
            }

            if (risk.positions.length === 0) {
                await this.persistAccountState(userId, "NORMAL");
                logger.info(
                    {
                        event: "ACCOUNT_STABILIZED",
                        userId,
                        equity: risk.equity,
                        requiredMargin: risk.requiredMargin,
                        maintenanceMargin: risk.maintenanceMargin,
                        state: "NORMAL",
                    },
                    "ACCOUNT_STABILIZED"
                );
                return;
            }

            const candidate = this.sortByLiquidationPriority(risk.positions)[0];
            if (!candidate) {
                return;
            }

            const executed = await this.forceClosePosition(userId, candidate, step, force);
            if (!executed) {
                return;
            }

            // Only re-query DB after a successful execution to get real new state
            risk = await this.computeRiskState(userId);
            if (!risk) {
                await this.persistAccountState(userId, "NORMAL");
                return;
            }
        }
    }

    private async forceClosePosition(
        userId: string,
        position: PositionRisk,
        step: number,
        force: boolean
    ): Promise<boolean> {
        const side: "BUY" | "SELL" = position.quantity > 0 ? "SELL" : "BUY";
        const quantity = Math.abs(position.quantity);
        if (quantity <= 0) return false;

        const idempotencyKey = `LIQ-${userId}-${position.positionId}`;

        const existingForcedOrder = await db
            .select({ id: orders.id, status: orders.status })
            .from(orders)
            .where(and(
                eq(orders.userId, userId),
                eq(orders.instrumentToken, position.instrumentToken),
                eq(orders.side, side),
                eq(orders.orderType, "MARKET"),
                eq(orders.rejectionReason, "FORCED_LIQUIDATION"),
                inArray(orders.status, ["OPEN", "PROCESSING"])
            ))
            .limit(1);

        if (existingForcedOrder.length > 0) {
            // If already open or processing, let the execution engine handle it naturally on the next tick
            return false;
        }

        try {
            const orderPayload = {
                symbol: position.symbol,
                instrumentToken: position.instrumentToken,
                quantity,
                side,
                orderType: "MARKET" as const,
                productType: "CNC" as const, // For liquidation, productType doesn't gate execution
                idempotencyKey,
                exitReason: "SQUARE_OFF" as const,
                rejectionReason: "FORCED_LIQUIDATION",
            };

            const order = await OrderPipelineService.placeOrder(userId, orderPayload, {
                force,
                isClosingOrder: true,
            });

            logger.warn(
                {
                    event: "POSITION_FORCE_CLOSED_ORDER_PLACED",
                    userId,
                    orderId: order.id,
                    instrumentToken: position.instrumentToken,
                    side,
                    quantity,
                    marginUsage: position.marginUsage,
                    unrealizedLoss: position.unrealizedLoss,
                    notional: position.notional,
                },
                "POSITION_FORCE_CLOSED_ORDER_PLACED"
            );

            // True means we successfully placed the liquidation request
            return true;
        } catch (error) {
            logger.error(
                { err: error, userId, instrument: position.instrumentToken },
                "Failed to place forced liquidation order via pipeline"
            );
            return false;
        }
    }

    private sortByLiquidationPriority(items: PositionRisk[]): PositionRisk[] {
        return [...items].sort((a, b) => {
            if (Math.abs(b.marginUsage - a.marginUsage) > EPSILON) return b.marginUsage - a.marginUsage;
            if (Math.abs(b.unrealizedLoss - a.unrealizedLoss) > EPSILON) return b.unrealizedLoss - a.unrealizedLoss;
            if (Math.abs(b.notional - a.notional) > EPSILON) return b.notional - a.notional;
            return a.instrumentToken.localeCompare(b.instrumentToken);
        });
    }

    private async computeRiskState(userId: string): Promise<RiskState | null> {
        const snapshot = await LedgerService.reconstructUserEquity(userId);
        if (!snapshot) return null;

        const rawPositions = await db
            .select({
                id: positions.id,
                instrumentToken: positions.instrumentToken,
                symbol: positions.symbol,
                quantity: positions.quantity,
                averagePrice: positions.averagePrice,
                realizedPnL: positions.realizedPnL,
            })
            .from(positions)
            .where(eq(positions.userId, userId));

        if (rawPositions.length === 0) {
            return {
                equity: round2(toNumber(snapshot.totalBalance)),
                requiredMargin: 0,
                maintenanceMargin: 0,
                positions: [],
            };
        }

        const repo = InstrumentRepository.getInstance();
        await repo.ensureInitialized();

        // Bulk pre-fetch instruments that are not already in the in-memory repo cache
        // to eliminate N per-position DB round-trips.
        const uncachedTokens = rawPositions
            .map((r) => String(r.instrumentToken || ""))
            .filter((token) => token && !repo.get(token));

        const localInstrumentCache = new Map<string, Instrument>();
        if (uncachedTokens.length > 0) {
            const rows = await db
                .select()
                .from(instruments)
                .where(inArray(instruments.instrumentToken, uncachedTokens));
            for (const row of rows) {
                localInstrumentCache.set(row.instrumentToken, row);
            }
        }

        let unrealizedPnL = 0;
        let realizedPnL = 0;
        let requiredMargin = 0;
        const positionsWithRisk: PositionRisk[] = [];

        for (const row of rawPositions) {
            const token = String(row.instrumentToken || "");
            const quantity = Number(row.quantity);
            if (!token || !Number.isFinite(quantity) || quantity === 0) continue;

            const averagePrice = toNumber(row.averagePrice);
            // Check localInstrumentCache first (bulk-prefetched above), then repo, then DB
            const instrument =
                localInstrumentCache.get(token) ||
                (await this.getInstrumentByToken(token, repo));
            const symbol = instrument?.tradingsymbol || row.symbol;
            const instrumentType = instrument?.instrumentType || "EQUITY";
            const markPrice = this.resolveMarkPrice(token, symbol, averagePrice);

            const item: PositionRisk = {
                positionId: row.id,
                instrumentToken: token,
                symbol,
                quantity,
                averagePrice,
                instrumentType,
                markPrice,
                marginUsage: 0,
                unrealizedLoss: 0,
                notional: Math.abs(quantity) * markPrice,
                underlying: instrument?.underlying || instrument?.name || null,
            };

            if (quantity >= 0) {
                unrealizedPnL += (markPrice - averagePrice) * quantity;
            } else {
                unrealizedPnL += (averagePrice - markPrice) * Math.abs(quantity);
            }
            realizedPnL += toNumber(row.realizedPnL);

            item.marginUsage = await computeRequiredMargin(item);
            item.unrealizedLoss = computeUnrealizedLoss(item);

            requiredMargin += item.marginUsage;
            positionsWithRisk.push(item);
        }

        // D-3 FIX: wallet.balance = freeCash + blockedMargin (set by syncWalletCacheFromLedger).
        // Realized gains are credited to freeCash through the double-entry ledger, so they are
        // already included in wallet.balance. Adding realizedPnL again double-counts them and
        // can trigger false margin calls immediately after a profitable trade.
        const equity = round2(toNumber(snapshot.totalBalance) + unrealizedPnL);
        const normalizedRequired = round2(requiredMargin);
        const maintenanceMargin = maintenanceMarginService.getMaintenanceMargin(normalizedRequired);

        return {
            equity,
            requiredMargin: normalizedRequired,
            maintenanceMargin,
            positions: positionsWithRisk,
        };
    }

    private async getInstrumentByToken(
        instrumentToken: string,
        repo: InstrumentRepository
    ): Promise<Instrument | undefined> {
        const cached = repo.get(instrumentToken);
        if (cached) return cached;

        const [instrument] = await db
            .select()
            .from(instruments)
            .where(eq(instruments.instrumentToken, instrumentToken))
            .limit(1);

        return instrument;
    }

    private resolveMarkPrice(instrumentToken: string, symbol: string, fallback: number): number {
        const live = realTimeMarketService.getQuote(instrumentToken);
        const livePrice = Number(live?.price);
        if (Number.isFinite(livePrice) && livePrice > 0) return livePrice;

        const simulated = marketSimulation.getQuote(symbol);
        const simPrice = Number(simulated?.price);
        if (Number.isFinite(simPrice) && simPrice > 0) return simPrice;

        return Math.max(0.01, fallback);
    }

    private async persistAccountState(userId: string, nextState: AccountState): Promise<void> {
        const cached = this.lastStateByUser.get(userId);
        if (cached === nextState) return;

        await db
            .update(wallets)
            .set({
                accountState: nextState,
                updatedAt: new Date(),
            })
            .where(eq(wallets.userId, userId));

        this.lastStateByUser.set(userId, nextState);
    }
}

declare global {
    var __liquidationEngineServiceInstance: LiquidationEngineService | undefined;
}

const globalState = globalThis as unknown as {
    __liquidationEngineServiceInstance?: LiquidationEngineService;
};

export const liquidationEngineService =
    globalState.__liquidationEngineServiceInstance || new LiquidationEngineService();

// Always cache globally to prevent duplicate instances in production
globalState.__liquidationEngineServiceInstance = liquidationEngineService;





