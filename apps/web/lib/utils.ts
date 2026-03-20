/**
 * lib/utils.ts — re-export barrel
 * All formatting and class utilities live in lib/utils/format.ts.
 * Import from "@/lib/utils" as before — no import sites need to change.
 */
export { cn, formatCurrency, formatCurrencyCompact } from "./utils/format";
export { debounce } from "./utils/debounce";
