// ⚠️ MOVED: This file has been relocated to domains/platform/lib/rate-limit.ts
// This re-export shim exists so existing importers continue to work during migration.
// TODO Phase 1 cleanup: update all importers to '@/domains/platform/lib/rate-limit' and delete this file.
export {
    RateLimiter,
    upstoxRateLimiter,
    rateLimit,
} from '@/domains/platform/lib/rate-limit';
