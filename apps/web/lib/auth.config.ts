// ⚠️ MOVED: This file has been relocated to domains/platform/lib/auth.config.ts
// This re-export shim exists so existing importers continue to work during migration.
// middleware.ts imports authConfig from here — it continues to work unchanged.
// TODO Phase 1 cleanup: update middleware.ts to '@/domains/platform/lib/auth.config' and delete this file.
export { authConfig } from '@/domains/platform/lib/auth.config';
