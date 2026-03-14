/**
 * Utility functions for handling NSE Futures & Options expiry dates.
 * * Assumptions:
 * - expiryDate represents the trading day of expiry.
 * - Calculations are based on the user's local system time (IST typically).
 */
/**
 * Returns true if the expiry date is strictly before today.
 * (i.e., The trading day has completely passed).
 */
export declare function isExpired(expiryDate: Date): boolean;
/**
 * Returns the number of full days remaining until expiry.
 * - Returns 0 if expired or if it is "Today".
 * - Returns positive integer for future dates.
 */
export declare function daysToExpiry(expiryDate: Date): number;
/**
 * Returns true if expiry is Today (0 days) or Tomorrow (1 day).
 * Useful for highlighting urgent positions.
 */
export declare function isNearExpiry(expiryDate: Date): boolean;
/**
 * Returns a human-friendly label for the expiry status.
 * * Output examples:
 * - "Expired"
 * - "Expires Today"
 * - "D-1" (Tomorrow)
 * - "D-5" (5 days left)
 */
export declare function formatExpiryLabel(expiryDate: Date): string;
/**
 * Helper to get a CSS color class based on expiry urgency.
 * (Pure string return, no UI libraries)
 */
export declare function getExpiryColorClass(expiryDate: Date): string;
//# sourceMappingURL=expiry-utils.d.ts.map