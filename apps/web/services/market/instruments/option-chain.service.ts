import { marketSimulation } from "@/services/market/feeds/market-simulation.service";
import { OptionChainInput } from "@paper-market/core";
import { UpstoxService } from "@/services/market/feeds/upstox-feed.service";
import { instrumentRepository } from "@/lib/instruments/repository";
import { symbolToIndexInstrumentKey } from "@paper-market/core";

const UNDERLYING_ALIAS: Record<string, string> = {
    NIFTY50: "NIFTY",
    "NIFTY 50": "NIFTY",
    NIFTYBANK: "BANKNIFTY",
    "NIFTY BANK": "BANKNIFTY",
    NIFTYFINSERVICE: "FINNIFTY",
    "NIFTY FIN SERVICE": "FINNIFTY",
    MIDCPNIFTY: "MIDCAP",
    MIDCAP: "MIDCAP",
};

function normalizeUnderlyingSymbol(raw: string): string {
    const value = String(raw || "").trim().toUpperCase();
    if (!value) return "";
    const compact = value.replace(/\s+/g, "");
    return UNDERLYING_ALIAS[value] || UNDERLYING_ALIAS[compact] || value;
}

function toDateKey(raw: Date | string | null | undefined): string {
    if (!raw) return "";
    const value = raw instanceof Date ? raw : new Date(raw);
    if (Number.isNaN(value.getTime())) return "";
    return value.toISOString().slice(0, 10);
}

function toIstDayNumber(date: Date): number {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);
    const year = Number(parts.find((part) => part.type === "year")?.value || 0);
    const month = Number(parts.find((part) => part.type === "month")?.value || 0);
    const day = Number(parts.find((part) => part.type === "day")?.value || 0);
    return Date.UTC(year, month - 1, day);
}

type OptionChainResponse = {
    underlying: string;
    underlyingPrice?: number;
    underlyingChangePercent?: number;
    expiry?: string;
    expiries?: string[];
    strikes: any[];
};

type OptionChainCacheEntry = {
    expiresAt: number;
    payload: OptionChainResponse;
};

type OptionChainState = {
    cache: Map<string, OptionChainCacheEntry>;
    inflight: Map<string, Promise<OptionChainResponse>>;
};

const OPTION_CHAIN_STATE_KEY = "__pmOptionChainServiceState";
const OPTION_CHAIN_TTL_MS = Math.max(1000, Number(process.env.OPTION_CHAIN_CACHE_TTL_MS ?? "5000"));
const OPTION_CHAIN_STRIKE_RANGE = Math.max(4, Number(process.env.OPTION_CHAIN_STRIKE_RANGE ?? "10"));

function getOptionChainState(): OptionChainState {
    const scope = globalThis as typeof globalThis & {
        [OPTION_CHAIN_STATE_KEY]?: OptionChainState;
    };
    if (scope[OPTION_CHAIN_STATE_KEY]) return scope[OPTION_CHAIN_STATE_KEY]!;

    const state: OptionChainState = {
        cache: new Map<string, OptionChainCacheEntry>(),
        inflight: new Map<string, Promise<OptionChainResponse>>(),
    };
    scope[OPTION_CHAIN_STATE_KEY] = state;
    return state;
}

function buildCacheKey(symbol: string, expiryKey: string): string {
    return `${symbol}::${expiryKey || "NEAREST"}::${OPTION_CHAIN_STRIKE_RANGE}`;
}

function pruneCache(state: OptionChainState, now = Date.now()): void {
    if (state.cache.size < 200) return;
    for (const [key, entry] of state.cache.entries()) {
        if (entry.expiresAt <= now) state.cache.delete(key);
    }
}

function roundToTwo(value: number): number {
    return Math.round(value * 100) / 100;
}

function computeSyntheticOptionLtp(
    optionType: "CE" | "PE",
    underlyingPrice: number,
    strike: number
): number {
    if (!Number.isFinite(underlyingPrice) || underlyingPrice <= 0) return 0;

    const intrinsic =
        optionType === "CE"
            ? Math.max(0, underlyingPrice - strike)
            : Math.max(0, strike - underlyingPrice);

    const timeValue = Math.max(10, underlyingPrice * 0.002);
    return roundToTwo(intrinsic + timeValue);
}

function computeSyntheticOptionStats(
    underlyingPrice: number,
    strike: number,
    lotSize: number,
    daysToExpiry: number
): { oi: number; volume: number; iv: number } {
    if (!Number.isFinite(underlyingPrice) || underlyingPrice <= 0) {
        return { oi: 0, volume: 0, iv: 0 };
    }

    const safeLot = Number.isFinite(lotSize) && lotSize > 0 ? Math.max(1, Math.round(lotSize)) : 1;
    const distanceRatio = Math.abs(strike - underlyingPrice) / underlyingPrice;
    const proximity = Math.max(0, 1 - distanceRatio * 8);

    // Paper-mode deterministic liquidity profile: highest near ATM.
    const oiLots = Math.round(100 + proximity * 900);
    const volumeLots = Math.round(10 + proximity * 120);
    const oi = Math.max(safeLot, oiLots * safeLot);
    const volume = Math.max(1, volumeLots * safeLot);

    // Deterministic IV profile (not broker-accurate, but stable for simulation UX).
    const expiryBoost = daysToExpiry > 0 ? Math.min(15, 45 / daysToExpiry) : 15;
    const iv = roundToTwo(Math.max(8, Math.min(120, 18 + distanceRatio * 120 + expiryBoost)));

    return { oi, volume, iv };
}

function pickAtmStrike(strikes: number[], spotPrice: number): number {
    if (strikes.length === 0) return 0;
    if (!Number.isFinite(spotPrice) || spotPrice <= 0) {
        return strikes[Math.floor(strikes.length / 2)];
    }
    let best = strikes[0];
    let min = Math.abs(best - spotPrice);
    for (const strike of strikes) {
        const diff = Math.abs(strike - spotPrice);
        if (diff < min) {
            min = diff;
            best = strike;
        }
    }
    return best;
}

function selectNearbyStrikes(strikes: number[], atmStrike: number, range: number): number[] {
    if (strikes.length === 0) return [];
    const sorted = [...strikes].sort((a, b) => a - b);
    let closestIndex = 0;
    let min = Math.abs(sorted[0] - atmStrike);
    for (let i = 1; i < sorted.length; i += 1) {
        const diff = Math.abs(sorted[i] - atmStrike);
        if (diff < min) {
            min = diff;
            closestIndex = i;
        }
    }
    const start = Math.max(0, closestIndex - range);
    const end = Math.min(sorted.length - 1, closestIndex + range);
    return sorted.slice(start, end + 1);
}

async function resolveUnderlyingQuote(underlying: string) {
    let price = Number(marketSimulation.getQuote(underlying)?.price || 0);
    let changePercent = 0;

    if (Number.isFinite(price) && price > 0) {
        return { price, changePercent };
    }

    try {
        const indexKey = symbolToIndexInstrumentKey(underlying);
        const underlyingToken = indexKey || (await UpstoxService.resolveInstrumentKey(underlying));
        if (!underlyingToken) return { price, changePercent };

        const detailMap = await UpstoxService.getSystemQuoteDetails([underlyingToken]);
        const detail =
            detailMap[underlyingToken] ||
            detailMap[underlyingToken.replace("|", ":")];

        const ltp = Number(detail?.lastPrice || 0);
        const close = Number(detail?.closePrice || 0);

        if (Number.isFinite(ltp) && ltp > 0) {
            price = ltp;
        }
        if (Number.isFinite(ltp) && ltp > 0 && Number.isFinite(close) && close > 0) {
            changePercent = ((ltp - close) / close) * 100;
        }
    } catch {
        // ignore, use fallback
    }

    return { price, changePercent };
}

export class OptionChainService {
    static async getOptionChain(input: OptionChainInput) {
        const normalizedUnderlying = normalizeUnderlyingSymbol(input.symbol);
        if (!normalizedUnderlying) {
            return { underlying: normalizedUnderlying, strikes: [], expiries: [] };
        }
        const expiryKey = toDateKey(input.expiry) || "NEAREST";
        const cacheKey = buildCacheKey(normalizedUnderlying, expiryKey);
        const now = Date.now();
        const state = getOptionChainState();

        const cached = state.cache.get(cacheKey);
        if (cached && cached.expiresAt > now) {
            return cached.payload;
        }

        const inflight = state.inflight.get(cacheKey);
        if (inflight) {
            return inflight;
        }

        const requestPromise = (async (): Promise<OptionChainResponse> => {
            await instrumentRepository.ensureInitialized();

            const todayIst = toIstDayNumber(new Date());
            const options = instrumentRepository.getOptionsByUnderlying(normalizedUnderlying);

            const expiries: string[] = [];
            const seenExpiries = new Set<string>();
            for (const opt of options) {
                if (!opt.expiry) continue;
                if (toIstDayNumber(opt.expiry) < todayIst) continue;
                const key = toDateKey(opt.expiry);
                if (!key || seenExpiries.has(key)) continue;
                seenExpiries.add(key);
                expiries.push(key);
            }
            expiries.sort();

            if (expiries.length === 0) {
                return { underlying: normalizedUnderlying, strikes: [], expiries };
            }

            let targetExpiry = expiryKey;
            if (!targetExpiry || targetExpiry === "NEAREST") {
                targetExpiry = expiries[0];
            } else if (!expiries.includes(targetExpiry)) {
                targetExpiry = expiries[0];
            }

            const chainOptions = options.filter((opt) => {
                if (!opt.expiry) return false;
                if (toIstDayNumber(opt.expiry) < todayIst) return false;
                return toDateKey(opt.expiry) === targetExpiry;
            });

            if (chainOptions.length === 0) {
                return { underlying: normalizedUnderlying, expiry: targetExpiry, expiries, strikes: [] };
            }

            const { price: underlyingPrice, changePercent: underlyingChangePercent } =
                await resolveUnderlyingQuote(normalizedUnderlying);

            const strikeValues = Array.from(
                new Set(
                    chainOptions
                        .map((opt) => Number(opt.strike || 0))
                        .filter((value) => Number.isFinite(value) && value > 0)
                )
            );

            const atmStrike = pickAtmStrike(strikeValues, underlyingPrice);
            const selectedStrikes = selectNearbyStrikes(strikeValues, atmStrike, OPTION_CHAIN_STRIKE_RANGE);
            const strikeSet = new Set(selectedStrikes);

            const selectedOptions = chainOptions.filter((opt) => {
                const strike = Number(opt.strike || 0);
                return Number.isFinite(strike) && strikeSet.has(strike);
            });

            const optionTokens = selectedOptions.map((opt) => opt.instrumentToken).filter(Boolean);
            const optionQuoteDetails = optionTokens.length > 0
                ? await UpstoxService.getSystemQuoteDetails(optionTokens)
                : {};

            const expiryDate = new Date(`${targetExpiry}T15:30:00+05:30`);
            const daysToExpiry = Number.isNaN(expiryDate.getTime())
                ? 0
                : Math.max(0, Math.ceil((expiryDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));

            const strikeMap = new Map<number, { strike: number; ce?: any; pe?: any }>();
            for (const strike of selectedStrikes) {
                strikeMap.set(strike, { strike });
            }

            for (const opt of selectedOptions) {
                const strike = Number(opt.strike || 0);
                if (!Number.isFinite(strike) || strike <= 0) continue;

                const entry = strikeMap.get(strike);
                if (!entry) continue;

                const optionType = String(opt.optionType || "").toUpperCase();
                const isCE = optionType === "CE";
                const isPE = optionType === "PE";

                const quote = marketSimulation.getQuote(opt.tradingsymbol);
                const quotePrice = Number(quote?.price || 0);
                const detail =
                    optionQuoteDetails[opt.instrumentToken] ||
                    optionQuoteDetails[opt.instrumentToken.replace("|", ":")];
                const ltpFromDetails = Number(detail?.lastPrice || 0);

                const realLtp =
                    Number.isFinite(ltpFromDetails) && ltpFromDetails > 0
                        ? ltpFromDetails
                        : Number.isFinite(quotePrice) && quotePrice > 0
                            ? quotePrice
                            : 0;

                let ltp = roundToTwo(realLtp);
                if (!(Number.isFinite(ltp) && ltp > 0)) {
                    if (isCE || isPE) {
                        ltp = computeSyntheticOptionLtp(
                            isCE ? "CE" : "PE",
                            underlyingPrice,
                            strike
                        );
                    } else if (Number.isFinite(underlyingPrice) && underlyingPrice > 0) {
                        ltp = roundToTwo(Math.max(10, underlyingPrice * 0.002));
                    } else {
                        ltp = 0;
                    }
                }

                const rawOi = Number(detail?.oi ?? 0);
                const rawVolume = Number(detail?.volume ?? 0);
                const syntheticStats = computeSyntheticOptionStats(
                    underlyingPrice,
                    strike,
                    Number(opt.lotSize || 1),
                    daysToExpiry
                );
                const oi =
                    Number.isFinite(rawOi) && rawOi > 0
                        ? Math.max(0, Math.round(rawOi))
                        : syntheticStats.oi;
                const volume =
                    Number.isFinite(rawVolume) && rawVolume > 0
                        ? Math.max(0, Math.round(rawVolume))
                        : syntheticStats.volume;
                const iv = syntheticStats.iv;

                const data = {
                    symbol: opt.tradingsymbol,
                    instrumentToken: opt.instrumentToken,
                    ltp,
                    oi,
                    volume,
                    iv,
                    lotSize: opt.lotSize
                };

                if (isCE) entry.ce = data;
                if (isPE) entry.pe = data;
            }

            const strikes = Array.from(strikeMap.values()).sort((a, b) => a.strike - b.strike);

            return {
                underlying: normalizedUnderlying,
                underlyingPrice,
                underlyingChangePercent,
                expiry: targetExpiry,
                expiries,
                strikes
            };
        })();

        state.inflight.set(cacheKey, requestPromise);

        try {
            const payload = await requestPromise;
            pruneCache(state, now);
            state.cache.set(cacheKey, { expiresAt: now + OPTION_CHAIN_TTL_MS, payload });
            return payload;
        } finally {
            state.inflight.delete(cacheKey);
        }
    }
}


