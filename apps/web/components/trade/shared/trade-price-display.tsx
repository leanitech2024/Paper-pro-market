import { cn } from "@/lib/utils";

export function formatPrice(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '--';
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function TradePriceDisplay({
  symbol,
  currentPrice,
  side,
  change = 0,
  variant = "derivatives"
}: {
  symbol: string;
  currentPrice: number;
  side: "BUY" | "SELL";
  change?: number;
  variant?: "equity" | "derivatives";
}) {
  if (variant === "equity") {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2.5 dark:border-white/[0.08] dark:bg-[#10192b]">
        <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">LTP</p>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100">{formatPrice(currentPrice)}</span>
          <span className={cn("text-xs font-semibold", side === "BUY" ? "text-emerald-400" : "text-rose-400")}>{side}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between mb-4 mt-2">
      <span className="text-sm font-bold text-slate-500 dark:text-slate-400">{symbol}</span>
      <span className={cn("text-lg font-bold font-mono", change >= 0 ? "text-trade-buy" : "text-trade-sell")}>
        ₹{formatPrice(currentPrice)}
      </span>
    </div>
  );
}
