"use client";
import { useEffect } from 'react';
import { useJournalStore } from '@/stores/trading/journal.store';
import { PerformanceSummary } from '@/components/analytics/PerformanceSummary';
import { EquityCurveChart } from '@/components/analytics/EquityCurveChart';
import { WeeklyReviewPanel } from '@/components/analytics/WeeklyReviewPanel';
import { WinLossChart } from '@/components/analytics/WinLossChart';
import { UpgradeGate } from '@/components/subscription/UpgradeGate';

export default function AnalyticsPageClient() {
  const fetchJournal = useJournalStore(state => state.fetchJournal);

  useEffect(() => {
    fetchJournal();
  }, [fetchJournal]);

  return (
    <UpgradeGate feature="analytics">
      <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Analytics</h1>
        <p className="text-muted-foreground mt-1">Comprehensive performance metrics based on your closed journal entries.</p>
      </div>

      <div className="flex flex-col gap-6">
        {/* Top Metrics Cards - 8 grid items */}
        <PerformanceSummary />

        {/* Middle Charts Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 auto-rows-fr">
          <div className="lg:col-span-2">
            <EquityCurveChart />
          </div>
          <div className="lg:col-span-1 min-h-[350px]">
            <WinLossChart />
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-3">
            <WeeklyReviewPanel />
          </div>
        </div>
      </div>
      </div>
    </UpgradeGate>
  );
}
