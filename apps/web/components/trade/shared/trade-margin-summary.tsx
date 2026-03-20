import { cn } from "@/lib/utils";

export function formatMoney(value: number): string {
  if (!Number.isFinite(value)) return '--';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function TradeMarginSummary({
  requiredMargin,
  balance,
  blockedBalance,
  walletEquity,
  appearance = "default",
}: {
  requiredMargin: number;
  balance: number;
  blockedBalance: number;
  walletEquity: number;
  appearance?: "default" | "minimal";
}) {
  const isMinimal = appearance === "minimal";
  return (
    <>
      <div
        className={cn(
          "grid grid-cols-3 divide-x overflow-hidden rounded-lg",
          isMinimal
            ? "divide-white/[0.06] bg-white/[0.02] dark:bg-white/[0.03]"
            : "divide-slate-200/80 border border-slate-200/80 bg-slate-50/70 dark:divide-white/[0.08] dark:border-white/[0.08] dark:bg-[#10192b]"
        )}
      >
        <div className="px-3 py-2">
          <p className="text-[10px] text-slate-500 dark:text-slate-400">Required</p>
          <p className="mt-0.5 text-xs font-semibold tabular-nums text-slate-900 dark:text-slate-100">{formatMoney(requiredMargin)}</p>
        </div>
        <div className="px-3 py-2">
          <p className="text-[10px] text-slate-500 dark:text-slate-400">Available</p>
          <p className="mt-0.5 text-xs font-semibold tabular-nums text-slate-900 dark:text-slate-100">{formatMoney(balance)}</p>
        </div>
        <div className="px-3 py-2">
          <p className="text-[10px] text-slate-500 dark:text-slate-400">Blocked</p>
          <p className="mt-0.5 text-xs font-semibold tabular-nums text-slate-900 dark:text-slate-100">{formatMoney(blockedBalance)}</p>
        </div>
      </div>
      <div
        className={cn(
          "rounded-lg px-3 py-2 text-[11px] text-slate-500 dark:text-slate-400",
          isMinimal
            ? "bg-white/[0.02] dark:bg-white/[0.03]"
            : "border border-slate-200/80 bg-slate-50/70 dark:border-white/[0.08] dark:bg-[#10192b]"
        )}
      >
        Account Equity: <span className="font-semibold text-slate-900 dark:text-slate-100">{formatMoney(walletEquity)}</span>
      </div>
    </>
  );
}
