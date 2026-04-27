import { NextRequest, NextResponse } from "next/server";
import { instrumentRepository } from "@/domains/market/server/instruments/repository";
import { handleError } from "@/lib/errors";
import { InstrumentSearchSchema } from "@paper-market/core";

// Force dynamic since we access query params (though Next.js handles this)
export const dynamic = 'force-dynamic';

function normalizeUnderlying(input: string): string {
    const raw = String(input || "").trim().toUpperCase();
    if (!raw) return "";

    const alias: Record<string, string> = {
        NIFTY50: "NIFTY",
        "NIFTY 50": "NIFTY",
        NIFTYBANK: "BANKNIFTY",
        "NIFTY BANK": "BANKNIFTY",
        NIFTYFINSERVICE: "FINNIFTY",
        "NIFTY FIN SERVICE": "FINNIFTY",
        MIDCAP: "MIDCPNIFTY",
        MIDCPNIFTY: "MIDCPNIFTY",
    };

    const compact = raw.replace(/\s+/g, "");
    return alias[raw] || alias[compact] || raw;
}

function toMode(raw: string | null): "ALL" | "EQUITY" | "FUTURE" | "OPTION" {
    const mode = String(raw || "").trim().toUpperCase();
    if (mode === "FUTURES" || mode === "FUTURE") return "FUTURE";
    if (mode === "OPTIONS" || mode === "OPTION") return "OPTION";
    if (mode === "EQUITY" || mode === "CASH") return "EQUITY";
    return "ALL";
}

function isModeMatch(instrument: any, mode: "ALL" | "EQUITY" | "FUTURE" | "OPTION"): boolean {
    if (mode === "ALL") return true;
    if (mode === "EQUITY") {
        return instrument.instrumentType === "EQUITY" && instrument.segment === "NSE_EQ";
    }
    if (mode === "FUTURE") {
        const type = String(instrument.instrumentType || "").toUpperCase();
        return instrument.segment === "NSE_FO" && type === "FUTURE";
    }
    const type = String(instrument.instrumentType || "").toUpperCase();
    return instrument.segment === "NSE_FO" && type === "OPTION";
}

// Simple time-bounded cache: key -> { results, expiresAt }
const searchCache = new Map<string, { data: unknown[]; expiresAt: number }>();
const CACHE_TTL_MS = 30_000; // 30 seconds - instruments don't change that fast

export async function GET(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const query = searchParams.get("q") || "";
        const mode = toMode(searchParams.get("mode"));
        const underlying = normalizeUnderlying(searchParams.get("underlying") || "");

        // Validate input
        const validated = InstrumentSearchSchema.parse({ q: query });
        const qUpper = validated.q.toUpperCase();

        // Cache key includes all search dimensions
        const cacheKey = `${qUpper}|${mode}|${underlying}`;
        const cached = searchCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            return NextResponse.json({
                success: true,
                data: cached.data,
                meta: { count: cached.data.length, source: 'cache' },
            });
        }

        // Derivatives need a wider candidate pool because option chains can flood
        // prefix matches and hide futures contracts (e.g., RELIANCE).
        // ALL mode also needs a larger pool so name-matched instruments are included.
        const candidateLimit = mode === "FUTURE" || mode === "OPTION" ? 800 : 400;

        // Call In-Memory Repository (Fast lookup)
        const rawResults = await instrumentRepository.search(validated.q, candidateLimit);
        const filtered = rawResults.filter((inst) => {
            if (!isModeMatch(inst, mode)) return false;
            if (!underlying) return true;
            return normalizeUnderlying(inst.name) === underlying;
        });

        // Score each result so the most relevant rises to the top.
        // Tiers: exact symbol (100) > symbol prefix (80) > name prefix (60) > name substring (40)
        // +5 equity bonus so equity beats a derivative with the same tier.
        // Tie-break: shorter symbol first (ITC before ITCHOTELS).

        const score = (sym: string, name: string, type: string): number => {
            let s = 0;
            if (sym === qUpper)              s = 100;
            else if (sym.startsWith(qUpper)) s = 80;
            else if (name.startsWith(qUpper)) s = 60;
            else if (name.includes(qUpper))   s = 40;
            if (type === 'EQUITY') s += 5;
            return s;
        };

        const scored = filtered
            .map((inst) => ({
                inst,
                score: score(
                    inst.tradingsymbol.toUpperCase(),
                    (inst.name || '').toUpperCase(),
                    inst.instrumentType ?? ''
                ),
            }))
            .sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                // Tie-break: shorter symbol first (ITC before ITCHOTELS)
                return a.inst.tradingsymbol.length - b.inst.tradingsymbol.length;
            });

        const results = scored.slice(0, 50).map((s) => s.inst);

        // Evict expired entries if cache grows large
        if (searchCache.size > 500) {
            const now = Date.now();
            for (const [k, v] of searchCache.entries()) {
                if (v.expiresAt < now) searchCache.delete(k);
            }
        }

        searchCache.set(cacheKey, {
            data: results,
            expiresAt: Date.now() + CACHE_TTL_MS,
        });

        return NextResponse.json({
            success: true,
            data: results,
            meta: {
                count: results.length,
                source: 'memory'
            }
        });
    } catch (err) {
        return handleError(err);
    }
}
