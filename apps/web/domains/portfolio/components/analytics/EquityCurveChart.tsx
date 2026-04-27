"use client";
import { useMemo } from 'react';
import { useJournalEntries } from '@/domains/portfolio/hooks/use-journal-entries';
import { useWalletStore } from '@/domains/platform/stores/wallet.store';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

export function EquityCurveChart() {
  const entries = useJournalEntries();
  const walletBalance = useWalletStore(state => state.balance);

  // Data Transformation: Calculate Running Peak & Drawdown
  const chartData = useMemo(() => {
    const closedTrades = entries
      .filter((e) => e.realizedPnL !== undefined && e.exitTime !== undefined)
      .slice()
      .sort((a, b) => new Date(a.exitTime!).getTime() - new Date(b.exitTime!).getTime());

    // Compute exactly where the balance started by subtracting total realized P&L from current balance
    const totalPnL = closedTrades.reduce((acc, t) => acc + (t.realizedPnL || 0), 0);
    const INITIAL_BALANCE = walletBalance > 0 ? walletBalance - totalPnL : 100000;

    
    if (closedTrades.length === 0) {
      return [{ time: Date.now(), equity: INITIAL_BALANCE, drawdown: 0, peak: INITIAL_BALANCE }];
    }

    const history: { time: number; equity: number; drawdown: number; peak: number }[] = [];
    
    let currentEquity = INITIAL_BALANCE;
    let peak = INITIAL_BALANCE;

    // Start point
    history.push({
      time: new Date(closedTrades[0].exitTime!).getTime() - 1000, // Just before first trade
      equity: currentEquity,
      drawdown: 0,
      peak: peak
    });

    closedTrades.forEach(trade => {
      currentEquity += trade.realizedPnL!;
      if (currentEquity > peak) peak = currentEquity;
      
      history.push({
        time: new Date(trade.exitTime!).getTime(),
        equity: currentEquity,
        drawdown: currentEquity - peak,
        peak: peak
      });
    });

    return history;
  }, [entries, walletBalance]);

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
    if (Math.abs(value) >= 1000) {
      const k = value / 1000;
      return Number.isInteger(k) ? `${k}k` : `${k.toFixed(1)}k`;
    }
    return value.toString();
  };

  const formatDate = (time: number) =>
    format(new Date(time), 'dd MMM');

  if (chartData.length === 0) return null;

  const panelClass = "rounded-[28px] border border-slate-200/80 bg-white dark:border-white/[0.08] dark:bg-[#0c1322]";
  const badgeClass = "rounded-2xl border border-slate-200 bg-slate-50 p-2.5 dark:border-white/[0.08] dark:bg-black/20";

  return (
    <div className={`${panelClass} p-4 md:p-5 flex flex-col h-full`}>
      <div className="mb-4 flex items-center justify-between pb-2">
        <div>
          <h2 className="text-base font-semibold text-slate-950 dark:text-slate-100">Equity & Drawdown</h2>
        </div>
        <span className={badgeClass}>
          <TrendingUp className="h-4 w-4 text-slate-600 dark:text-slate-300" />
        </span>
      </div>
      <div className="flex-1 min-h-[300px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis 
              dataKey="time" 
              tickFormatter={formatDate}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              minTickGap={40}
            />
            {/* Equity Axis (Right) */}
            <YAxis 
              yAxisId="equity"
              orientation="right"
              tickFormatter={formatCurrency}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              domain={[(dataMin: number) => Math.floor(dataMin * 0.99), (dataMax: number) => Math.ceil(dataMax * 1.01)]}
            />
            {/* Drawdown Axis (Left, hidden scale mostly, mapped to bottom) */}
            <YAxis 
              yAxisId="drawdown"
              orientation="left"
              hide={true} 
              domain={['dataMin', 0]} // Keep drawdown at bottom
            />
            
            <Tooltip 
              contentStyle={{ backgroundColor: "hsl(var(--popover))", borderColor: "hsl(var(--border))", borderRadius: '8px', fontSize: "12px" }}
              labelFormatter={(label) =>
                format(new Date(label), 'dd MMM HH:mm')
              }
              formatter={(value: number, name: string) => [
                `₹${value.toLocaleString()}`, 
                name === 'equity' ? 'Balance' : 'Drawdown'
              ]}
              cursor={{ stroke: "hsl(var(--muted-foreground))", opacity: 0.2 }}
            />

            {/* Zero Line for Drawdown */}
            <ReferenceLine y={0} yAxisId="drawdown" stroke="hsl(var(--border))" />

            {/* Drawdown Area (Red, Bottom) */}
            <Area
              yAxisId="drawdown"
              type="monotone"
              dataKey="drawdown"
              stroke="transparent"
              fill="#ef4444"
              fillOpacity={0.15}
              isAnimationActive={false}
            />

            {/* Equity Line (Green, Top) */}
            <Line
              yAxisId="equity"
              type="monotone"
              dataKey="equity"
              stroke="#22c55e"
              strokeWidth={2}
              dot={chartData.length === 1}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
