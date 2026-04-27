import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getRedis } from "@/lib/redis";
import {
  instruments,
  positions,
  watchlistItems,
  watchlists,
} from "@paper-market/core/db";
import {
  getCacheTtlWithJitter,
  ltpKey,
  parseMarketLtpCacheRecord,
  prevCloseKey,
  type MarketLtpCacheRecord,
} from "@/domains/market/lib/market-cache";
import {
  symbolToIndexInstrumentKey,
  toCanonicalSymbol,
  toInstrumentKey,
} from "@paper-market/core";
import { isMarketOpenIST } from "@paper-market/core";

export const dynamic = "force-dynamic";

const INDEX_SYMBOLS = ["NIFTY 50", "NIFTY BANK", "NIFTY FIN SERVICE"] as const;
const ONE_MINUTE_MS = 60_000;
const SNAPSHOT_STATE_KEY = "__pmSnapshotRouteState";
const SNAPSHOT_OPEN_MAX_AGE_MS = 2 * ONE_MINUTE_MS;
const SNAPSHOT_CLOSED_MAX_AGE_MS = 30 * ONE_MINUTE_MS;
const SNAPSHOT_RESPONSE_TTL_MS = 5000;

type SymbolRow = {
  symbol: string | null;
  instrumentKey: string | null;
};

type SnapshotRouteMetrics = {
  singleflightHits: number;
  cacheHits: number;
  cacheMisses: number;
};

type SnapshotRouteState = {
  inflight: Map<string, Promise<MarketLtpCacheRecord[]>>;
  metrics: SnapshotRouteMetrics;
  metricsInterval: ReturnType<typeof setInterval> | null;
  responseCache: Map<string, { expiresAt: number; payload: { symbols: string[]; quotes: ReturnType<typeof toSnapshotQuote>[] } }>;
};

const logSnapshotLatency = (metrics: {
  auth_duration_ms: number;
  redis_read_ms: number;
  broker_fetch_ms: number;
  total_duration_ms: number;
}) => {
  queueMicrotask(() => {
    logger.info(metrics, "Snapshot latency");
  });
};

const pruneSnapshotResponseCache = (state: SnapshotRouteState, now = Date.now()) => {
  if (state.responseCache.size < 200) return;
  for (const [key, entry] of state.responseCache.entries()) {
    if (entry.expiresAt <= now) {
      state.responseCache.delete(key);
    }
  }
};

const getSnapshotRouteState = (): SnapshotRouteState => {
  const scope = globalThis as typeof globalThis & {
    [SNAPSHOT_STATE_KEY]?: SnapshotRouteState;
  };

  if (scope[SNAPSHOT_STATE_KEY]) {
    return scope[SNAPSHOT_STATE_KEY]!;
  }

  const state: SnapshotRouteState = {
    inflight: new Map<string, Promise<MarketLtpCacheRecord[]>>(),
    metrics: {
      singleflightHits: 0,
      cacheHits: 0,
      cacheMisses: 0,
    },
    metricsInterval: null,
    responseCache: new Map(),
  };

  state.metricsInterval = setInterval(() => {
    logger.info(
      {
        snapshot_singleflight_hits: state.metrics.singleflightHits,
        snapshot_cache_hits: state.metrics.cacheHits,
        snapshot_cache_misses: state.metrics.cacheMisses,
        snapshot_inflight_requests: state.inflight.size,
      },
      "Snapshot route metrics"
    );

    state.metrics.singleflightHits = 0;
    state.metrics.cacheHits = 0;
    state.metrics.cacheMisses = 0;
  }, ONE_MINUTE_MS);
  state.metricsInterval.unref?.();

  scope[SNAPSHOT_STATE_KEY] = state;
  return state;
};

const toFinitePositive = (value: unknown): number | null => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
};

const isSnapshotRecordStale = (record: MarketLtpCacheRecord, nowMs: number): boolean => {
  const maxAgeMs = isMarketOpenIST(new Date(nowMs))
    ? SNAPSHOT_OPEN_MAX_AGE_MS
    : SNAPSHOT_CLOSED_MAX_AGE_MS;
  const ageMs = nowMs - Number(record.timestamp || 0);
  return ageMs < 0 || ageMs > maxAgeMs;
};

const resolveInstrumentKey = (value: string): string => {
  const normalized = toInstrumentKey(value);
  if (normalized.includes("|")) return normalized;

  const indexKey = symbolToIndexInstrumentKey(toCanonicalSymbol(value));
  return indexKey ? toInstrumentKey(indexKey) : "";
};

const toUpstoxRequestInstrumentKey = (raw: string): string => {
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
};

const pushSymbolCandidate = (
  keyOrder: string[],
  seen: Set<string>,
  symbolByInstrument: Map<string, string>,
  value: string | null | undefined,
  symbolHint?: string | null
) => {
  const resolved = resolveInstrumentKey(String(value || ""));
  if (!resolved || seen.has(resolved)) return;

  seen.add(resolved);
  keyOrder.push(resolved);

  const hinted = toCanonicalSymbol(String(symbolHint || ""));
  if (hinted) {
    symbolByInstrument.set(resolved, hinted);
  }
};

const toSnapshotQuote = (
  record: MarketLtpCacheRecord,
  symbolByInstrument: Map<string, string>
) => {
  const symbol =
    symbolByInstrument.get(record.instrumentKey) ||
    record.symbol ||
    record.instrumentKey.split("|")[1] ||
    record.instrumentKey;

  return {
    instrumentKey: record.instrumentKey,
    symbol,
    key: record.instrumentKey,
    price: record.price,
    close: record.prevClose,
    changePercent: record.changePct ?? 0,
    timestamp: record.timestamp,
  };
};

const snapshotSingleflightKey = (instrumentKeys: string[]): string => {
  const canonical = Array.from(new Set(instrumentKeys.map((key) => toInstrumentKey(key)).filter(Boolean))).sort();
  const hash = createHash("sha1").update(canonical.join(",")).digest("hex");
  return `snapshot:${hash}`;
};

async function fetchSnapshotMissesSingleflight(
  state: SnapshotRouteState,
  missingInstrumentKeys: string[]
): Promise<MarketLtpCacheRecord[]> {
  const key = snapshotSingleflightKey(missingInstrumentKeys);
  const existing = state.inflight.get(key);
  if (existing) {
    state.metrics.singleflightHits += 1;
    return existing;
  }

  const fetchPromise = (async () => {
    const { UpstoxService } = await import("@/domains/market/server/feeds/upstox-feed.service");
    const upstreamInstrumentKeys = Array.from(
      new Set(missingInstrumentKeys.map((value) => toUpstoxRequestInstrumentKey(value)).filter(Boolean))
    );
    if (upstreamInstrumentKeys.length === 0) return [];

    const detailByKey = await UpstoxService.getSystemQuoteDetails(upstreamInstrumentKeys);
    const now = Date.now();
    const fetchedRecords: MarketLtpCacheRecord[] = [];

    for (const [rawKey, detail] of Object.entries(detailByKey)) {
      const instrumentKey = toInstrumentKey(rawKey);
      if (!instrumentKey) continue;

      const price = toFinitePositive(detail?.lastPrice);
      if (!price) continue;

      const prevClose = toFinitePositive(detail?.closePrice) || price;
      const change = prevClose > 0 ? price - prevClose : 0;
      const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;

      fetchedRecords.push({
        instrumentKey,
        price,
        prevClose,
        change,
        changePct,
        timestamp: now,
      });
    }

    return fetchedRecords;
  })().finally(() => {
    state.inflight.delete(key);
  });

  state.inflight.set(key, fetchPromise);
  return fetchPromise;
}

async function buildInstrumentRequestSet(
  watchlistRows: SymbolRow[],
  positionRows: SymbolRow[]
): Promise<{ requestKeys: string[]; requestedInstruments: string[]; symbolByInstrument: Map<string, string> }> {
  const requestKeys = Array.from(
    new Set([
      ...watchlistRows.map((row) => row.symbol),
      ...watchlistRows.map((row) => row.instrumentKey),
      ...positionRows.map((row) => row.symbol),
      ...positionRows.map((row) => row.instrumentKey),
      ...INDEX_SYMBOLS,
    ].filter(Boolean) as string[])
  );

  const requestedInstruments: string[] = [];
  const seen = new Set<string>();
  const symbolByInstrument = new Map<string, string>();

  for (const row of watchlistRows) {
    pushSymbolCandidate(requestedInstruments, seen, symbolByInstrument, row.instrumentKey, row.symbol);
  }

  for (const row of positionRows) {
    pushSymbolCandidate(requestedInstruments, seen, symbolByInstrument, row.instrumentKey, row.symbol);
  }

  for (const symbol of INDEX_SYMBOLS) {
    const indexInstrumentKey = symbolToIndexInstrumentKey(symbol);
    pushSymbolCandidate(requestedInstruments, seen, symbolByInstrument, indexInstrumentKey, symbol);
  }

  return { requestKeys, requestedInstruments, symbolByInstrument };
}

export async function GET() {
  const totalStart = performance.now();
  let authDurationMs = 0;
  let redisReadMs = 0;
  let brokerFetchMs = 0;

  try {
    const authStart = performance.now();
    const session = await auth();
    authDurationMs = performance.now() - authStart;
    if (!session?.user?.id) {
      logSnapshotLatency({
        auth_duration_ms: Number(authDurationMs.toFixed(2)),
        redis_read_ms: Number(redisReadMs.toFixed(2)),
        broker_fetch_ms: Number(brokerFetchMs.toFixed(2)),
        total_duration_ms: Number((performance.now() - totalStart).toFixed(2)),
      });
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const state = getSnapshotRouteState();
    pruneSnapshotResponseCache(state);
    const cached = state.responseCache.get(session.user.id);
    if (cached && cached.expiresAt > Date.now()) {
      logSnapshotLatency({
        auth_duration_ms: Number(authDurationMs.toFixed(2)),
        redis_read_ms: Number(redisReadMs.toFixed(2)),
        broker_fetch_ms: Number(brokerFetchMs.toFixed(2)),
        total_duration_ms: Number((performance.now() - totalStart).toFixed(2)),
      });
      return NextResponse.json({
        success: true,
        data: cached.payload,
        cached: true,
      });
    }

    const [watchlistRows, positionRows] = await Promise.all([
      db
        .select({
          symbol: instruments.tradingsymbol,
          instrumentKey: instruments.instrumentToken,
        })
        .from(watchlists)
        .innerJoin(watchlistItems, eq(watchlists.id, watchlistItems.watchlistId))
        .innerJoin(instruments, eq(watchlistItems.instrumentToken, instruments.instrumentToken))
        .where(eq(watchlists.userId, session.user.id)),
      db
        .select({
          symbol: instruments.tradingsymbol,
          instrumentKey: positions.instrumentToken,
        })
        .from(positions)
        .leftJoin(instruments, eq(positions.instrumentToken, instruments.instrumentToken))
        .where(eq(positions.userId, session.user.id)),
    ]);

    const { requestKeys, requestedInstruments, symbolByInstrument } =
      await buildInstrumentRequestSet(watchlistRows, positionRows);

    if (requestedInstruments.length === 0) {
      logSnapshotLatency({
        auth_duration_ms: Number(authDurationMs.toFixed(2)),
        redis_read_ms: Number(redisReadMs.toFixed(2)),
        broker_fetch_ms: Number(brokerFetchMs.toFixed(2)),
        total_duration_ms: Number((performance.now() - totalStart).toFixed(2)),
      });
      return NextResponse.json({
        success: true,
        data: {
          symbols: requestKeys,
          quotes: [],
        },
      });
    }

    const quoteByInstrument = new Map<string, MarketLtpCacheRecord>();
    const redis = getRedis();

    if (redis) {
      const redisStart = performance.now();
      try {
        const nowMs = Date.now();
        const cacheValues = await redis.mget(...requestedInstruments.map((key) => ltpKey(key)));
        cacheValues.forEach((value, idx) => {
          const parsed = parseMarketLtpCacheRecord(value);
          if (!parsed) return;
          if (isSnapshotRecordStale(parsed, nowMs)) return;

          if (!parsed.symbol) {
            parsed.symbol = symbolByInstrument.get(parsed.instrumentKey);
          }
          quoteByInstrument.set(requestedInstruments[idx], parsed);
        });
      } catch (err) {
        logger.warn({ err: err }, "Snapshot Redis read failed, falling back to Upstox");
      }
      redisReadMs += performance.now() - redisStart;

      const hitCount = quoteByInstrument.size;
      const missCount = requestedInstruments.length - hitCount;
      if (missCount > 0) {
        logger.debug(
          {
            redis_hits: hitCount,
            redis_misses: missCount,
            missing_keys: requestedInstruments
              .filter((key) => !quoteByInstrument.has(key))
              .slice(0, 10), // cap log size
          },
          "Snapshot Redis cache misses"
        );
      }
    }

    const missingInstrumentKeys = requestedInstruments.filter((key) => !quoteByInstrument.has(key));
    state.metrics.cacheHits += quoteByInstrument.size;
    state.metrics.cacheMisses += missingInstrumentKeys.length;

    if (missingInstrumentKeys.length > 0) {
      const brokerStart = performance.now();
      const fetchedRecords = await fetchSnapshotMissesSingleflight(state, missingInstrumentKeys);
      brokerFetchMs += performance.now() - brokerStart;
      for (const record of fetchedRecords) {
        const hydratedRecord: MarketLtpCacheRecord = {
          ...record,
          symbol: record.symbol || symbolByInstrument.get(record.instrumentKey),
        };
        quoteByInstrument.set(hydratedRecord.instrumentKey, hydratedRecord);
      }

      if (redis && fetchedRecords.length > 0) {
        try {
          const pipeline = redis.pipeline();

          for (const record of fetchedRecords) {
            const payload: MarketLtpCacheRecord = {
              ...record,
              symbol: record.symbol || symbolByInstrument.get(record.instrumentKey),
            };
            const ttlSeconds = getCacheTtlWithJitter();
            pipeline.set(ltpKey(payload.instrumentKey), payload, { ex: ttlSeconds });
            if (payload.prevClose > 0) {
              pipeline.set(prevCloseKey(payload.instrumentKey), payload.prevClose, { ex: ttlSeconds });
            }
          }

          void pipeline.exec().catch((error) => {
            logger.warn({ err: error, count: fetchedRecords.length }, "Snapshot Redis backfill failed");
          });
        } catch (err) {
          logger.warn({ err: err }, "Snapshot Redis pipeline creation failed");
        }
      }
    }

    const quotes = requestedInstruments
      .map((key) => quoteByInstrument.get(key))
      .filter((record): record is MarketLtpCacheRecord => Boolean(record))
      .map((record) => toSnapshotQuote(record, symbolByInstrument));

    logSnapshotLatency({
      auth_duration_ms: Number(authDurationMs.toFixed(2)),
      redis_read_ms: Number(redisReadMs.toFixed(2)),
      broker_fetch_ms: Number(brokerFetchMs.toFixed(2)),
      total_duration_ms: Number((performance.now() - totalStart).toFixed(2)),
    });

    const responsePayload = {
      symbols: requestKeys,
      quotes,
    };
    state.responseCache.set(session.user.id, {
      expiresAt: Date.now() + SNAPSHOT_RESPONSE_TTL_MS,
      payload: responsePayload,
    });

    return NextResponse.json({
      success: true,
      data: responsePayload,
    });
  } catch (err: any) {
    logSnapshotLatency({
      auth_duration_ms: Number(authDurationMs.toFixed(2)),
      redis_read_ms: Number(redisReadMs.toFixed(2)),
      broker_fetch_ms: Number(brokerFetchMs.toFixed(2)),
      total_duration_ms: Number((performance.now() - totalStart).toFixed(2)),
    });
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Failed to load market snapshot",
      },
      { status: 500 }
    );
  }
}


