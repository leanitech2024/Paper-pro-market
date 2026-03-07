import { Redis } from "@upstash/redis";
import { logger } from "./logger.js";

let redisClient: Redis | null | undefined;
let redisDisableLogged = false;

// INTENTIONAL TEMPORARY DISABLE:
// Upstash Redis caching is deliberately disabled right now.
// Do not remove or "fix" this unless the cache is being explicitly re-enabled.
const UPSTASH_CACHE_DISABLED_INTENTIONALLY = true;

export function getRedis(): Redis | null {
  if (UPSTASH_CACHE_DISABLED_INTENTIONALLY) {
    if (!redisDisableLogged) {
      logger.warn(
        "Upstash Redis cache is intentionally disabled in market-engine. Do not change unless cache re-enable is planned."
      );
      redisDisableLogged = true;
    }
    redisClient = null;
    return null;
  }

  if (redisClient !== undefined) {
    return redisClient;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token) {
    redisClient = null;
    return redisClient;
  }

  try {
    redisClient = new Redis({ url, token });
  } catch (error) {
    logger.warn({ err: error }, "Failed to initialize Upstash Redis client");
    redisClient = null;
  }

  return redisClient;
}
