"use client";
import { useMemo } from 'react';
import { useJournalStore } from '@/domains/portfolio/stores/journal.store';
import { generateWeeklySummaries, WeeklySummary } from '@paper-market/core';
import { cn } from '@/lib/utils';
import { CalendarDays, TrendingUp, TrendingDown, Activity } from 'lucide-react';

export function WeeklyReviewPanel() {
  const entries = useJournalStore((state) => state.entries);
  const summaries = useMemo(() => generateWeeklySummaries(entries), [entries]);

  if (summaries.length === 0) return null;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getTopBehaviors = (summary: WeeklySummary) => {
    return Object.entries(summary.behaviorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);
  };

  const panelClass = "rounded-[28px] border border-slate-200/80 bg-white dark:border-white/[0.08] dark:bg-[#0c1322]";

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-slate-100 flex items-center gap-2 ml-1">
        <CalendarDays className="h-5 w-5 text-slate-600 dark:text-slate-300" />
        Weekly Reviews
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {summaries.map((week) => (
          <div key={week.id} className={`${panelClass} flex flex-col hover:border-slate-300 dark:hover:border-white/[0.15] transition-colors overflow-hidden`}>
            <div className="py-4 px-5 border-b border-slate-100 dark:border-white/[0.05]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                  <span>{formatDate(week.startDate)} — {formatDate(week.endDate)}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100/80 dark:bg-white/[0.05] text-slate-500 dark:text-slate-400 font-mono tracking-wider uppercase">
                    {week.id}
                  </span>
                </div>
                <div className={cn(
                  "font-mono font-medium text-sm",
                  week.netPnL >= 0 ? "text-emerald-600 dark:text-[#2dd4bf]" : "text-rose-600 dark:text-[#fb7185]"
                )}>
                  {week.netPnL >= 0 ? "+" : ""}{formatCurrency(week.netPnL)}
                </div>
              </div>
            </div>
            <div className="py-4 px-5 space-y-4 flex-1">
              {/* Metrics Row */}
              <div className="flex items-center gap-6 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <div className="flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5" />
                  <span>{week.totalTrades} Trades</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {week.winRate >= 50 ? <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-[#2dd4bf]" /> : <TrendingDown className="h-3.5 w-3.5 text-rose-600 dark:text-[#fb7185]" />}
                  <span>{week.winRate.toFixed(0)}% Win Rate</span>
                </div>
              </div>

              {/* Behaviors Row */}
              {week.insightCount > 0 && (
                <div className="flex flex-wrap gap-2">
                  {getTopBehaviors(week).map(([type, count]) => (
                    <span 
                      key={type} 
                      className="inline-flex items-center rounded-lg px-2 py-1 text-[10px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/[0.05]"
                    >
                      {type.replace(/_/g, ' ').toLowerCase()} ({count})
                    </span>
                  ))}
                </div>
              )}

              {/* Factual Note */}
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-l-[3px] border-blue-500/30 dark:border-blue-400/20 pl-3">
                {week.note}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}