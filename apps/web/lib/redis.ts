// ⚠️ MOVED: This file has been relocated to domains/platform/lib/redis.ts
// This re-export shim exists so existing importers continue to work during migration.
// TODO Phase 1 cleanup: update all importers to '@/domains/platform/lib/redis' and delete this file.
export {
    getRedis,
    waitForRedis,
} from '@/domains/platform/lib/redis';
export type { RedisClient, RedisPipeline } from '@/domains/platform/lib/redis';
