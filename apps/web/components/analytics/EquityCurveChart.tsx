"use client";
import { useMemo } from 'react';
import { useJournalEntries } from '@/hooks/use-journal-entries';
import { useWalletStore } from '@/stores/wallet.store';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  return (
    <Card className="bg-card border-border flex flex-col h-full">
      <CardHeader className="py-4 border-b border-border/50">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Equity & Drawdown
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-[300px] w-full pl-0 pt-6 pb-2">
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
      </CardContent>
    </Card>
  );
}
