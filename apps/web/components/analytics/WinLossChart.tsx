"use client";

import { useMemo } from 'react';
import { useJournalEntries } from '@/hooks/use-journal-entries';
import { calculatePerformanceMetrics } from '@paper-market/core';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  if (metrics.totalTrades === 0) {
    return (
      <Card className="bg-card border-border flex flex-col h-full">
        <CardHeader className="py-4 border-b border-border/50">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <PieChartIcon className="h-4 w-4" />
            Win / Loss Ratio
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 items-center justify-center min-h-[250px] text-muted-foreground text-sm">
          No trading data available.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border flex flex-col h-full">
      <CardHeader className="py-4 border-b border-border/50">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <PieChartIcon className="h-4 w-4" />
          Win / Loss Ratio
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-[250px] pt-6 pb-2">
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
                <span className="text-sm font-medium ml-1 text-foreground">
                  {value} <span className="text-muted-foreground font-normal">({Math.round((entry.payload.value / metrics.totalTrades) * 100)}%)</span>
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
