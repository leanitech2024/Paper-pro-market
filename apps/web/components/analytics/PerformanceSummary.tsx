"use client";
import { useJournalEntries } from '@/hooks/use-journal-entries';
import { calculatePerformanceMetrics } from '@paper-market/core';
import { Activity, Target, TrendingUp, TrendingDown, IndianRupee, BarChart3, ArrowDownToLine } from 'lucide-react';

export function PerformanceSummary() {
  const entries = useJournalEntries();
  const metrics = calculatePerformanceMetrics(entries);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(value);
  };

  const tileClass = "rounded-[24px] border border-slate-200/80 bg-white p-4 dark:border-white/[0.08] dark:bg-[#0f1728]";
  const badgeClass = "rounded-2xl border border-slate-200 bg-slate-50 p-2.5 dark:border-white/[0.08] dark:bg-black/20";
  const iconClass = "h-4 w-4 text-slate-600 dark:text-slate-300";

  return (
    <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
      {/* 1. Net P&L */}
      <div className={tileClass}>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Net P&L</p>
          <span className={badgeClass}><IndianRupee className={iconClass} /></span>
        </div>
        <p className={`text-2xl font-semibold ${metrics.netPnL >= 0 ? "text-emerald-600 dark:text-[#2dd4bf]" : "text-rose-600 dark:text-[#fb7185]"}`}>
          {metrics.netPnL >= 0 ? "+" : ""}{formatCurrency(metrics.netPnL)}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">Total realized return</p>
      </div>

      {/* 2. Win Rate */}
      <div className={tileClass}>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Win Rate</p>
          <span className={badgeClass}><Target className={iconClass} /></span>
        </div>
        <p className={`text-2xl font-semibold ${metrics.winRate >= 50 ? "text-emerald-600 dark:text-[#2dd4bf]" : "text-rose-600 dark:text-[#fb7185]"}`}>
          {metrics.winRate}%
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">Consistency score</p>
      </div>

      {/* 3. Profit Factor */}
      <div className={tileClass}>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Profit Factor</p>
          <span className={badgeClass}><TrendingUp className={iconClass} /></span>
        </div>
        <p className={`text-2xl font-semibold ${metrics.profitFactor >= 1.5 ? "text-emerald-600 dark:text-[#2dd4bf]" : metrics.profitFactor >= 1 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-[#fb7185]"}`}>
          {metrics.profitFactor === Infinity ? "∞" : metrics.profitFactor}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">Gross Win / Gross Loss</p>
      </div>

      {/* 4. Expectancy */}
      <div className={tileClass}>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Expectancy</p>
          <span className={badgeClass}><BarChart3 className={iconClass} /></span>
        </div>
        <p className={`text-2xl font-semibold ${metrics.expectancy > 0 ? "text-emerald-600 dark:text-[#2dd4bf]" : "text-rose-600 dark:text-[#fb7185]"}`}>
          {metrics.expectancy > 0 ? "+" : ""}{formatCurrency(metrics.expectancy)}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">Avg P&L per trade</p>
      </div>

      {/* 5. Total Trades */}
      <div className={tileClass}>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Total Trades</p>
          <span className={badgeClass}><Activity className={iconClass} /></span>
        </div>
        <p className="text-2xl font-semibold text-slate-950 dark:text-slate-100">{metrics.totalTrades}</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">Closed positions only</p>
      </div>

      {/* 6. Max Drawdown */}
      <div className={tileClass}>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Max Drawdown</p>
          <span className={badgeClass}><ArrowDownToLine className={iconClass} /></span>
        </div>
        <p className="text-2xl font-semibold text-rose-600 dark:text-[#fb7185]">
          -{formatCurrency(metrics.maxDrawdown)}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">Largest peak-to-trough drop</p>
      </div>

      {/* 7. Average Win */}
      <div className={tileClass}>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Average Win</p>
          <span className={badgeClass}><TrendingUp className={iconClass} /></span>
        </div>
        <p className="text-2xl font-semibold text-emerald-600 dark:text-[#2dd4bf]">
          +{formatCurrency(metrics.averageWin)}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">Per winning trade</p>
      </div>

      {/* 8. Average Loss */}
      <div className={tileClass}>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Average Loss</p>
          <span className={badgeClass}><TrendingDown className={iconClass} /></span>
        </div>
        <p className="text-2xl font-semibold text-rose-600 dark:text-[#fb7185]">
          -{formatCurrency(metrics.averageLoss)}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">Per losing trade</p>
      </div>
    </div>
  );
}