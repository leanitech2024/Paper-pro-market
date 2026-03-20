"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useDashboardOverview } from "@/hooks/queries/use-dashboard-overview";
import { useMarketStore } from "@/stores/trading/market.store";
import { toInstrumentKey } from "@paper-market/core";
import {
  Activity,
  ArrowUpRight,
  BookOpenText,
  CandlestickChart,
  ChartNoAxesCombined,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  LayoutGrid,
  ShieldCheck,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

type QuickAction = {
  label: string;
  href: string;
  icon: typeof CandlestickChart;
  accentClass: string;
  iconClass: string;
};

const quickActions: QuickAction[] = [
  {
    label: "Equity",
    href: "/trade/equity",
    icon: CandlestickChart,
    accentClass:
      "border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 hover:border-blue-300 dark:border-blue-400/20 dark:bg-gradient-to-br dark:from-[#12233d] dark:to-[#112a46]",
    iconClass: "text-blue-700 dark:text-blue-300",
  },
  {
    label: "Futures",
    href: "/trade/futures",
    icon: TrendingUp,
    accentClass:
      "border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 hover:border-emerald-300 dark:border-emerald-400/20 dark:bg-gradient-to-br dark:from-[#0f2a28] dark:to-[#123333]",
    iconClass: "text-emerald-700 dark:text-emerald-300",
  },
  {
    label: "Options",
    href: "/trade/options",
    icon: ShieldCheck,
    accentClass:
      "border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50 hover:border-violet-300 dark:border-violet-400/20 dark:bg-gradient-to-br dark:from-[#251937] dark:to-[#302043]",
    iconClass: "text-violet-700 dark:text-violet-300",
  },
  {
    label: "Journal",
    href: "/journal",
    icon: BookOpenText,
    accentClass:
      "border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 hover:border-amber-300 dark:border-amber-400/20 dark:bg-gradient-to-br dark:from-[#35240f] dark:to-[#3f2b12]",
    iconClass: "text-amber-700 dark:text-amber-300",
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: ChartNoAxesCombined,
    accentClass:
      "border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50 hover:border-rose-300 dark:border-rose-400/20 dark:bg-gradient-to-br dark:from-[#351827] dark:to-[#402132]",
    iconClass: "text-rose-700 dark:text-rose-300",
  },
];

const DashboardPage = () => {
  const { data: overview, isLoading, isError, error } = useDashboardOverview();
  const quotesByInstrument = useMarketStore((state) => state.quotesByInstrument);
  const selectQuote = useMarketStore((state) => state.selectQuote);

  const staleThresholdSec = overview?.freshness.staleThresholdSec ?? 20;

  const liveState = useMemo(() => {
    if (!overview) {
      return {
        openPnL: 0,
        totalPnL: 0,
        stale: false,
        staleCount: 0,
        unknownCount: 0,
      };
    }

    let openPnL = 0;
    let staleCount = 0;
    let unknownCount = 0;
    const nowMs = Date.now();

    for (const position of overview.positions) {
      const key = toInstrumentKey(position.instrumentKey || position.symbol);
      const quote = quotesByInstrument[key] || selectQuote(key) || selectQuote(position.symbol);

      const quotePrice = Number(quote?.price);
      const hasLiveQuote = Number.isFinite(quotePrice) && quotePrice > 0;

      const fallbackPrice = Number(position.lastKnownPrice);
      const hasFallback = Number.isFinite(fallbackPrice) && fallbackPrice > 0;

      if (!hasLiveQuote && !hasFallback) {
        unknownCount += 1;
        staleCount += 1;
        continue;
      }

      const activePrice = hasLiveQuote ? quotePrice : fallbackPrice;
      const delta =
        position.side === "BUY"
          ? activePrice - position.entryPrice
          : position.entryPrice - activePrice;
      openPnL += delta * position.quantity;

      const updatedAtMs = hasLiveQuote
        ? Number.isFinite(Number(quote?.timestamp))
          ? Number(quote?.timestamp)
          : nowMs
        : position.lastKnownPriceAt
          ? new Date(position.lastKnownPriceAt).getTime()
          : null;

      if (
        updatedAtMs === null ||
        !Number.isFinite(updatedAtMs) ||
        nowMs - updatedAtMs > staleThresholdSec * 1000
      ) {
        staleCount += 1;
      }
    }

    return {
      openPnL,
      totalPnL: openPnL + overview.orders.closedPnL,
      stale: staleCount > 0 || overview.freshness.stale,
      staleCount: Math.max(staleCount, overview.freshness.staleCount),
      unknownCount,
    };
  }, [overview, quotesByInstrument, selectQuote, staleThresholdSec]);

  const availableBalance = overview?.wallet.availableBalance ?? 0;
  const closedPnL = overview?.orders.closedPnL ?? 0;
  const winRate = overview?.metrics.winRate ?? 0;
  const maxDrawdown = overview?.metrics.maxDrawdownPct ?? 0;
  const sharpeRatio = overview?.metrics.sharpeRatio ?? 0;
  const dailyPnL = overview?.metrics.dailyPnL ?? 0;
  const bestTrade = overview?.metrics.bestTrade ?? 0;
  const positionCount = overview?.positions.length ?? 0;
  const winningTrades = overview?.orders.winningTradeCount ?? 0;
  const closedTradeCount = overview?.orders.closedTradeCount ?? 0;
  const capitalDeployed =
    overview?.positions.reduce((acc, position) => acc + position.entryPrice * position.quantity, 0) ?? 0;
  const quoteCoverageCount = Math.max(positionCount - liveState.unknownCount, 0);
  const quoteCoveragePct =
    positionCount > 0 ? Math.round((quoteCoverageCount / positionCount) * 100) : 100;
  const avgClosedPnl = closedTradeCount > 0 ? closedPnL / closedTradeCount : 0;
  const freshnessLabel = liveState.stale
    ? `${liveState.staleCount} position${liveState.staleCount === 1 ? "" : "s"} delayed`
    : "All tracked quotes are fresh";
  const asOfLabel = overview?.asOf
    ? new Intl.DateTimeFormat("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "short",
      }).format(new Date(overview.asOf))
    : "--";

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);

  const formatCompact = (value: number) =>
    new Intl.NumberFormat("en-IN", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);

  const statTiles = [
    {
      title: "Available Balance",
      value: formatCurrency(availableBalance),
      subtitle: "Virtual funds ready",
      icon: Wallet,
      tone: "text-slate-950 dark:text-slate-100",
    },
    {
      title: "Open P&L",
      value: `${liveState.openPnL >= 0 ? "+" : ""}${formatCurrency(liveState.openPnL)}`,
      subtitle: liveState.stale ? "Live mark delayed" : "Marked from live quotes",
      icon: TrendingUp,
      tone: liveState.openPnL >= 0 ? "text-emerald-600 dark:text-[#2dd4bf]" : "text-rose-600 dark:text-[#fb7185]",
    },
    {
      title: "Closed P&L",
      value: `${closedPnL >= 0 ? "+" : ""}${formatCurrency(closedPnL)}`,
      subtitle: `${closedTradeCount} closed trades`,
      icon: CircleDollarSign,
      tone: closedPnL >= 0 ? "text-emerald-600 dark:text-[#2dd4bf]" : "text-rose-600 dark:text-[#fb7185]",
    },
    {
      title: "Win Rate",
      value: `${winRate.toFixed(1)}%`,
      subtitle: `${winningTrades}/${closedTradeCount || 0} profitable closes`,
      icon: Target,
      tone: winRate >= 50 ? "text-amber-600 dark:text-[#fbbf24]" : "text-slate-950 dark:text-slate-100",
    },
  ] as const;

  const recentOrders = (overview?.orders.recent || []).slice(0, 6);
  const panelClass = "rounded-[28px] border border-slate-200/80 bg-white dark:border-white/[0.08] dark:bg-[#0c1322]";
  const tileClass = "rounded-[24px] border border-slate-200/80 bg-white p-4 dark:border-white/[0.08] dark:bg-[#0f1728]";
  const badgeClass = "rounded-2xl border border-slate-200 bg-slate-50 p-2.5 dark:border-white/[0.08] dark:bg-black/20";

  return (
    <div className="min-h-full w-full pb-24 pt-1 md:pb-8">
      <div className="flex w-full flex-col gap-4 px-2 sm:px-4 md:gap-6 md:px-6 xl:px-8">
        {isError && (
          <div className="rounded-2xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
            Failed to load dashboard data: {error instanceof Error ? error.message : "Unknown error"}
          </div>
        )}

        <section className={`${panelClass} p-4 sm:p-5 lg:p-6`}>
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-end 2xl:justify-between">
              <div className="space-y-2">
                
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-100 sm:text-3xl">
                    Your paper trading cockpit
                  </h1>
                  <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
                    Live balance, execution quality, and market readiness powered by your current paper book.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/[0.08] dark:bg-[#10192b]">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Balance</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-slate-100">{formatCurrency(availableBalance)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/[0.08] dark:bg-[#10192b]">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Exposure</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-slate-100">{formatCurrency(capitalDeployed)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/[0.08] dark:bg-[#10192b]">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Quotes</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-slate-100">{quoteCoveragePct}% covered</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/[0.08] dark:bg-[#10192b]">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Updated</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-slate-100">{asOfLabel}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(340px,0.95fr)] 2xl:grid-cols-[minmax(0,1.95fr)_minmax(380px,1fr)]">
              <div className="space-y-4">
                <section className={`${panelClass} p-4 md:p-5`}>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-950 dark:text-slate-200 md:text-base">Quick Access</h2>
                    <span className="text-[11px] text-slate-500 dark:text-slate-500">Tap to open</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                    {quickActions.map((action) => {
                      const Icon = action.icon;
                      return (
                        <Link
                          key={action.href}
                          href={action.href}
                          className={`group flex min-h-[94px] flex-col items-center justify-center rounded-2xl border px-3 py-3 text-center transition ${action.accentClass}`}
                        >
                          <Icon className={`h-5 w-5 transition group-hover:scale-105 ${action.iconClass}`} />
                          <span className="mt-2 text-xs font-medium text-slate-800 dark:text-slate-100">{action.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </section>

                <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                  {isLoading
                    ? Array.from({ length: 4 }).map((_, idx) => (
                        <div
                          key={`sk-${idx}`}
                          className="h-[138px] animate-pulse rounded-[24px] border border-slate-200 bg-slate-100 dark:border-white/[0.08] dark:bg-[#111827]"
                        />
                      ))
                    : statTiles.map((tile) => {
                        const Icon = tile.icon;
                        return (
                          <div key={tile.title} className={tileClass}>
                            <div className="mb-4 flex items-center justify-between">
                              <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{tile.title}</p>
                              <span className={badgeClass}>
                                <Icon className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                              </span>
                            </div>
                            <p className={`text-2xl font-semibold ${tile.tone}`}>{tile.value}</p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">{tile.subtitle}</p>
                          </div>
                        );
                      })}
                </section>

                <section className={`${panelClass} p-4 md:p-5`}>
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-950 dark:text-slate-200 md:text-base">Recent Orders</h2>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">Latest fills and realized outcomes from your actual order book</p>
                    </div>
                    <Link href="/orders" className="inline-flex items-center gap-1 text-xs text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200">
                      View all <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  <div className="space-y-2.5">
                    {isLoading &&
                      Array.from({ length: 4 }).map((_, idx) => (
                        <div
                          key={`ord-sk-${idx}`}
                          className="h-16 animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-white/[0.08] dark:bg-[#111827]"
                        />
                      ))}

                    {!isLoading && recentOrders.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500 dark:border-white/[0.1] dark:bg-[#0d1525] dark:text-slate-400">
                        No recent orders yet.
                      </div>
                    )}

                    {!isLoading &&
                      recentOrders.map((order) => {
                        const pnl = Number(order.realizedPnL || 0);
                        const pnlText = `${pnl >= 0 ? "+" : ""}${formatCurrency(pnl)}`;
                        return (
                          <div
                            key={order.id}
                            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/[0.08] dark:bg-[#10192b]"
                          >
                            <div>
                              <p className="text-sm font-semibold text-slate-950 dark:text-slate-100">{order.symbol}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-500">
                                {order.side} - Qty {order.quantity} - {order.status}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`text-sm font-semibold ${pnl >= 0 ? "text-emerald-600 dark:text-[#2dd4bf]" : "text-rose-600 dark:text-[#fb7185]"}`}>
                                {pnlText}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-500">Realized</p>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </section>
              </div>

              <aside className="grid gap-4 auto-rows-min">
                <section className={`${panelClass} p-4 md:p-5`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Live Snapshot</p>
                      <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-100">Current desk state</h2>
                    </div>
                    <span className={badgeClass}>
                      <Activity className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/[0.08] dark:bg-[#10192b]">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Data status</p>
                      <p className={`mt-1 text-sm font-semibold ${liveState.stale ? "text-amber-600 dark:text-amber-300" : "text-emerald-600 dark:text-[#2dd4bf]"}`}>
                        {freshnessLabel}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/[0.08] dark:bg-[#10192b]">
                        <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Open positions</p>
                        <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-100">{positionCount}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">{quoteCoverageCount} with usable quotes</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/[0.08] dark:bg-[#10192b]">
                        <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Capital used</p>
                        <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-100">{formatCurrency(capitalDeployed)}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">{formatCompact(capitalDeployed)} deployed</p>
                      </div>
                    </div>
                  </div>
                </section>

                <section className={`${panelClass} p-4 md:p-5`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Performance Breakdown</p>
                      <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-100">Actual account metrics</h2>
                    </div>
                    <span className={badgeClass}>
                      <LayoutGrid className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/[0.08] dark:bg-[#10192b]">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Risk</p>
                      <p className="mt-2 text-2xl font-semibold text-rose-600 dark:text-[#fb7185]">
                        {maxDrawdown > 0 ? `-${maxDrawdown.toFixed(2)}%` : "0.00%"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">Max drawdown</p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/[0.08] dark:bg-[#10192b]">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Quality</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-slate-100">{sharpeRatio.toFixed(2)}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">Sharpe ratio</p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/[0.08] dark:bg-[#10192b]">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Best trade</p>
                      <p className="mt-2 text-2xl font-semibold text-emerald-600 dark:text-[#2dd4bf]">{formatCurrency(bestTrade)}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">Highest realized profit</p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/[0.08] dark:bg-[#10192b]">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Daily</p>
                      <p className={`mt-2 text-2xl font-semibold ${dailyPnL >= 0 ? "text-emerald-600 dark:text-[#2dd4bf]" : "text-rose-600 dark:text-[#fb7185]"}`}>
                        {dailyPnL >= 0 ? "+" : ""}
                        {formatCurrency(dailyPnL)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">Today's realized P&L</p>
                    </div>
                  </div>
                </section>

                <section className={`${panelClass} p-4 md:p-5`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Execution Readout</p>
                      <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-100">What the book is saying</h2>
                    </div>
                    <span className={badgeClass}>
                      <Clock3 className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/[0.08] dark:bg-[#10192b]">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Average closed trade</p>
                      <p className={`mt-2 text-xl font-semibold ${avgClosedPnl >= 0 ? "text-emerald-600 dark:text-[#2dd4bf]" : "text-rose-600 dark:text-[#fb7185]"}`}>
                        {avgClosedPnl >= 0 ? "+" : ""}
                        {formatCurrency(avgClosedPnl)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">Closed P&L divided by realized trades</p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/[0.08] dark:bg-[#10192b]">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Quote coverage</p>
                      <p className="mt-2 text-xl font-semibold text-slate-950 dark:text-slate-100">{quoteCoveragePct}%</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                        {quoteCoverageCount}/{positionCount || 1} open positions priced from live or fallback data
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Link
                        href="/trade/equity"
                        className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 p-4 transition hover:border-blue-300 dark:border-blue-400/20 dark:bg-gradient-to-br dark:from-[#10253a] dark:to-[#123845]"
                      >
                        <p className="text-[11px] uppercase tracking-[0.12em] text-blue-700 dark:text-blue-200">Trade</p>
                        <p className="mt-2 text-base font-semibold text-slate-950 dark:text-slate-100">Open terminal</p>
                      </Link>
                      <Link
                        href="/analytics"
                        className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-4 transition hover:border-violet-300 dark:border-violet-400/20 dark:bg-gradient-to-br dark:from-[#2a1f34] dark:to-[#1b2438]"
                      >
                        <p className="text-[11px] uppercase tracking-[0.12em] text-violet-700 dark:text-violet-200">Review</p>
                        <p className="mt-2 text-base font-semibold text-slate-950 dark:text-slate-100">Open analytics</p>
                      </Link>
                    </div>
                  </div>
                </section>
              </aside>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default DashboardPage;
