import { db } from "@/lib/db";
import { upstoxTokens, instruments } from "@paper-market/core/db";
import { eq, gt, desc } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { toInstrumentKey, canonicalizeUnderlyingSymbol, toIndexInstrumentSuffix } from "@paper-market/core";
import { ApiError } from "@/lib/errors";
import { cache, CacheKeys } from "@/lib/cache";
import { upstoxRateLimiter } from "@/lib/rate-limit";
import { resolveUpstoxPreviousClose } from "@/domains/market/lib/upstox-quote-normalization";

const UPSTOX_API_URL = "https://api.upstox.com/v2";

export interface UpstoxConfig {
  apiKey: string;
  apiSecret: string;
  redirectUri: string;
}

export interface SystemQuoteDetail {
  lastPrice: number;
  closePrice: number | null;
  volume?: number | null;
  oi?: number | null;
}

export class UpstoxService {
  private static config: UpstoxConfig = {
    apiKey: process.env.UPSTOX_API_KEY || "",
    apiSecret: process.env.UPSTOX_API_SECRET || "",
    redirectUri: process.env.UPSTOX_REDIRECT_URI || "",
  };

  // â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• 
  // ðŸš¨ PHASE 3: Token Cache (Prevent DB hits on reconnect)
  // â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• 
  // WHY: Reconnect path must be memory-only. DB hits = latency spikes.
  // Reconnect storms â†’ DB storms â†’ system latency (cascade failure)
  private static cachedToken: string | null = null;
  private static expiry = 0;
  // ðŸ”¥ CRITICAL: promise lock to prevent stampedes
  private static tokenPromise: Promise<string | null> | null = null;

  static invalidateSystemToken(reason = "unspecified"): void {
    this.cachedToken = null;
    this.expiry = 0;
    this.tokenPromise = null;
    logger.warn({ reason }, "Invalidated cached Upstox system token");
  }

  private static normalizeSymbolKey(value: string): string {
    return value.replace(/\s+/g, "").toUpperCase();
  }

  /**
   * Generate the Authorization URL for user login
   */
  static getAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.config.apiKey,
      redirect_uri: this.config.redirectUri,
      state: state || "random_state_string",
    });

    return `${UPSTOX_API_URL}/login/authorization/dialog?${params.toString()}`;
  }

  /**
   * Exchange Auth Code for Access Token
   */
  static async generateToken(code: string, userId: string): Promise<string> {
    const params = new URLSearchParams({
      code,
      client_id: this.config.apiKey,
      client_secret: this.config.apiSecret,
      redirect_uri: this.config.redirectUri,
      grant_type: "authorization_code",
    });

    try {
      const response = await fetch(`${UPSTOX_API_URL}/login/authorization/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: params,
      });

      const data = await response.json();

      if (!response.ok || data.status === "error") {
        throw new Error(data.message || "Failed to generate token");
      }

      const accessToken = data.access_token;
      
      // Store token in DB
      await this.saveToken(userId, accessToken);

      logger.info({ userId }, "Upstox token generated and saved");
      return accessToken;
    } catch (err: any) {
      logger.error({ err: err, userId }, "Upstox Token Generation Failed");
      throw new ApiError("Failed to authenticate with Upstox", 502, "UPSTOX_AUTH_FAILED");
    }
  }

  /**
   * Save or Update User's Upstox Token
   */
  private static async saveToken(userId: string, accessToken: string) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Valid for typically 1 day

    await db
      .insert(upstoxTokens)
      .values({
        userId,
        accessToken,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: upstoxTokens.userId,
        set: {
            accessToken,
            expiresAt,
            updatedAt: new Date(),
        }
      });
  }

  /**
   * Get Valid Access Token for User
   */
  static async getAccessToken(userId: string): Promise<string | null> {
    const [record] = await db
      .select()
      .from(upstoxTokens)
      .where(eq(upstoxTokens.userId, userId))
      .limit(1);

    if (!record) return null;

    // Check expiry
    const now = new Date();
    if (record.expiresAt < now) {
        logger.warn({ userId }, "Upstox token expired");
        return null;
    }

    return record.accessToken;
  }

  /**
   * Get ANY valid token for system-wide background tasks (Stream)
   * ðŸš¨ PHASE 3: Cached to prevent DB hits on reconnect
   */
  static async getSystemToken(forceRefresh = false): Promise<string | null> {
    const now = Date.now();

    if (forceRefresh) {
      this.cachedToken = null;
      this.expiry = 0;
      this.tokenPromise = null;
    }

    // Return cached token if still valid (with 5min buffer)
    if (!forceRefresh && this.cachedToken && now < this.expiry - 300000) {
      return this.cachedToken;
    }

    // ðŸ”¥ CRITICAL: promise lock
    if (this.tokenPromise) {
        return this.tokenPromise;
    }

    this.tokenPromise = (async () => {
      try {
        // Fetch from DB
        const [record] = await db
          .select()
          .from(upstoxTokens)
          .where(gt(upstoxTokens.expiresAt, new Date())) // Must be valid
          .orderBy(desc(upstoxTokens.updatedAt)) // Get most recently used
          .limit(1);

        if (!record) {
          this.cachedToken = null;
          this.expiry = 0;
          return null;
        }

        // Cache the token
        this.cachedToken = record.accessToken;
        this.expiry = new Date(record.expiresAt).getTime();
        return this.cachedToken;
      } catch (err) {
        logger.error({ err: err }, "Failed to resolve Upstox system token");
        this.cachedToken = null;
        this.expiry = 0;
        return null;
      } finally {
        this.tokenPromise = null; // Always clear lock
      }
    })();

    return this.tokenPromise;
  }

  /**
   * Fetch Market Quotes (LTP)
   */
  static async getMarketQuotes(userId: string, instrumentKeys: string[]): Promise<Record<string, number>> {
      const token = await this.getAccessToken(userId);
      if (!token) {
          throw new ApiError("Upstox token missing or expired", 401, "UPSTOX_TOKEN_MISSING");
      }

      return this.fetchQuotesWithToken(token, instrumentKeys);
  }

  /**
   * Fetch Market Quotes using System Token (for background/SSE use)
   * This seeds the cache with initial prices when WebSocket is delta-only
   */
  static async getSystemQuotes(instrumentKeys: string[]): Promise<Record<string, number>> {
      const token = await this.getSystemToken();
      if (!token) {
          logger.warn("No system token available for snapshot fetch");
          return {};
      }

      return this.fetchQuotesWithToken(token, instrumentKeys);
  }

  /**
   * Fetch full quotes using system token (includes close price when available).
   */
  static async getSystemQuoteDetails(
      instrumentKeys: string[]
  ): Promise<Record<string, SystemQuoteDetail>> {
      const token = await this.getSystemToken();
      if (!token) {
          logger.warn("No system token available for detailed snapshot fetch");
          return {};
      }

      return this.fetchQuoteDetailsWithToken(token, instrumentKeys);
  }

  /**
   * Internal: Fetch quotes with a given token
   */
  private static async fetchQuotesWithToken(token: string, instrumentKeys: string[]): Promise<Record<string, number>> {
      if (instrumentKeys.length === 0) return {};

      const symbolList = instrumentKeys
          .map(k => encodeURIComponent(k))
          .join(",");
      // NOTE: Upstox REST uses 'instrument_key' param with URL encoding
      const url = `${UPSTOX_API_URL}/market-quote/ltp?instrument_key=${symbolList}`;
 
      try {
          const fetchOnce = async (
              currentToken: string
          ): Promise<{ quotes: Record<string, number>; unauthorized: boolean }> => {
              await upstoxRateLimiter.waitForToken("market-quote");
              const response = await fetch(url, {
                  headers: {
                      Authorization: `Bearer ${currentToken}`,
                      Accept: "application/json",
                  },
              });

              const data = await response.json().catch(() => ({}));
              if (response.status === 401) {
                  return { quotes: {}, unauthorized: true };
              }

              if (!response.ok || data?.status === "error") {
                  throw new Error(data?.message || `Upstox LTP failed: ${response.status}`);
              }

              const quotes: Record<string, number> = {};
              if (data?.data) {
                  for (const [key, value] of Object.entries(data.data as Record<string, any>)) {
                      const lastPrice = Number((value as any)?.last_price);
                      if (Number.isFinite(lastPrice)) {
                          quotes[key] = lastPrice;
                      }
                  }
              }

              return { quotes, unauthorized: false };
          };

          const first = await fetchOnce(token);
          if (!first.unauthorized) {
              logger.info({ count: Object.keys(first.quotes).length }, "Fetched snapshot quotes");
              return first.quotes;
          }

          this.invalidateSystemToken("ltp_quote_401");
          const refreshed = await this.getSystemToken(true);
          if (!refreshed) {
              logger.warn("No refreshed system token after LTP quote 401");
              return {};
          }

          const retry = await fetchOnce(refreshed);
          if (retry.unauthorized) {
              this.invalidateSystemToken("ltp_quote_401_retry");
              logger.warn("Unauthorized after LTP quote retry");
              return {};
          }

          logger.info({ count: Object.keys(retry.quotes).length }, "Fetched snapshot quotes (retry)");
          return retry.quotes;
      } catch (err: any) {
          logger.error({ err: err }, "Failed to fetch market quotes");
          return {};
      }
  }

  /**
   * Internal: Fetch full quotes (last + close) with a given token
   */
  private static async fetchQuoteDetailsWithToken(
      token: string,
      instrumentKeys: string[]
  ): Promise<Record<string, SystemQuoteDetail>> {
      if (instrumentKeys.length === 0) return {};

      const symbolList = instrumentKeys.map((k) => encodeURIComponent(k)).join(",");
      const url = `${UPSTOX_API_URL}/market-quote/quotes?instrument_key=${symbolList}`;

      try {
          const fetchOnce = async (
              currentToken: string
          ): Promise<{ quotes: Record<string, SystemQuoteDetail>; unauthorized: boolean }> => {
              await upstoxRateLimiter.waitForToken("market-quote");
              const response = await fetch(url, {
                  headers: {
                      Authorization: `Bearer ${currentToken}`,
                      Accept: "application/json",
                  },
              });

              const payload = await response.json().catch(() => ({}));
              if (response.status === 401) {
                  return { quotes: {}, unauthorized: true };
              }

              if (!response.ok || payload?.status === "error") {
                  throw new Error(payload?.message || `Upstox quotes failed: ${response.status}`);
              }

              const data = payload?.data as Record<string, any> | undefined;
              if (!data || typeof data !== "object") {
                  return { quotes: {}, unauthorized: false };
              }

              const quotes: Record<string, SystemQuoteDetail> = {};
              for (const [key, value] of Object.entries(data)) {
                  const lastPrice = Number((value as any)?.last_price);
                  if (!Number.isFinite(lastPrice) || lastPrice <= 0) continue;

                  const close = resolveUpstoxPreviousClose(value, lastPrice);
                  const closePrice =
                      typeof close === "number" && Number.isFinite(close) && close > 0 ? close : null;
                  const rawVolume = Number(
                      (value as any)?.volume ??
                      (value as any)?.vtt ??
                      (value as any)?.ltq ??
                      (value as any)?.last_trade_quantity ??
                      (value as any)?.market_data?.volume
                  );
                  const rawOi = Number(
                      (value as any)?.oi ??
                      (value as any)?.open_interest ??
                      (value as any)?.market_data?.oi
                  );
                  quotes[key] = {
                      lastPrice,
                      closePrice,
                      volume: Number.isFinite(rawVolume) ? Math.max(0, rawVolume) : null,
                      oi: Number.isFinite(rawOi) ? Math.max(0, rawOi) : null,
                  };
              }

              return { quotes, unauthorized: false };
          };

          const first = await fetchOnce(token);
          if (!first.unauthorized) {
              logger.info({ count: Object.keys(first.quotes).length }, "Fetched detailed snapshot quotes");
              return first.quotes;
          }

          this.invalidateSystemToken("detailed_quote_401");
          const refreshed = await this.getSystemToken(true);
          if (!refreshed) {
              logger.warn("No refreshed system token after detailed quote 401");
              return {};
          }

          const retry = await fetchOnce(refreshed);
          if (retry.unauthorized) {
              this.invalidateSystemToken("detailed_quote_401_retry");
              logger.warn("Unauthorized after detailed quote retry");
              return {};
          }

          logger.info({ count: Object.keys(retry.quotes).length }, "Fetched detailed snapshot quotes (retry)");
          return retry.quotes;
      } catch (err: any) {
          logger.error({ err: err }, "Failed to fetch detailed market quotes");
          // Fallback to LTP-only path so daily update does not fail completely.
          const ltpQuotes = await this.fetchQuotesWithToken(token, instrumentKeys);
          const out: Record<string, SystemQuoteDetail> = {};
          for (const [key, lastPrice] of Object.entries(ltpQuotes)) {
              out[key] = { lastPrice, closePrice: lastPrice };
          }
          return out;
      }
  }

   /**
    * Fetch Historical Candle Data (API V3)
    * @param instrumentKey - NSE_EQ|INE...
    * @param unit - minutes, hours, days, weeks, months
    * @param interval - 1, 3, 5, 30, etc.
    * @param fromDate - YYYY-MM-DD
    * @param toDate - YYYY-MM-DD
    */
    private static requestInflights = new Map<string, Promise<any[]>>();

    /**
     * Get today's date in IST timezone (YYYY-MM-DD format)
     * ðŸ”¥ CRITICAL: Never mix UTC + IST in trading systems
     */
    private static todayIST(): string {
        return new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(new Date());
    }
    
    private static resolveCandleSource(
        interval: string,
        fromDate: string,
        toDate: string
    ): 'intraday' | 'historical' {
        const today = this.todayIST();

        // ðŸŸ¢ ROUTING RULE: If requesting today's data with 1-minute interval -> Use Intraday endpoint
        if (interval === "1" && fromDate === today && toDate === today) {
            return "intraday";
        }

        return "historical";
    }

   static async getHistoricalCandleData(
       instrumentKey: string, 
       unit: string, 
       interval: string, 
       fromDate: string, 
       toDate: string
    ): Promise<any[]> {
        // ðŸŸ¢ ROUTING EXECUTION
        const source = this.resolveCandleSource(interval, fromDate, toDate);
        
        if (source === 'intraday') {
             logger.debug({ instrumentKey }, "ðŸ”€ Routing to Intraday Endpoint (Optimized Path)");
             return this.getIntraDayCandleData(instrumentKey, unit, interval);
        }

        // 1. Generate Cache Key (with unit to prevent collisions)
        const cacheKey = CacheKeys.historicalCandles(instrumentKey, unit, interval, fromDate, toDate);

        if (this.requestInflights.has(cacheKey)) {
            return this.requestInflights.get(cacheKey)!;
        }

        // 2. Check Cache
        const cachedData = cache.get(cacheKey) as any[];
        if (cachedData) {
            return cachedData;
        }

        const fetchPromise = (async () => {
            try {
                const token = await this.getSystemToken();
                if (!token) throw new Error("No token");

                const encodedKey = encodeURIComponent(instrumentKey);
                const urlV3 = `https://api.upstox.com/v3/historical-candle/${encodedKey}/${unit}/${interval}/${toDate}/${fromDate}`;
        
                logger.info({ instrumentKey, interval }, "Fetching History from UPSTOX API");
                
                await upstoxRateLimiter.waitForToken("history");
                const response = await fetch(urlV3, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json"
                    }
                });

                const data = await response.json();
                
                if (!response.ok) {
                    logger.error({ instrumentKey, interval, error: data }, "Upstox API returned error");
                    return [];
                }
                
                if (data.status === "success" && data.data && data.data.candles) {
                    let candles = data.data.candles;
                    
                    const beforeFilterCount = candles.length;
                    candles = candles.filter((c: any) => {
                        if (!c || !Array.isArray(c) || c.length < 6) {
                            return false;
                        }
                        
                        const open = Number(c[1]);
                        const high = Number(c[2]);
                        const low = Number(c[3]);
                        const close = Number(c[4]);
                        const volume = Number(c[5]);
                        
                        return (Number.isFinite(open) && Number.isFinite(high) && 
                            Number.isFinite(low) && Number.isFinite(close) &&
                            Number.isFinite(volume));
                    });
                    
                    const today = this.todayIST();
                    const shouldMergeIntraday = unit === "minutes" && interval === "1" && toDate === today;
                    
                    if (shouldMergeIntraday) {
                        try {
                            const intradayCandles = await this.getIntraDayCandleData(instrumentKey, unit, interval);
                            
                            if (intradayCandles.length > 0) {
                                const historicalTimestamps = new Set(
                                    candles.map((c: any) => new Date(c[0]).getTime())
                                );
                                const newIntradayCandles = intradayCandles.filter(
                                    (c: any) => !historicalTimestamps.has(new Date(c[0]).getTime())
                                );
                                
                                candles = [...candles, ...newIntradayCandles].sort((a, b) => {
                                    const timeA = new Date(a[0]).getTime();
                                    const timeB = new Date(b[0]).getTime();
                                    return timeA - timeB;
                                });
                            }
                        } catch (err) {
                            logger.error({ err }, 'Failed to fetch intraday data');
                        }
                    }
                    
                    let ttl = 1000 * 60 * 5; 
                    if (interval === "day" || interval === "week" || interval === "month") {
                        ttl = 1000 * 60 * 60 * 24; 
                    } else if (parseInt(interval) >= 60) {
                        ttl = 1000 * 60 * 30; 
                    } else if (parseInt(interval) >= 5) {
                        ttl = 1000 * 60 * 15; 
                    }

                    cache.set(cacheKey, candles, { ttl } as any);
                    return candles;
                }
                return [];
            } catch (err) {
                logger.error({ err }, "Historical Data Fetch Failed");
                return [];
            }
        })();

        this.requestInflights.set(cacheKey, fetchPromise);

        try {
            return await fetchPromise;
        } finally {
            this.requestInflights.delete(cacheKey);
        }
   }

  static async searchInstruments(query: string, _segment?: string): Promise<any[]> {
       const token = await this.getSystemToken();
       if (!token) throw new Error("No token");

       const url = `${UPSTOX_API_URL}/market/search/instrument?instrument_name=${encodeURIComponent(query)}`;

       try {
           await upstoxRateLimiter.waitForToken("market-quote");
           const response = await fetch(url, {
               headers: {
                   Authorization: `Bearer ${token}`,
                   Accept: "application/json",
               },
           });

           const data = await response.json();
           if (data.status === "success" && Array.isArray(data.data)) {
               return data.data;
           }
           return [];
       } catch (err) {
           logger.error({ err: err, query }, "Instrument Search Failed");
           return [];
       }
   }

    static async resolveInstrumentKey(symbol: string): Promise<string> {
        const canonicalSymbol = canonicalizeUnderlyingSymbol(symbol);

        const cacheKey = CacheKeys.instrumentKey(canonicalSymbol);
        const cached = cache.get(cacheKey) as string;
        if (cached) {
            return cached;
        }

        try {
            const [instrument] = await db
                .select({ token: instruments.instrumentToken })
                .from(instruments)
                .where(eq(instruments.tradingsymbol, canonicalSymbol))
                .limit(1);
            
            if (instrument) {
                cache.set(cacheKey, instrument.token, { ttl: 86400000 });
                return instrument.token;
            }
        } catch (err) {
            logger.error({ err: err, symbol }, "Instrument DB Lookup Failed");
        }
        
        const isIndex =
          canonicalSymbol.includes("NIFTY") ||
          canonicalSymbol.includes("SENSEX") ||
          canonicalSymbol.includes("BANKEX");

        if (isIndex) {
          return `NSE_INDEX|${toIndexInstrumentSuffix(canonicalSymbol)}`;
        }

        return `NSE_EQ|${canonicalSymbol}`;
    }

    /**
     * Fetch Intraday Candle Data (V3 API) - For current trading day
     * @param instrumentKey - NSE_EQ|INE...
     * @param unit - minutes, hours, days
     * @param interval - 1, 2, 3, ... 300 for minutes; 1-5 for hours; 1 for days
     */
    static async getIntraDayCandleData(
        instrumentKey: string,
        unit: string,
        interval: string
    ): Promise<any[]> {
        const token = await this.getSystemToken();
        if (!token) throw new Error("No token");

        // V3 Intraday endpoint: /v3/historical-candle/intraday/:instrument_key/:unit/:interval
        const encodedKey = encodeURIComponent(instrumentKey);
        const urlV3 = `https://api.upstox.com/v3/historical-candle/intraday/${encodedKey}/${unit}/${interval}`;

        try {
            logger.info({ instrumentKey, unit, interval }, "Fetching Intraday Data from UPSTOX V3 API");
            
            await upstoxRateLimiter.waitForToken("history");
            const response = await fetch(urlV3, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json"
                }
            });

            const data = await response.json();
            if (data.status === "success" && data.data && data.data.candles) {
                return data.data.candles;
            }
            return [];
        } catch (err) {
            logger.error({ err }, "Intraday Data Fetch Failed");
            return [];
        }
    }
}
