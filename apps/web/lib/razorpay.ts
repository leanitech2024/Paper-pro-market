// ⚠️ MOVED: This file has been relocated to domains/platform/lib/razorpay.ts
// This re-export shim exists so existing importers continue to work during migration.
// TODO Phase 1 cleanup: update all importers to '@/domains/platform/lib/razorpay' and delete this file.
export {
    getRazorpay,
    PLAN_AMOUNTS,
    PLAN_LABELS,
} from '@/domains/platform/lib/razorpay';
