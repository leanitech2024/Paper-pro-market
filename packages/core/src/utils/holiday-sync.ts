/**
 * UpstoxHolidaySync
 *
 * Fetches the NSE trading holiday calendar from the Upstox public API
 * (no auth required for the yearly list) and caches the result in-memory
 * for 24 hours. Falls back gracefully to env-var overrides and an empty
 * set so the app never hard-crashes on a network failure.
 *
 * API: GET https://api.upstox.com/v2/market/holidays
 * API: GET https://api.upstox.com/v2/market/holidays/:date  (YYYY-MM-DD)
 */

import { getIstDateKey } from "./dates.js";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UpstoxHolidayEntry {
    date: string;
    description: string;
    holiday_type: "TRADING_HOLIDAY" | "SETTLEMENT_HOLIDAY" | string;
    closed_exchanges: string[];
    open_exchanges: Array<{
        exchange: string;
        start_time: number;
        end_time: number;
    }>;
}

interface UpstoxHolidayResponse {
    status: string;
    data: UpstoxHolidayEntry[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const UPSTOX_HOLIDAYS_URL = "https://api.upstox.com/v2/market/holidays";
const NSE_EXCHANGES = ["NSE", "NFO", "BSE", "BFO"] as const;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ─── Cache ────────────────────────────────────────────────────────────────────

interface HolidayCache {
    holidays: Set<string>;
    fetchedAt: number;
    year: number;
}

let cache: HolidayCache | null = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns true if the holiday entry means NSE is fully closed for trading.
 * Holidays where NSE/BSE appear in open_exchanges with modified hours are
 * NOT treated as full closures (e.g., Budget Day, Diwali Muhurat).
 */
function isNseFullyClosed(entry: UpstoxHolidayEntry): boolean {
    if (entry.holiday_type !== "TRADING_HOLIDAY") return false;

    const openExchanges = entry.open_exchanges.map((e) => e.exchange);
    const nseIsOpen = NSE_EXCHANGES.some((ex) => openExchanges.includes(ex));

    // If NSE/BSE appear in open_exchanges, market has special hours — not a full holiday
    return !nseIsOpen;
}

function parseEnvFallback(): Set<string> {
    const raw =
        process.env["NSE_TRADING_HOLIDAYS_IST"] ??
        process.env["NSE_CLOSED_DATES_IST"] ??
        "";
    const dates = raw
        .split(",")
        .map((d) => d.trim())
        .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
    return new Set(dates);
}

// ─── Core Fetch ───────────────────────────────────────────────────────────────

async function fetchHolidaysFromUpstox(year: number): Promise<Set<string>> {
    const url = `${UPSTOX_HOLIDAYS_URL}`;
    const res = await fetch(url, {
        headers: { Accept: "application/json" },
        // Node 18+ supports signal in fetch; short timeout to avoid blocking startup
        signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
        throw new Error(
            `Upstox holiday API responded ${res.status}: ${res.statusText}`
        );
    }

    const body: unknown = await res.json();

    if (
        !body ||
        typeof body !== "object" ||
        !("data" in body) ||
        !Array.isArray((body as UpstoxHolidayResponse).data)
    ) {
        throw new Error("Upstox holiday API returned an unexpected shape");
    }

    const response = body as UpstoxHolidayResponse;
    const holidays = new Set<string>();

    for (const entry of response.data) {
        if (!entry.date || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) continue;

        // Only block trading for the requested year and for full NSE closures
        if (!entry.date.startsWith(String(year))) continue;
        if (isNseFullyClosed(entry)) {
            holidays.add(entry.date);
        }
    }

    return holidays;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the set of NSE full-closure holiday dates (YYYY-MM-DD) for the
 * current IST year, using a 24-hour in-process cache. On any fetch failure,
 * falls back to the env-var list so the system never crashes.
 */
export async function getNseHolidays(): Promise<Set<string>> {
    const now = new Date();
    const yearStr = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
    }).format(now);
    const currentYear = Number(yearStr);

    if (
        cache &&
        cache.year === currentYear &&
        Date.now() - cache.fetchedAt < CACHE_TTL_MS
    ) {
        return cache.holidays;
    }

    try {
        const holidays = await fetchHolidaysFromUpstox(currentYear);

        // Merge with any manually overridden dates from env (additive)
        for (const d of parseEnvFallback()) {
            holidays.add(d);
        }

        cache = { holidays, fetchedAt: Date.now(), year: currentYear };
        return holidays;
    } catch {
        // Network failure, API down, etc. — fall back gracefully
        const fallback = parseEnvFallback();
        // If we have a stale cache from the same year, prefer it over empty fallback
        if (cache && cache.year === currentYear) {
            return cache.holidays;
        }
        return fallback;
    }
}

/**
 * Checks if a specific date is a trading holiday for NSE.
 * Uses the full cached year list — prefer this for hot paths.
 * @param date - Date object or YYYY-MM-DD string
 */
export async function isNseTradingHoliday(
    date: Date | string = new Date()
): Promise<boolean> {
    const dateKey =
        typeof date === "string" ? date : getIstDateKey(date);
    const holidays = await getNseHolidays();
    return holidays.has(dateKey);
}

/**
 * Invalidates the in-memory cache, forcing the next call to re-fetch.
 * Useful at market-engine startup or after a manual override.
 */
export function invalidateHolidayCache(): void {
    cache = null;
}
