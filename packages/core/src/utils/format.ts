export function formatCurrency(value: string | number | null | undefined, options?: { showSign?: boolean; maximumFractionDigits?: number }): string {
    if (value === null || value === undefined) return "₹0.00";
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (Number.isNaN(num)) return "₹0.00";

    const formatted = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: options?.maximumFractionDigits ?? 2,
    }).format(Math.abs(num));

    const sign = num < 0 ? "-" : (options?.showSign && num > 0 ? "+" : "");
    return `${sign}${formatted}`;
}

export function formatCurrencyCompact(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return "₹0";
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (Number.isNaN(num)) return "₹0";

    const abs = Math.abs(num);
    const sign = num < 0 ? "-" : "";

    if (abs >= 1_00_00_000) return `${sign}₹${(abs / 1_00_00_000).toFixed(2)}Cr`;
    if (abs >= 1_00_000) return `${sign}₹${(abs / 1_00_000).toFixed(2)}L`;
    if (abs >= 1_000) return `${sign}₹${(abs / 1_000).toFixed(1)}K`;
    return formatCurrency(num);
}

export function formatPct(value: string | number | null | undefined, options?: { showSign?: boolean; maximumFractionDigits?: number }): string {
    if (value === null || value === undefined) return "--";
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (Number.isNaN(num) || !Number.isFinite(num)) return "--";
    
    const formatted = Math.abs(num).toFixed(options?.maximumFractionDigits ?? 2) + "%";
    const sign = num < 0 ? "-" : (num > 0 || options?.showSign ? "+" : "");
    return `${sign}${formatted}`;
}
