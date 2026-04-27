// ⚠️ MOVED: This file has been relocated to domains/platform/lib/auth.ts
// This re-export shim exists so existing importers continue to work during migration.
// TODO Phase 1 cleanup: update all importers to '@/domains/platform/lib/auth' and delete this file.
export {
    handlers,
    auth,
    signIn,
    signOut,
} from '@/domains/platform/lib/auth';
