import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { instruments, positions, wallets } from "@paper-market/core/db";
import { logger } from "@/lib/logger";
import { toInstrumentKey } from "@paper-market/core";
import { tickBus } from "@/lib/trading/tick-bus";
import type { NormalizedTick } from "@paper-market/core";
import { eventBus } from "@/lib/event-bus";
import { maintenanceMarginService } from "@/services/trading/valuation/maintenance-margin.service";
import { liquidationEngineService } from "@/services/trading/valuation/liquidation-engine.service";
import { instrumentStore } from "@/stores/instrument.store";


import { realTimeMarketService } from "@/services/market/feeds/realtime-market.service";
import { LedgerService } from "@/services/accounting/ledger/ledger.service";
import { MarginCalculatorService } from "@/services/trading/margin/margin-calculator.service";
import { getRedis } from "@/lib/redis";

type MarginStatus = "NORMAL" | "MARGIN_STRESSED";
type AccountState = "NORMAL" | "MARGIN_STRESSED" | "LIQUIDATING";

type PositionCache = {
    userId: string;
    instrumentToken: string;
    quantity: number;
    averagePrice: number;
    realizedPnL: number;
    instrumentType: string;
};

type WalletState = {
    walletId: string;
    balance: number;
    equity: number;
    unrealizedPnL: number;
    realizedPnL: number;
    requiredMargin: number;
    maintenanceMargin: number;
    marginStatus: MarginStatus;
    accountState: AccountState;
    lastComputedAt: number | null;
    _needsMarginRecalc?: boolean;
};

type TickPrice = {
    price: number;
    timestampMs: number;
};

export type MtmRiskPosition = {
    instrumentToken: string;
    quantity: number;
    averagePrice: number;
    instrumentType: string;
    markPrice: number;
    notional: number;
};

export type MtmSnapshot = {
    balance: number;
    equity: number;
    unrealizedPnL: number;
    realizedPnL: number;
    requiredMargin: number;
    maintenanceMargin: number;
    marginStatus: MarginStatus;
    accountState: AccountState;
    lastComputedAt: number | null;
};

const MTM_STALE_TICK_MAX_AGE_MS =
    Number(process.env.MTM_STALE_TICK_MAX_AGE_SECONDS ?? "10") * 1000;
const EPSILON = 0.005;
const MTM_EXCLUDED_USER_PREFIXES = ["token-separation-", "snapshot-token-"];

function toNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function round2(value: number): number {
    return Math.round(value * 100) / 100;
}

function normalizeAccountState(value: unknown): AccountState {
    const raw = String(value || "").toUpperCase();
    if (raw === "LIQUIDATING") return "LIQUIDATING";
    if (raw === "MARGIN_STRESSED") return "MARGIN_STRESSED";
    return "NORMAL";
}

async function computeRequiredMargin(
    position: PositionCache,
    markPrice: number,
    resolveUnderlyingPrice: (instrumentToken: string, fallbackPrice: number) => number
): Promise<number> {
    return await MarginCalculatorService.calculatePositionMargin(
        position.instrumentToken,
        position.quantity,
        markPrice,
        resolveUnderlyingPrice
    );
}

function isMtmExcludedUser(userId: string): boolean {
    const normalized = String(userId || "").trim();
    return MTM_EXCLUDED_USER_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

export class MtmEngineService {
    private initialized = false;
    private initializePromise: Promise<void> | null = null;
    private refreshingUsers = new Set<string>();
    private flushing = false;
    private flushScheduled = false;
    private userRefreshDebounceTimers = new Map<string, NodeJS.Timeout>();

    private positionsByUser = new Map<string, PositionCache[]>();
    private userTokens = new Map<string, Set<string>>();
    private tokenToUsers = new Map<string, Set<string>>();
    private latestPriceByToken = new Map<string, TickPrice>();
    private walletsByUser = new Map<string, WalletState>();
    private dirtyUsers = new Set<string>();
    private subscribedTokens = new Set<string>();

    private resolveOptionUnderlyingPrice(instrumentToken: string, fallbackPrice: number): number {
        const fallback = Math.max(0.01, Number(fallbackPrice) || 0.01);
        if (!instrumentStore.isReady()) return fallback;

        const instrument = instrumentStore.getByToken(instrumentToken);
        if (!instrument) return fallback;

        const hint = String(instrument.name || "").trim();
        if (!hint) return fallback;

        const underlying = instrumentStore.getBySymbol(hint);
        if (underlying?.instrumentToken) {
            const tick = this.latestPriceByToken.get(underlying.instrumentToken);
            if (tick && Number.isFinite(tick.price) && tick.price > 0) return tick.price;
        }

        const hintTick = this.latestPriceByToken.get(hint);
        if (hintTick && Number.isFinite(hintTick.price) && hintTick.price > 0) return hintTick.price;

        return fallback;
    }

    private readonly onTick = (tick: NormalizedTick): void => {
        if (!this.initialized) return;

        const instrumentToken = toInstrumentKey(String(tick.instrumentKey || ""));
        if (!instrumentToken) return;

        const price = Number(tick.price);
        if (!Number.isFinite(price) || price <= 0) return;

        const tickTimestampMs = Number(tick.timestamp) * 1000;
        const nowMs = Date.now();
        if (!Number.isFinite(tickTimestampMs)) return;

        const ageMs = nowMs - tickTimestampMs;
        if (ageMs > MTM_STALE_TICK_MAX_AGE_MS || ageMs < -5000) {
            return;
        }

        this.latestPriceByToken.set(instrumentToken, {
            price,
            timestampMs: tickTimestampMs,
        });

        eventBus.emit("price.tick", {
            instrumentToken,
            price,
            timestampMs: tickTimestampMs,
        });

        const affectedUsers = this.tokenToUsers.get(instrumentToken);
        if (!affectedUsers || affectedUsers.size === 0) return;

        for (const userId of affectedUsers) {
            void this.revalueUser(userId, nowMs, true);
        }
        this.scheduleFlush();
    };

    private debounceUserRefresh(userId: string) {
        if (!this.initialized) return;
        const existingTimer = this.userRefreshDebounceTimers.get(userId);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }
        this.userRefreshDebounceTimers.set(
            userId,
            setTimeout(() => {
                this.userRefreshDebounceTimers.delete(userId);
                this.dirtyUsers.delete(userId);
                
                // When refreshing from a position/order change, we must recalculate margins
                const walletState = this.walletsByUser.get(userId);
                if (walletState) {
                    walletState._needsMarginRecalc = true;
                }
                
                void this.refreshUsers([userId]);
            }, 100) // 100ms debounce
        );
    }

    private readonly onOrderExecuted = (payload: { userId: string }): void => {
        if (!payload?.userId) return;
        this.debounceUserRefresh(payload.userId);
    };

    private readonly onPositionChanged = (payload: { userId: string }): void => {
        if (!payload?.userId) return;
        this.debounceUserRefresh(payload.userId);
    };

    async initialize(): Promise<void> {
        if (this.initialized) return;
        if (this.initializePromise) {
            await this.initializePromise;
            return;
        }

        this.initializePromise = (async () => {
            tickBus.on("tick", this.onTick);
            eventBus.on("order.executed", this.onOrderExecuted);
            eventBus.on("position.changed", this.onPositionChanged);

            this.initialized = true;
            logger.info("MTM engine initialized (event-driven)");
        })();

        try {
            await this.initializePromise;
        } finally {
            this.initializePromise = null;
        }
    }

    async shutdown(): Promise<void> {
        if (!this.initialized) return;

        tickBus.off("tick", this.onTick);
        eventBus.off("order.executed", this.onOrderExecuted);
        eventBus.off("position.changed", this.onPositionChanged);

        this.initialized = false;
    }

    requestRefresh(userId?: string): void {
        if (!this.initialized) return;
        if (userId) {
            void this.refreshUsers([userId]);
            return;
        }

        const loadedUsers = Array.from(this.walletsByUser.keys());
        if (loadedUsers.length > 0) {
            void this.refreshUsers(loadedUsers);
        }
    }

    async forceRefreshOpenState(): Promise<void> {
        const loadedUsers = Array.from(this.walletsByUser.keys());
        if (loadedUsers.length === 0) return;
        await this.refreshUsers(loadedUsers);
    }

    async refreshUserNow(userId: string): Promise<void> {
        if (!this.initialized) return;
        const normalizedUserId = String(userId || "").trim();
        if (!normalizedUserId) return;
        await this.refreshUsers([normalizedUserId]);
        await this.flushSnapshots();
    }

    async forceFlush(): Promise<void> {
        await this.flushSnapshots();
    }

    getUserSnapshot(userId: string): MtmSnapshot | null {
        const state = this.walletsByUser.get(userId);
        if (!state) {
            if (this.initialized) {
                void this.refreshUsers([userId]);
            }
            return null;
        }

        return {
            balance: state.balance,
            equity: state.equity,
            unrealizedPnL: state.unrealizedPnL,
            realizedPnL: state.realizedPnL,
            requiredMargin: state.requiredMargin,
            maintenanceMargin: state.maintenanceMargin,
            marginStatus: state.marginStatus,
            accountState: state.accountState,
            lastComputedAt: state.lastComputedAt,
        };
    }

    getLatestPrice(instrumentToken: string, maxAgeMs: number = MTM_STALE_TICK_MAX_AGE_MS): number | null {
        const state = this.latestPriceByToken.get(instrumentToken);
        if (!state) return null;

        const nowMs = Date.now();
        const ageMs = nowMs - state.timestampMs;
        if (!Number.isFinite(ageMs) || ageMs < -5000 || ageMs > maxAgeMs) {
            return null;
        }

        return state.price;
    }

    getUserRiskPositions(userId: string): MtmRiskPosition[] {
        const positions = this.positionsByUser.get(userId) || [];
        if (positions.length === 0 && this.initialized) {
            void this.refreshUsers([userId]);
        }

        const nowMs = Date.now();

        return positions
            .filter((position) => Number.isFinite(position.quantity) && position.quantity !== 0)
            .map((position) => {
                const latest = this.latestPriceByToken.get(position.instrumentToken);
                const latestAge = latest ? nowMs - latest.timestampMs : Number.POSITIVE_INFINITY;
                const markPrice =
                    latest &&
                    Number.isFinite(latest.price) &&
                    latest.price > 0 &&
                    Number.isFinite(latestAge) &&
                    latestAge >= -5000 &&
                    latestAge <= MTM_STALE_TICK_MAX_AGE_MS
                        ? latest.price
                        : position.averagePrice;

                return {
                    instrumentToken: position.instrumentToken,
                    quantity: position.quantity,
                    averagePrice: position.averagePrice,
                    instrumentType: position.instrumentType || "EQUITY",
                    markPrice,
                    notional: Math.abs(position.quantity) * Math.max(0.01, markPrice),
                };
            });
    }

    private async refreshUsers(userIds: string[]): Promise<void> {
        const unique = Array.from(new Set(userIds.map((id) => String(id || "").trim()).filter(Boolean)));
        if (unique.length === 0) return;

        const pending = unique
            .filter((userId) => !this.refreshingUsers.has(userId))
            .map(async (userId) => {
                this.refreshingUsers.add(userId);
                try {
                    await this.refreshUserState(userId);
                } finally {
                    this.refreshingUsers.delete(userId);
                }
            });

        if (pending.length === 0) return;
        await Promise.all(pending);
    }

    private async refreshUserState(userId: string): Promise<void> {
        if (isMtmExcludedUser(userId)) {
            this.clearUser(userId);
            return;
        }

        const ledgerSnapshot = await LedgerService.reconstructUserEquity(userId);
        if (!ledgerSnapshot) {
            this.clearUser(userId);
            return;
        }

        // We still need the wallet ID for some things, but we use ledger values for balances
        const [walletRow] = await db
            .select({
                id: wallets.id,
                userId: wallets.userId,
                marginStatus: wallets.marginStatus,
                accountState: wallets.accountState,
            })
            .from(wallets)
            .where(eq(wallets.userId, userId))
            .limit(1);

        if (!walletRow) {
            this.clearUser(userId);
            return;
        }

        const rows = await db
            .select({
                userId: positions.userId,
                instrumentToken: positions.instrumentToken,
                quantity: positions.quantity,
                averagePrice: positions.averagePrice,
                realizedPnL: positions.realizedPnL,
                instrumentType: instruments.instrumentType,
            })
            .from(positions)
            .leftJoin(instruments, eq(positions.instrumentToken, instruments.instrumentToken))
            .where(
                and(
                    eq(positions.userId, userId),
                    ne(positions.quantity, 0)
                )
            );

        const parsed: PositionCache[] = [];
        for (const row of rows) {
            const token = toInstrumentKey(String(row.instrumentToken || ""));
            const qty = Number(row.quantity);
            if (!token || !Number.isFinite(qty) || qty === 0) continue;
            parsed.push({
                userId,
                instrumentToken: token,
                quantity: qty,
                averagePrice: toNumber(row.averagePrice),
                realizedPnL: toNumber(row.realizedPnL),
                instrumentType: String(row.instrumentType || "EQUITY"),
            });
        }

        const previousWallet = this.walletsByUser.get(userId);
        const nextWallet: WalletState & { _needsMarginRecalc?: boolean } = {
            walletId: walletRow.id || previousWallet?.walletId || "",
            balance: toNumber(ledgerSnapshot.totalBalance),
            equity: toNumber(ledgerSnapshot.equity),
            unrealizedPnL: toNumber(ledgerSnapshot.unrealizedPnl),
            realizedPnL: toNumber(ledgerSnapshot.realizedPnl),
            requiredMargin: previousWallet?.requiredMargin ?? 0,
            maintenanceMargin: previousWallet?.maintenanceMargin ?? 0,
            marginStatus: walletRow.marginStatus === "MARGIN_STRESSED" ? "MARGIN_STRESSED" : "NORMAL",
            accountState: normalizeAccountState(walletRow.accountState || previousWallet?.accountState || "NORMAL"),
            lastComputedAt: previousWallet?.lastComputedAt ?? null,
            _needsMarginRecalc: true,
        };

        this.walletsByUser.set(userId, nextWallet);
        this.positionsByUser.set(userId, parsed);
        this.updateTokenIndexForUser(userId, parsed.map((item) => item.instrumentToken));

        await this.revalueUser(userId, Date.now(), false);
        this.scheduleFlush();
    }

    private updateTokenIndexForUser(userId: string, tokens: string[]): void {
        const prev = this.userTokens.get(userId) || new Set<string>();
        const next = new Set(tokens);

        for (const token of prev) {
            if (next.has(token)) continue;
            const users = this.tokenToUsers.get(token);
            if (!users) continue;
            users.delete(userId);
            if (users.size === 0) {
                this.tokenToUsers.delete(token);
            }
        }

        for (const token of next) {
            let users = this.tokenToUsers.get(token);
            if (!users) {
                users = new Set<string>();
                this.tokenToUsers.set(token, users);
            }
            users.add(userId);
        }

        this.userTokens.set(userId, next);
        this.syncSupervisorSubscriptions();
    }

    private syncSupervisorSubscriptions(): void {
        const desiredTokens = new Set(this.tokenToUsers.keys());

        const unsubscribeTokens = Array.from(this.subscribedTokens).filter(
            (token) => !desiredTokens.has(token)
        );
        const subscribeTokens = Array.from(desiredTokens).filter(
            (token) => !this.subscribedTokens.has(token)
        );

        this.subscribedTokens = desiredTokens;

        // Delegate to realTimeMarketService so position tokens always have
        // an active market-engine WS subscription, even if not on any UI watchlist.
        if (unsubscribeTokens.length > 0) {
            void realTimeMarketService.unsubscribe(unsubscribeTokens);
        }
        if (subscribeTokens.length > 0) {
            void realTimeMarketService.subscribe(subscribeTokens);
        }
    }

    private async revalueUser(userId: string, nowMs: number, skipMarginRecalcIfPossible = true): Promise<void> {
        const walletState = this.walletsByUser.get(userId) as WalletState & { _needsMarginRecalc?: boolean };
        if (!walletState) return;

        const userPositions = this.positionsByUser.get(userId) || [];
        if (userPositions.length === 0) {
            const nextEquity = round2(walletState.balance);
            const changed =
                Math.abs(walletState.equity - nextEquity) > EPSILON ||
                Math.abs(walletState.unrealizedPnL) > EPSILON ||
                Math.abs(walletState.requiredMargin) > EPSILON ||
                Math.abs(walletState.maintenanceMargin) > EPSILON ||
                walletState.marginStatus !== "NORMAL" ||
                walletState.accountState !== "NORMAL";

            if (changed) {
                walletState.equity = nextEquity;
                walletState.unrealizedPnL = 0;
                walletState.realizedPnL = 0;
                walletState.requiredMargin = 0;
                walletState.maintenanceMargin = 0;
                walletState.marginStatus = "NORMAL";
                walletState.accountState = "NORMAL";
                walletState.lastComputedAt = nowMs;
                this.dirtyUsers.add(userId);
            }
            walletState._needsMarginRecalc = false;
            this.triggerLiquidationCheck(userId, walletState);
            return;
        }

        let unrealizedPnL = 0;
        let requiredMargin = skipMarginRecalcIfPossible && !walletState._needsMarginRecalc 
            ? walletState.requiredMargin 
            : 0;
            
        const actuallyRecalculateMargin = !skipMarginRecalcIfPossible || walletState._needsMarginRecalc;

        for (const position of userPositions) {
            const priceState = this.latestPriceByToken.get(position.instrumentToken);
            const markPrice = priceState?.price || position.averagePrice;
            if (!Number.isFinite(markPrice) || markPrice <= 0) continue;

            const qty = position.quantity;
            const avg = position.averagePrice;
            unrealizedPnL += (markPrice - avg) * qty;
            
            if (actuallyRecalculateMargin) {
                requiredMargin += await computeRequiredMargin(
                    position,
                    markPrice,
                    (instrumentToken, fallbackPrice) =>
                        this.resolveOptionUnderlyingPrice(instrumentToken, fallbackPrice)
                );
            }
        }
        
        walletState._needsMarginRecalc = false;

        const nextEquity = round2(walletState.balance + unrealizedPnL);
        const nextRealizedPnL = round2(userPositions.reduce((sum, p) => sum + p.realizedPnL, 0));
        const nextMaintenanceMargin = maintenanceMarginService.getMaintenanceMargin(requiredMargin);
        const nextStatus: MarginStatus = nextEquity < requiredMargin ? "MARGIN_STRESSED" : "NORMAL";
        const nextAccountState: AccountState = nextStatus === "MARGIN_STRESSED" ? "MARGIN_STRESSED" : "NORMAL";

        const changed =
            Math.abs(walletState.equity - nextEquity) > EPSILON ||
            Math.abs(walletState.unrealizedPnL - unrealizedPnL) > EPSILON ||
            Math.abs(walletState.requiredMargin - requiredMargin) > EPSILON ||
            Math.abs(walletState.maintenanceMargin - nextMaintenanceMargin) > EPSILON ||
            walletState.marginStatus !== nextStatus ||
            walletState.accountState !== nextAccountState;

        if (!changed) return;

        walletState.equity = nextEquity;
        walletState.unrealizedPnL = round2(unrealizedPnL);
        // D-6 FIX: Do not reset realizedPnL to 0 — accumulate from all open
        // position caches so the UI shows correct cumulative realized P&L.
        walletState.realizedPnL = nextRealizedPnL;
        walletState.requiredMargin = round2(requiredMargin);
        walletState.maintenanceMargin = nextMaintenanceMargin;
        walletState.marginStatus = nextStatus;
        walletState.accountState = nextAccountState;
        walletState.lastComputedAt = nowMs;
        this.dirtyUsers.add(userId);
        this.triggerLiquidationCheck(userId, walletState);
    }

    private triggerLiquidationCheck(userId: string, walletState: WalletState): void {
        void liquidationEngineService
            .evaluateFromMtm(userId, {
                equity: walletState.equity,
                requiredMargin: walletState.requiredMargin,
                maintenanceMargin: walletState.maintenanceMargin,
                accountState: walletState.accountState,
            })
            .catch((error) => {
                logger.error({ err: error, userId }, "Liquidation check failed");
            });
    }

    private scheduleFlush(): void {
        if (!this.initialized || this.flushScheduled) return;
        this.flushScheduled = true;
        setImmediate(() => {
            this.flushScheduled = false;
            void this.flushSnapshots();
        });
    }

    private async flushSnapshots(): Promise<void> {
        if (!this.initialized || this.flushing || this.dirtyUsers.size === 0) {
            this.flushScheduled = false;
            return;
        }

        this.flushing = true;
        this.flushScheduled = false;
        const users = Array.from(this.dirtyUsers)
            .filter((userId) => !isMtmExcludedUser(userId));

        // Clear dirty set BEFORE the await so re-entrant marks are not lost.
        // If the flush fails, we re-add them below.
        this.dirtyUsers.clear();

        try {
            const redisPayload: Record<string, string> = {};
            const now = Date.now();

            for (const userId of users) {
                const state = this.walletsByUser.get(userId);
                if (!state || !state.walletId) continue;
                
                const equityString = String(state.equity || 0);
                const truncatedEquity = equityString.includes('.') 
                    ? equityString.substring(0, equityString.indexOf('.') + 3) 
                    : equityString;

                redisPayload[`mtm:${userId}`] = JSON.stringify({
                    equity: truncatedEquity,
                    marginStatus: state.marginStatus,
                    timestamp: now
                });
            }

            if (Object.keys(redisPayload).length > 0) {
                const redis = getRedis();
                if (redis) {
                    await redis.mset(redisPayload);
                }
            }
            logger.info({ count: users.length }, "MTM flush completed (Redis)");
        } catch (err) {
            // Re-add users to dirty set so they are retried on next flush
            for (const userId of users) {
                this.dirtyUsers.add(userId);
            }
            logger.error({ err: err }, "MTM snapshot flush failed");
        } finally {
            this.flushing = false;
            // If more dirty users accumulated during the flush, schedule another pass
            if (this.dirtyUsers.size > 0) {
                this.scheduleFlush();
            }
        }
    }

    private clearUser(userId: string): void {
        this.positionsByUser.delete(userId);
        this.walletsByUser.delete(userId);
        const tokens = this.userTokens.get(userId);
        if (tokens) {
            for (const token of tokens) {
                const users = this.tokenToUsers.get(token);
                if (!users) continue;
                users.delete(userId);
                if (users.size === 0) {
                    this.tokenToUsers.delete(token);
                }
            }
        }
        this.userTokens.delete(userId);
        this.dirtyUsers.delete(userId);
        this.syncSupervisorSubscriptions();
    }
}

declare global {
    var __mtmEngineServiceInstance: MtmEngineService | undefined;
}

const globalState = globalThis as unknown as { __mtmEngineServiceInstance?: MtmEngineService };
export const mtmEngineService = globalState.__mtmEngineServiceInstance || new MtmEngineService();
globalState.__mtmEngineServiceInstance = mtmEngineService;



