/**
 * market-hours.ts
 *
 * Provides market-open checks for the NSE cash session (09:15–15:30 IST,
 * Mon–Fri, excluding holidays).
 *
 * Holiday data comes from two sources (merged, additive):
 *  1. Upstox Market Holidays API (auto-refreshed every 24 h via holiday-sync)
 *  2. NSE_TRADING_HOLIDAYS_IST or NSE_CLOSED_DATES_IST env vars (manual overrides)
 *
 * Use the async variants (isMarketOpenISTAsync / isTradingHolidayISTAsync) in
 * any server-side code where an await is available — they use live Upstox data.
 *
 * The sync variants (isMarketOpenIST / isTradingHolidayIST) are kept for
 * backwards-compatibility and for client-side use; they only read env vars.
 */

import { getNseHolidays, isNseTradingHoliday } from "./holiday-sync.js";
import { getIstDateKey } from "./dates.js";

// ─── Env-var fallback (sync, for backwards-compat) ───────────────────────────

const HOLIDAY_ENV_KEYS = ["NSE_TRADING_HOLIDAYS_IST", "NSE_CLOSED_DATES_IST"] as const;

function parseHolidayList(raw: string | undefined): string[] {
    if (!raw) return [];
    return raw
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => /^\d{4}-\d{2}-\d{2}$/.test(entry));
}

function loadHolidaySet(): Set<string> {
    const holidays = new Set<string>();
    for (const key of HOLIDAY_ENV_KEYS) {
        const raw = process.env[key];
        for (const dateKey of parseHolidayList(raw)) {
            holidays.add(dateKey);
        }
    }
    return holidays;
}

// Loaded once at module init — only contains env-var dates
const ENV_MARKET_HOLIDAYS_IST = loadHolidaySet();

// ─── Date helpers ─────────────────────────────────────────────────────────────


// ─── IST weekday + time parser ────────────────────────────────────────────────

interface IstParts {
    weekday: string;
    totalMinutes: number;
}

function getIstParts(now: Date): IstParts {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(now);

    const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
    const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
    const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");

    return { weekday, totalMinutes: hour * 60 + minute };
}

const OPEN_MINUTES = 9 * 60 + 15;   // 09:15 IST
const CLOSE_MINUTES = 15 * 60 + 30; // 15:30 IST

// ─── Sync variants (env-var only, backwards-compat) ───────────────────────────

/**
 * Sync check — only reads env-var holiday list loaded at startup.
 * Prefer `isTradingHolidayISTAsync` for server-side code.
 */
export function isTradingHolidayIST(now: Date = new Date()): boolean {
    return ENV_MARKET_HOLIDAYS_IST.has(getIstDateKey(now));
}

/**
 * Sync check — only reads env-var holiday list loaded at startup.
 * Prefer `isMarketOpenISTAsync` for server-side scheduled/API code.
 */
export function isMarketOpenIST(now: Date = new Date()): boolean {
    const { weekday, totalMinutes } = getIstParts(now);

    if (weekday === "Sat" || weekday === "Sun") return false;
    if (isTradingHolidayIST(now)) return false;

    return totalMinutes >= OPEN_MINUTES && totalMinutes <= CLOSE_MINUTES;
}

// ─── Async variants (Upstox API, recommended) ────────────────────────────────

/**
 * Async check using live Upstox holiday data (cached 24 h).
 * Falls back to env vars if the API is unreachable.
 */
export async function isTradingHolidayISTAsync(
    now: Date = new Date()
): Promise<boolean> {
    return isNseTradingHoliday(now);
}

/**
 * Async market-open check using live Upstox holiday data (cached 24 h).
 * Recommended for all server-side order validation and engine startup.
 */
export async function isMarketOpenISTAsync(
    now: Date = new Date()
): Promise<boolean> {
    const { weekday, totalMinutes } = getIstParts(now);

    if (weekday === "Sat" || weekday === "Sun") return false;
    if (await isTradingHolidayISTAsync(now)) return false;

    return totalMinutes >= OPEN_MINUTES && totalMinutes <= CLOSE_MINUTES;
}

/**
 * Pre-warms the holiday cache at app/engine startup.
 * Call once during bootstrap so the first market-open check doesn't block.
 */
export async function warmHolidayCache(): Promise<void> {
    await getNseHolidays();
}

// Re-export for consumers who want direct access to the holiday set
export { getNseHolidays, invalidateHolidayCache } from "./holiday-sync.js";
