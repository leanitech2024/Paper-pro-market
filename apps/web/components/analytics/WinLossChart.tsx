"use client";

import { useMemo } from 'react';
import { useJournalEntries } from '@/hooks/use-journal-entries';
import { calculatePerformanceMetrics } from '@paper-market/core';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';

export function WinLossChart() {
  const entries = useJournalEntries();
  const metrics = calculatePerformanceMetrics(entries);

  const data = useMemo(() => {
    if (metrics.totalTrades === 0) return [];
    
    const winningTrades = Math.round((metrics.winRate / 100) * metrics.totalTrades);
    const losingTrades = metrics.totalTrades - winningTrades;

    return [
      { name: 'Wins', value: winningTrades, color: '#22c55e' }, // success
      { name: 'Losses', value: losingTrades, color: '#ef4444' } // destructive
    ];
  }, [metrics]);

  const panelClass = "rounded-[28px] border border-slate-200/80 bg-white dark:border-white/[0.08] dark:bg-[#0c1322]";
  const badgeClass = "rounded-2xl border border-slate-200 bg-slate-50 p-2.5 dark:border-white/[0.08] dark:bg-black/20";

  if (metrics.totalTrades === 0) {
    return (
      <div className={`${panelClass} p-4 md:p-5 flex flex-col h-full`}>
        <div className="mb-4 flex items-center justify-between pb-2">
          <div>
            <h2 className="text-base font-semibold text-slate-950 dark:text-slate-100">Win / Loss Ratio</h2>
          </div>
          <span className={badgeClass}>
            <PieChartIcon className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </span>
        </div>
        <div className="flex flex-1 items-center justify-center min-h-[250px] text-muted-foreground text-sm">
          No trading data available.
        </div>
      </div>
    );
  }

  return (
    <div className={`${panelClass} p-4 md:p-5 flex flex-col h-full`}>
      <div className="mb-4 flex items-center justify-between pb-2">
        <div>
          <h2 className="text-base font-semibold text-slate-950 dark:text-slate-100">Win / Loss Ratio</h2>
        </div>
        <span className={badgeClass}>
          <PieChartIcon className="h-4 w-4 text-slate-600 dark:text-slate-300" />
        </span>
      </div>
      <div className="flex-1 min-h-[250px] pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={90}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
              isAnimationActive={false}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: "hsl(var(--popover))", borderColor: "hsl(var(--border))", borderRadius: '8px', fontSize: "12px" }}
              itemStyle={{ color: "hsl(var(--foreground))" }}
              formatter={(value: number) => [`${value} Trades`, 'Count']}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              iconType="circle"
              formatter={(value, entry: any) => (
                <span className="text-sm font-medium ml-1 text-slate-950 dark:text-slate-100">
                  {value} <span className="text-slate-500 font-normal">({Math.round((entry.payload.value / metrics.totalTrades) * 100)}%)</span>
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
