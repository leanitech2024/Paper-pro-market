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
type QuotesCacheEntry = { expiresAt: number; payload: UpstoxQuoteMap; source: string };

const QUOTES_CACHE_TTL_MS = 5000;
const quotesCache = new Map<string, QuotesCacheEntry>();

function buildQuotesCacheKey(keys: string[]): string {
    return keys.slice().sort().join(",");
}

function pruneQuotesCache(now = Date.now()): void {
    if (quotesCache.size < 200) return;
    for (const [key, entry] of quotesCache.entries()) {
        if (entry.expiresAt <= now) {
            quotesCache.delete(key);
        }
    }
}

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

function parseJsonSafe(text: string): unknown {
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

/**
 * After buildQuoteLookup() produces an ISIN-keyed map, re-key every entry that
 * has a corresponding requested trading-symbol variant so that toRequestedKeyPayload
 * can resolve it by the original key (e.g. NSE_EQ|RELIANCE → NSE_EQ|INE002A01018).
 */
function applySymbolKeyRemapping(
    lookup: Map<string, { last: number; close: number }>,
    symbolToIsinMap: Map<string, string>,
    symbolToIsinFromDB: Map<string, string>
): void {
    // 1. Upstox sometimes responds with text symbols instead of ISINs for equities.
    // If the lookup contains a quote under a text symbol, mirror it to its ISIN.
    for (const [symbolKey, isinKey] of symbolToIsinFromDB.entries()) {
        const hit = lookup.get(symbolKey) ?? lookup.get(symbolKey.replace("|", ":"));
        if (hit) {
            lookup.set(isinKey, hit);
            lookup.set(isinKey.replace("|", ":"), hit);
        }
    }

    // 2. Map whatever is in the lookup back to the requested instrument keys
    for (const [requestedKey, isinKey] of symbolToIsinMap.entries()) {
        const isinNorm = toInstrumentKey(isinKey);
        const hit =
            lookup.get(isinNorm) ??
            lookup.get(isinNorm.replace("|", ":")) ??
            lookup.get(isinNorm.replace(":", "|"));
        if (hit) {
            lookup.set(requestedKey, hit);
            lookup.set(requestedKey.replace("|", ":"), hit);
            lookup.set(requestedKey.replace(":", "|"), hit);
        }
    }
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

function extractSegmentFromInstrumentKey(value: string): string {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const sep = raw.includes("|") ? "|" : raw.includes(":") ? ":" : "";
    if (!sep) return "";
    return raw.split(sep)[0]?.toUpperCase() ?? "";
}

function normalizeInstrumentToken(rawToken: string, fallbackSegment?: string): string {
    const token = String(rawToken || "").trim();
    if (!token) return "";
    if (token.includes("|") || token.includes(":")) {
        return toInstrumentKey(token);
    }
    if (fallbackSegment) {
        return `${fallbackSegment}|${token}`;
    }
    return token;
}

/**
 * For equity keys, resolve the relation between trading symbols and ISINs.
 * Returns:
 *  - symbolToIsinMap: requestedKey -> isinKey (for sending to Upstox API)
 *  - symbolToIsinFromDB: textSymbolKey -> isinKey (for reverse mapping Upstox responses to ISINs)
 */
async function resolveSymbolKeysToIsins(
    instrumentKeys: string[]
): Promise<{ symbolToIsinMap: Map<string, string>; symbolToIsinFromDB: Map<string, string> }> {
    const symbolToIsinMap = new Map<string, string>();
    const symbolToIsinFromDB = new Map<string, string>();

    const textSymbols: string[] = [];
    const isinTokens: string[] = [];
    const isinSuffixes: string[] = [];
    const pendingRequests = new Set<string>();

    for (const raw of instrumentKeys) {
        const key = toInstrumentKey(raw);
        if (!key) continue;
        const pipe = key.indexOf("|");
        if (pipe === -1) { symbolToIsinMap.set(key, key); continue; }

        const segment = key.slice(0, pipe);
        const suffix = key.slice(pipe + 1);

        if (segment === "NSE_EQ" || segment === "BSE_EQ") {
            pendingRequests.add(key);
            if (ISIN_SUFFIX_RE.test(suffix)) {
                isinTokens.push(key);
                isinSuffixes.push(suffix);
            } else {
                textSymbols.push(suffix);
            }
        } else {
            symbolToIsinMap.set(key, key);
        }
    }

    if (textSymbols.length > 0 || isinTokens.length > 0) {
        try {
            const rows: Array<{
                instrumentToken: string | null;
                tradingsymbol: string | null;
                segment: string | null;
            }> = [];

            if (textSymbols.length > 0) {
                const symbolRows = await db
                    .select({
                        instrumentToken: instruments.instrumentToken,
                        tradingsymbol: instruments.tradingsymbol,
                        segment: instruments.segment,
                    })
                    .from(instruments)
                    .where(inArray(instruments.tradingsymbol, textSymbols));
                rows.push(...symbolRows);
            }

            const tokenCandidates = Array.from(new Set([...isinTokens, ...isinSuffixes]));
            if (tokenCandidates.length > 0) {
                const tokenRows = await db
                    .select({
                        instrumentToken: instruments.instrumentToken,
                        tradingsymbol: instruments.tradingsymbol,
                        segment: instruments.segment,
                    })
                    .from(instruments)
                    .where(inArray(instruments.instrumentToken, tokenCandidates));
                rows.push(...tokenRows);
            }

            for (const row of rows) {
                const segFromRow = String(row.segment || "").toUpperCase().trim();
                const sym = String(row.tradingsymbol || "").toUpperCase().trim();
                const rawToken = String(row.instrumentToken || "").trim();
                const segFromToken = extractSegmentFromInstrumentKey(rawToken);
                const token = normalizeInstrumentToken(rawToken, segFromRow || segFromToken);

                if (!sym || !token) continue;

                const segmentCandidates = new Set<string>(
                    [segFromRow, segFromToken].filter(Boolean)
                );

                for (const seg of segmentCandidates) {
                    const symbolKey = `${seg}|${sym}`;
                    symbolToIsinFromDB.set(symbolKey, token);
                    symbolToIsinFromDB.set(`${seg}:${sym}`, token);
                }
            }
        } catch (err) {
            logger.warn({ err: err }, "Failed to resolve equity mappings from DB");
        }
    }

    for (const reqKey of pendingRequests) {
        const pipe = reqKey.indexOf("|");
        const segment = reqKey.slice(0, pipe);
        const suffix = reqKey.slice(pipe + 1);

        if (ISIN_SUFFIX_RE.test(suffix)) {
            // Already standard ISIN
            symbolToIsinMap.set(reqKey, reqKey);
        } else {
            // Needs translation to send to upstream
            let resolvedIsin = symbolToIsinFromDB.get(reqKey);
            if (!resolvedIsin) resolvedIsin = symbolToIsinFromDB.get(`${segment}:${suffix}`);
            symbolToIsinMap.set(reqKey, resolvedIsin ?? reqKey);
        }
    }

    return { symbolToIsinMap, symbolToIsinFromDB };
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

        let body: unknown = {};
        try {
            const rawText = await req.text();
            if (rawText && rawText.trim().length > 0) {
                body = JSON.parse(rawText);
            }
        } catch {
            return NextResponse.json(
                { success: false, error: "Invalid JSON body" },
                { status: 400 }
            );
        }

    const payload = z.object({
        symbols: z.array(z.string()).max(100).optional(),
        instrumentKeys: z.array(z.string()).max(100).optional(),
        source: z.string().optional(),
        traceId: z.string().optional(),
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

        const requestSource = payload.source || "unknown";
        const traceId = payload.traceId || "";
        pruneQuotesCache();
        const cacheKey = buildQuotesCacheKey(instrumentKeys);
        const cached = quotesCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            return NextResponse.json({
                success: true,
                data: cached.payload,
                count: Object.keys(cached.payload).length,
                source: cached.source,
                cached: true,
                timestamp: new Date().toISOString(),
            });
        }

        // Resolve mappings so we can send ISINs to Upstox and reverse-map its text symbol responses back to ISINs.
        const { symbolToIsinMap, symbolToIsinFromDB } = await resolveSymbolKeysToIsins(instrumentKeys);

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
        const upstream = parseJsonSafe(rawText) as { status?: string; data?: UpstoxQuoteMap; message?: string } | null;
        const upstreamStatus = upstream?.status;
        const upstreamData = (upstream?.data || {}) as UpstoxQuoteMap;

        if (response.ok && upstreamStatus !== "error" && Object.keys(upstreamData).length > 0) {
            const lookup = buildQuoteLookup(upstreamData);
            // Re-key ISIN entries back to requested symbol keys (primary path)
            applySymbolKeyRemapping(lookup, symbolToIsinMap, symbolToIsinFromDB);

            // TEMP DEBUG — remove after fix confirmed
            logger.info({
              requestSource,
              traceId,
              upstreamKeys: Object.keys(upstreamData).slice(0, 3),
              lookupSize: lookup.size,
              symbolToIsinEntries: Array.from(symbolToIsinMap.entries()).slice(0, 3),
              instrumentKeys: instrumentKeys.slice(0, 3),
            }, "DEBUG quotes lookup");

            const responsePayload = toRequestedKeyPayload(instrumentKeys, lookup, symbolToIsinMap);
            if (Object.keys(responsePayload).length > 0) {
                quotesCache.set(cacheKey, {
                    expiresAt: Date.now() + QUOTES_CACHE_TTL_MS,
                    payload: responsePayload,
                    source: "quotes",
                });
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
        // Re-key ISIN entries back to requested symbol keys (LTP fallback path)
        applySymbolKeyRemapping(ltpLookup, symbolToIsinMap, symbolToIsinFromDB);
        const fallbackPayload = toRequestedKeyPayload(instrumentKeys, ltpLookup, symbolToIsinMap);

        if (Object.keys(fallbackPayload).length > 0) {
            logger.info({ count: Object.keys(fallbackPayload).length }, "Quotes served from LTP fallback");
            quotesCache.set(cacheKey, {
                expiresAt: Date.now() + QUOTES_CACHE_TTL_MS,
                payload: fallbackPayload,
                source: "ltp-fallback",
            });
            return NextResponse.json({
                success: true,
                data: fallbackPayload,
                count: Object.keys(fallbackPayload).length,
                source: "ltp-fallback",
                timestamp: new Date().toISOString(),
            });
        }

        // If the request was technically successful but we got no usable data,
        // return an empty response instead of failing to prevent constant 502s.
        if (response.ok || response.status === 404 || response.status === 204) {
            return NextResponse.json({
                success: true,
                data: {},
                count: 0,
                source: "empty",
                timestamp: new Date().toISOString(),
            });
        }

        // Both primary and fallback failed, and response was not OK
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
