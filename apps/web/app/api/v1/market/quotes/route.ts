import { NextRequest, NextResponse } from "next/server";
import { ApiError, handleError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";
import { instruments } from "@paper-market/core/db";
import { inArray } from "drizzle-orm";
import { toInstrumentKey } from "@paper-market/core";
import { resolveUpstoxPreviousClose } from "@/lib/market/upstox-quote-normalization";
import { auth } from "@/lib/auth";
import { z } from "zod";

const UPSTOX_API_URL = "https://api.upstox.com/v2";

type UpstoxQuoteMap = Record<string, { last_price?: string | number; close_price?: string | number; [key: string]: unknown }>;

function sanitizeInstrumentKeys(input: unknown): string[] {
    if (!Array.isArray(input)) return [];
    const keys = input
        .filter((k): k is string => typeof k === "string")
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

    return Array.from(new Set(keys));
}

function toUpstoxRequestInstrumentKey(raw: string): string {
    const normalized = String(raw || "")
        .trim()
        .replace(":", "|")
        .replace(/\s*\|\s*/g, "|")
        .replace(/\s+/g, " ");

    if (!normalized) return "";

    const [prefixRaw, suffixRaw = ""] = normalized.split("|");
    const prefix = String(prefixRaw || "").toUpperCase();
    const suffix = String(suffixRaw || "").trim();
    if (!suffix) return prefix;

    if (prefix.endsWith("_INDEX")) {
        const titled = suffix
            .toLowerCase()
            .split(" ")
            .filter(Boolean)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(" ");
        return `${prefix}|${titled}`;
    }

    return `${prefix}|${suffix.toUpperCase()}`;
}

function parseJsonSafe(text: string): any | null {
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

function normalizeErrorMessage(error: unknown): string {
    if (error instanceof Error && typeof error.message === "string") {
        const msg = error.message.trim();
        if (msg.length > 0) return msg;
    }
    return "Failed to fetch quotes";
}

function buildQuoteLookup(quotes: UpstoxQuoteMap): Map<string, { last: number; close: number }> {
    const out = new Map<string, { last: number; close: number }>();

    for (const [key, quote] of Object.entries(quotes || {})) {
        const normalizedKey = toInstrumentKey(key);
        if (!normalizedKey) continue;

        const last = Number(quote?.last_price);
        if (!Number.isFinite(last) || last <= 0) continue;

        const resolvedClose = resolveUpstoxPreviousClose(quote, last);
        const close = resolvedClose ?? last;

        out.set(normalizedKey, { last, close });
        out.set(normalizedKey.replace("|", ":"), { last, close });
        out.set(normalizedKey.replace(":", "|"), { last, close });

        const sep = normalizedKey.includes(":") ? ":" : normalizedKey.includes("|") ? "|" : "";
        const suffix = sep ? normalizedKey.split(sep)[1] || "" : normalizedKey;
        if (suffix) {
            out.set(`suffix:${suffix.toUpperCase()}`, { last, close });
        }
    }

    return out;
}

// Matches ISIN-like suffixes (e.g. INE002A01018)
const ISIN_SUFFIX_RE = /^[A-Z]{2}[A-Z0-9]{8,14}$/;

/**
 * For equity keys whose suffix is a trading symbol (e.g. NSE_EQ|RELIANCE),
 * look up the actual ISIN-based instrumentToken in the DB and return a map:
 *   requestedKey → isinKey  (e.g. "NSE_EQ|RELIANCE" → "NSE_EQ|INE002A01018")
 * Keys whose suffix is already an ISIN are passed through unchanged.
 */
async function resolveSymbolKeysToIsins(
    instrumentKeys: string[]
): Promise<Map<string, string>> {
    // out[requestedKey] = isinKey (may equal requestedKey if already ISIN)
    const out = new Map<string, string>();

    const symbolNameKeys: Array<{ key: string; segment: string; symbol: string }> = [];
    const isinKeys: string[] = [];

    for (const raw of instrumentKeys) {
        const key = toInstrumentKey(raw);
        if (!key) continue;
        const pipe = key.indexOf("|");
        if (pipe === -1) { out.set(key, key); continue; }
        const segment = key.slice(0, pipe);   // e.g. "NSE_EQ"
        const suffix  = key.slice(pipe + 1);  // e.g. "RELIANCE" or "INE002A01018"
        if (ISIN_SUFFIX_RE.test(suffix)) {
            // Already ISIN — use as-is
            isinKeys.push(key);
            out.set(key, key);
        } else if (segment === "NSE_EQ" || segment === "BSE_EQ") {
            // Text trading symbol — needs DB resolution
            symbolNameKeys.push({ key, segment, symbol: suffix });
        } else {
            // Index / FO — pass through
            out.set(key, key);
        }
    }

    if (symbolNameKeys.length === 0) return out;

    try {
        const tradingSymbols = symbolNameKeys.map((x) => x.symbol);
        const rows = await db
            .select({
                instrumentToken: instruments.instrumentToken,
                tradingsymbol: instruments.tradingsymbol,
                segment: instruments.segment,
            })
            .from(instruments)
            .where(inArray(instruments.tradingsymbol, tradingSymbols));

        // Build lookup: "NSE_EQ:RELIANCE" → "NSE_EQ|INE002A01018"
        const dbLookup = new Map<string, string>();
        for (const row of rows) {
            const seg = String(row.segment || "").toUpperCase();
            const sym = String(row.tradingsymbol || "").toUpperCase();
            const token = String(row.instrumentToken || "");
            if (seg && sym && token) dbLookup.set(`${seg}:${sym}`, token);
        }

        for (const { key, segment, symbol } of symbolNameKeys) {
            const isinKey = dbLookup.get(`${segment}:${symbol}`);
            out.set(key, isinKey ?? key); // fall back to original if not found
        }
    } catch (err) {
        logger.warn({ err: err }, "Failed to resolve symbol keys to ISINs");
        // Fall back: map each unresolved key to itself
        for (const { key } of symbolNameKeys) if (!out.has(key)) out.set(key, key);
    }

    return out;
}

function toRequestedKeyPayload(
    instrumentKeys: string[],
    lookup: Map<string, { last: number; close: number }>,
    symbolToIsinMap?: Map<string, string>
): UpstoxQuoteMap {
    const out: UpstoxQuoteMap = {};

    for (const rawKey of instrumentKeys) {
        const key = toInstrumentKey(rawKey);
        if (!key) continue;

        const sep = key.includes(":") ? ":" : key.includes("|") ? "|" : "";
        const suffix = sep ? key.split(sep)[1] || "" : key;
        // If symbolToIsinMap provided, get the resolved ISIN key for this requested key
        const isinKey = symbolToIsinMap?.get(key);
        const isinSuffix = isinKey
            ? (isinKey.includes("|") ? isinKey.split("|")[1] : isinKey.split(":")[1] || isinKey)
            : undefined;

        const candidates = [
            key,
            key.replace("|", ":"),
            key.replace(":", "|"),
            suffix ? `suffix:${suffix.toUpperCase()}` : "",
            // ISIN key candidates — crucial for text-symbol equity keys
            isinKey ?? "",
            isinKey ? isinKey.replace("|", ":") : "",
            isinKey ? isinKey.replace(":", "|") : "",
            isinSuffix ? `suffix:${isinSuffix.toUpperCase()}` : "",
        ].filter(Boolean);

        let quote: { last: number; close: number } | undefined;
        for (const candidate of candidates) {
            quote = lookup.get(candidate);
            if (quote) break;
        }

        if (!quote) continue;

        out[key] = {
            last_price: quote.last,
            close_price: quote.close,
        };
    }

    return out;
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            throw new ApiError("Unauthorized", 401, "UNAUTHORIZED");
        }

        const body = await req.json();
        const payload = z.object({
            symbols: z.array(z.string()).max(100).optional(),
            instrumentKeys: z.array(z.string()).max(100).optional()
        }).parse(body);

        const rawKeys = payload.symbols || payload.instrumentKeys || [];
        const requestKeys = sanitizeInstrumentKeys(rawKeys);
        const instrumentKeys = Array.from(
            new Set(
                requestKeys
                    .map((key) => toInstrumentKey(key))
                    .filter((key) => key.length > 0)
            )
        );

        if (requestKeys.length === 0 || instrumentKeys.length === 0) {
            return NextResponse.json(
                { success: false, error: "instrumentKeys array is required" },
                { status: 400 }
            );
        }

        // Resolve text-symbol equity keys (e.g. NSE_EQ|RELIANCE) to ISIN keys (NSE_EQ|INE002A01018).
        // Upstox's market-quote API only accepts ISIN-based keys for equities.
        const symbolToIsinMap = await resolveSymbolKeysToIsins(instrumentKeys);

        // Build the upstream request keys: use the ISIN key where available, else the original.
        // Also apply Upstox mixed-case formatting for indices.
        const upstreamInstrumentKeys = Array.from(
            new Set(
                instrumentKeys
                    .map((key) => {
                        const isinKey = symbolToIsinMap.get(key) ?? key;
                        return toUpstoxRequestInstrumentKey(isinKey);
                    })
                    .filter((key) => key.length > 0)
            )
        );

        const { UpstoxService } = await import("@/services/market/feeds/upstox-feed.service");
        const token = await UpstoxService.getSystemToken();

        if (!token) {
            throw new ApiError("No system token available", 503, "UPSTOX_TOKEN_MISSING");
        }

        const encodedKeys = upstreamInstrumentKeys
            .map((k) => encodeURIComponent(k))
            .join(",");
        const url = `${UPSTOX_API_URL}/market-quote/quotes?instrument_key=${encodedKeys}`;

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
            },
        });

        const rawText = await response.text();
        const upstream = parseJsonSafe(rawText);
        const upstreamStatus = upstream?.status;
        const upstreamData = (upstream?.data || {}) as UpstoxQuoteMap;

        if (response.ok && upstreamStatus !== "error" && Object.keys(upstreamData).length > 0) {
            const lookup = buildQuoteLookup(upstreamData);
            // Also index by the isin keys from symbolToIsinMap so toRequestedKeyPayload can match
            const responsePayload = toRequestedKeyPayload(instrumentKeys, lookup, symbolToIsinMap);
            if (Object.keys(responsePayload).length > 0) {
                return NextResponse.json({
                    success: true,
                    data: responsePayload,
                    count: Object.keys(responsePayload).length,
                    source: "quotes",
                    timestamp: new Date().toISOString(),
                });
            }
        }

        logger.warn(
            {
                status: response.status,
                statusText: response.statusText,
                upstreamStatus,
                upstreamMessage: upstream?.message,
            },
            "Quotes endpoint failed, using LTP fallback"
        );

        const prices = await UpstoxService.getSystemQuotes(upstreamInstrumentKeys);
        const ltpAsQuotes: UpstoxQuoteMap = {};
        for (const [key, price] of Object.entries(prices)) {
            const last = Number(price);
            if (!Number.isFinite(last) || last <= 0) continue;
            ltpAsQuotes[key] = {
                last_price: last,
                close_price: last,
            };
        }

        const ltpLookup = buildQuoteLookup(ltpAsQuotes);
        const fallbackPayload = toRequestedKeyPayload(instrumentKeys, ltpLookup, symbolToIsinMap);

        if (Object.keys(fallbackPayload).length > 0) {
            logger.info({ count: Object.keys(fallbackPayload).length }, "Quotes served from LTP fallback");
            return NextResponse.json({
                success: true,
                data: fallbackPayload,
                count: Object.keys(fallbackPayload).length,
                source: "ltp-fallback",
                timestamp: new Date().toISOString(),
            });
        }

        // Both primary and fallback failed
        const msg =
            (typeof upstream?.message === "string" && upstream.message.trim()) ||
            `${response.status} ${response.statusText}`.trim() ||
            "Failed to fetch quotes";

        throw new ApiError(msg, 502, "UPSTOX_QUOTES_FAILED");
    } catch (err) {
        logger.error({ err: err }, "Quote fetch error");
        if (err instanceof ApiError) {
            return handleError(err);
        }

        return handleError(
            new ApiError(
                normalizeErrorMessage(err),
                502,
                "UPSTOX_QUOTES_INTERNAL"
            )
        );
    }
}

