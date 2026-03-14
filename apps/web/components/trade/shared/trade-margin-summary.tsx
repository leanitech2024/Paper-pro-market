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
}: {
  requiredMargin: number;
  balance: number;
  blockedBalance: number;
  walletEquity: number;
}) {
  return (
    <>
      <div className="grid grid-cols-3 divide-x divide-border overflow-hidden rounded-lg border border-border bg-muted/30">
        <div className="px-3 py-2">
          <p className="text-[10px] text-muted-foreground">Required</p>
          <p className="mt-0.5 text-xs font-semibold tabular-nums text-foreground">{formatMoney(requiredMargin)}</p>
        </div>
        <div className="px-3 py-2">
          <p className="text-[10px] text-muted-foreground">Available</p>
          <p className="mt-0.5 text-xs font-semibold tabular-nums text-foreground">{formatMoney(balance)}</p>
        </div>
        <div className="px-3 py-2">
          <p className="text-[10px] text-muted-foreground">Blocked</p>
          <p className="mt-0.5 text-xs font-semibold tabular-nums text-foreground">{formatMoney(blockedBalance)}</p>
        </div>
      </div>
      <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
        Account Equity: <span className="font-semibold text-foreground">{formatMoney(walletEquity)}</span>
      </div>
    </>
  );
}
