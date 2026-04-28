/** Shared currency/number formatting for the web app. */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatCurrency } from "@paper-market/core";

/** Tailwind class merge helper (used throughout components). */
export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}

/**
 * Compact format for large numbers (e.g. 1200000 → ₹12L, 1500 → ₹1.5K).
 * Useful in cards and summary rows where space is tight.
 */
export function formatCurrencyCompact(value: string | number): string {
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "₹0";

    const abs = Math.abs(num);
    const sign = num < 0 ? "-" : "";

    if (abs >= 1_00_00_000) return `${sign}₹${(abs / 1_00_00_000).toFixed(2)}Cr`;
    if (abs >= 1_00_000) return `${sign}₹${(abs / 1_00_000).toFixed(2)}L`;
    if (abs >= 1_000) return `${sign}₹${(abs / 1_000).toFixed(1)}K`;
    return formatCurrency(num);
}
