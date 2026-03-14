import { ApiError } from "@/lib/errors";
import { logger } from "@/lib/logger";

type TradingGateOptions = {
    force?: boolean;
    context?: string;
};

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const PAPER_TRADING_MODE =
    String(process.env.PAPER_TRADING_MODE ?? "true").trim().toLowerCase() !== "false";

let runtimeHaltReason: string | null = null;
let lastKnownTradingEnabled = computeTradingEnabled();

function parseTradingDisabledFlag(): boolean {
    const raw = String(process.env.TRADING_DISABLED ?? "false").trim().toLowerCase();
    return TRUE_VALUES.has(raw);
}

function computeTradingEnabled(): boolean {
    return !parseTradingDisabledFlag() && !runtimeHaltReason;
}

function emitTransitionIfNeeded(nextEnabled: boolean): void {
    if (nextEnabled === lastKnownTradingEnabled) return;

    lastKnownTradingEnabled = nextEnabled;
    if (nextEnabled) {
        logger.warn({ event: "SYSTEM_TRADING_RESUMED" }, "SYSTEM_TRADING_RESUMED");
    } else {
        logger.error({ event: "SYSTEM_TRADING_HALTED" }, "SYSTEM_TRADING_HALTED");
    }
}

export function isTradingEnabled(): boolean {
    const next = computeTradingEnabled();
    emitTransitionIfNeeded(next);
    return next;
}

/**
 * Halt trading by setting a runtime halt reason.
 *
 * This ALWAYS works regardless of PAPER_TRADING_MODE.
 * The paper-mode flag controls risk limits and fill logic — it must NEVER
 * disable the emergency safety brake used by WAJ corruption detection and
 * the event replay engine.
 */
export function haltTrading(reason: string): void {
    const normalized = String(reason || "UNKNOWN").trim().toUpperCase();
    if (!normalized) return;

    runtimeHaltReason = normalized;
    logger.error(
        { event: "SYSTEM_TRADING_HALTED", reason: normalized, paperMode: PAPER_TRADING_MODE },
        "Trading halted"
    );
    emitTransitionIfNeeded(computeTradingEnabled());
}

/**
 * Resume trading programmatically (clears the runtime halt).
 *
 * In paper mode this is a no-op for accidental calls so tests cannot
 * accidentally resume a real halt. Pass force:true from admin tooling
 * to clear an intentional halt in any mode.
 */
export function resumeTrading(reason: string, options: { force?: boolean } = {}): void {
    const normalized = String(reason || "UNKNOWN").trim().toUpperCase();
    if (!normalized) return;

    if (PAPER_TRADING_MODE && !options.force) {
        logger.warn(
            { event: "SYSTEM_TRADING_RESUME_SKIPPED", reason: normalized },
            "Paper trading mode: resumeTrading no-op (pass force:true to override)"
        );
        return;
    }

    runtimeHaltReason = null;
    emitTransitionIfNeeded(computeTradingEnabled());
}

export function assertTradingEnabled(options: TradingGateOptions = {}): void {
    if (options.force) return;
    if (isTradingEnabled()) return;

    throw new ApiError(
        "Trading is temporarily disabled",
        503,
        "TRADING_DISABLED"
    );
}
