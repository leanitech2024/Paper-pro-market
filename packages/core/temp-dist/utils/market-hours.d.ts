export declare function getIstDateKey(now?: Date): string;
export declare function isTradingHolidayIST(now?: Date): boolean;
/**
 * Returns true when regular NSE cash market session is open in IST.
 * Window: Mon-Fri, 09:15 to 15:30 (Asia/Kolkata), excluding configured holidays.
 */
export declare function isMarketOpenIST(now?: Date): boolean;
//# sourceMappingURL=market-hours.d.ts.map