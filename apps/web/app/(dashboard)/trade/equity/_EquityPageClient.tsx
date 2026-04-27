"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import dynamic from "next/dynamic";
import { EquityTradingForm } from "@/domains/trading/components/equity/equity-trading-form";
import { Stock } from "@paper-market/core";
import { useMarketStore } from "@/domains/market/stores/market.store";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { GlobalSearchModal } from "@/domains/watchlist/components/search/GlobalSearchModal";
import { WatchlistPanel } from "@/domains/watchlist/components/watchlist/WatchlistPanel";
import { AdaptiveTradeLayout } from "@/domains/trading/components/layout/AdaptiveTradeLayout";
import { useTradeViewport } from "@/domains/trading/hooks/use-trade-viewport";
import { PositionsTable } from "@/domains/trading/components/positions/PositionsTable";
import { BottomBar } from "@/domains/trading/components/options/BottomBar";


import { ChevronLeft, Search } from "lucide-react";

const CandlestickChartComponent = dynamic(
  () => import("@/domains/chart/components/CandlestickChart").then((mod) => ({ default: mod.CandlestickChart })),
  { ssr: false },
);

const panelClass =
  "rounded-[28px] border border-slate-200/80 bg-white dark:border-white/[0.08] dark:bg-[#0c1322]";
const chartPanelClass =
  "rounded-none border border-slate-200/80 bg-white dark:border-white/[0.08] dark:bg-[#0c1322]";
const tileClass =
  "rounded-[24px] border border-slate-200/80 bg-white dark:border-white/[0.08] dark:bg-[#0f1728]";
const headerBorderClass = "border-b border-slate-200/80 dark:border-white/[0.08]";

export default function EquityPage({ initialSymbol }: { initialSymbol?: string }) {
  const { isMobile, isDesktop } = useTradeViewport();
  const getCurrentInstruments = useMarketStore((state) => state.getCurrentInstruments);
  const stocksBySymbol = useMarketStore((state) => state.stocksBySymbol);

  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [mobileOrderOpen, setMobileOrderOpen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<"watchlist" | "chart">("watchlist");

  const currentInstruments = getCurrentInstruments("equity");
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(initialSymbol || null);
  const [selectedFallback, setSelectedFallback] = useState<Stock | null>(null);

  useEffect(() => {
    if (initialSymbol) {
      setSelectedSymbol(initialSymbol);
    }
  }, [initialSymbol]);

  const selectedStock = useMemo(() => {
    if (!selectedSymbol) return null;
    return stocksBySymbol[selectedSymbol] || selectedFallback;
  }, [selectedSymbol, selectedFallback, stocksBySymbol]);

  // NOTE: No auto-select. Chart should appear only after user clicks a stock
  // (unless an initialSymbol is explicitly provided).

  useEffect(() => {
    if (!selectedSymbol) return;
    if (!stocksBySymbol[selectedSymbol]) return;
    if (selectedFallback?.symbol !== selectedSymbol) return;
    setSelectedFallback(null);
  }, [selectedSymbol, selectedFallback, stocksBySymbol]);

  useEffect(() => {
    window.triggerTrade = (_side: "BUY" | "SELL") => {
      if (isMobile) {
        setMobileOrderOpen(true);
        return;
      }
      setShowOrderForm(true);
    };
    return () => {
      window.triggerTrade = undefined;
    };
  }, [isMobile]);

  useEffect(() => {
    if (isMobile) setMobilePanel("watchlist");
  }, [isMobile]);

  const handleSelectStock = useCallback((stock: Stock) => {
    setSelectedSymbol(stock.symbol);
    setSelectedFallback(stock);
    if (isMobile) setMobilePanel("chart");
  }, [isMobile]);

  const handleClearSelection = useCallback(() => {
    setSelectedSymbol(null);
    setSelectedFallback(null);
  }, []);

  const chartNode = useMemo(() => (
    <div className="h-full w-full">
      {selectedSymbol ? (
        <Suspense fallback={<Skeleton className="h-full w-full" />}>
          <div className="h-full w-full">
            <CandlestickChartComponent
              symbol={selectedSymbol}
              instrumentKey={selectedStock?.instrumentToken}
              onSearchClick={() => setSearchModalOpen(true)}
            />
          </div>
        </Suspense>
      ) : !isMobile ? (
        <div className="h-full overflow-auto p-4">
          <PositionsTable />
        </div>
      ) : (
        <div className="flex h-full items-center justify-center text-slate-500 dark:text-slate-400">
          Select a stock to view chart
        </div>
      )}
    </div>
  ), [selectedSymbol, selectedStock, isMobile, showOrderForm, isDesktop]);

  const watchlistNode = useMemo(() => (
    <div className="h-full">
      <WatchlistPanel
        instruments={currentInstruments}
        selectedSymbol={selectedSymbol ?? undefined}
        onSelect={handleSelectStock}
        onOpenSearch={() => setSearchModalOpen(true)}
        onClearSelection={handleClearSelection}
      />
    </div>
  ), [currentInstruments, selectedSymbol, handleSelectStock, handleClearSelection]);

  const orderPanelNode = useMemo(() => (
    selectedStock ? (
      <div className="h-full min-h-0 overflow-y-auto">
        <EquityTradingForm
          selectedStock={selectedStock}
          onStockSelect={handleSelectStock}
          instruments={currentInstruments}
          sheetMode
          onOpenSearch={() => setSearchModalOpen(true)}
        />
      </div>
    ) : (
      <div className="flex h-full items-center justify-center p-4 text-xs text-slate-500 dark:text-slate-400">
        Select a stock to place an order.
      </div>
    )
  ), [selectedStock, currentInstruments, handleSelectStock]);

  const tabletWatchlistNode = useMemo(() => (
    <div className="h-full min-h-0 overflow-hidden bg-transparent p-2">
      <div className={`h-full min-h-0 overflow-hidden ${panelClass} shadow-sm`}>
        <div
          className={`${headerBorderClass} px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400`}
        >
          Watchlist
        </div>
        <div className="h-[calc(100%-37px)] min-h-0 overflow-hidden">{watchlistNode}</div>
      </div>
    </div>
  ), [watchlistNode]);

  const tabletOrderNode = useMemo(() => (
    <div className="h-full min-h-0 overflow-hidden bg-transparent p-2">
      <div className={`h-full min-h-0 overflow-hidden ${panelClass} shadow-sm`}>
        <div
          className={`${headerBorderClass} px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400`}
        >
          Order Ticket
        </div>
        <div className="h-[calc(100%-37px)] min-h-0 overflow-hidden">{orderPanelNode}</div>
      </div>
    </div>
  ), [orderPanelNode]);

  const mobileChartNode = useMemo(() => (
    <div className="h-full min-h-0 min-w-0 max-w-full overflow-x-hidden bg-transparent p-2 pb-3">
      <div className={`h-full min-h-0 min-w-0 max-w-full overflow-x-hidden overflow-y-hidden ${chartPanelClass} shadow-sm`}>
        {chartNode}
      </div>
    </div>
  ), [chartNode]);

  const mobileWatchlistNode = useMemo(() => (
    <div className="h-full min-h-0 bg-transparent p-2 pb-3">
      <div className={`h-full min-h-0 overflow-hidden ${chartPanelClass} shadow-sm`}>
        <div className={`flex items-center justify-between px-3 py-2 ${headerBorderClass}`}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
              Watchlist
            </p>
            <p className="text-[11px] text-slate-500/80 dark:text-slate-400/80">
              Tap any stock to open chart
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSearchModalOpen(true)}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/[0.08] dark:bg-[#10192b] dark:text-slate-100 dark:hover:bg-white/[0.08]"
          >
            <Search className="h-3.5 w-3.5" />
            Search
          </button>
        </div>
        <div className="h-[calc(100%-56px)] min-h-0 overflow-hidden">{watchlistNode}</div>
      </div>
    </div>
  ), [watchlistNode]);

  const mobileChartNodeWithHeader = useMemo(() => (
    <div className="h-full min-h-0 min-w-0 max-w-full overflow-hidden bg-transparent p-2 pb-3">
      <div className={`h-full min-h-0 min-w-0 max-w-full overflow-hidden ${panelClass} shadow-sm`}>
        <div className={`flex items-center justify-between px-3 py-2 ${headerBorderClass}`}>
          <button
            type="button"
            onClick={() => setMobilePanel("watchlist")}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/[0.08] dark:bg-[#10192b] dark:text-slate-100 dark:hover:bg-white/[0.08]"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Watchlist
          </button>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => window.triggerTrade?.("BUY")}
              className="h-7 rounded bg-emerald-600 px-3 text-[10px] uppercase font-bold text-white shadow"
            >
              Buy
            </button>
            <button
              type="button"
              onClick={() => window.triggerTrade?.("SELL")}
              className="h-7 rounded bg-rose-600 px-3 text-[10px] uppercase font-bold text-white shadow"
            >
              Sell
            </button>
          </div>
        </div>
        <div className="h-[calc(100%-49px)] min-h-0 overflow-hidden">{chartNode}</div>
      </div>
    </div>
  ), [chartNode]);

  const mobileMainNode = mobilePanel === "watchlist" ? mobileWatchlistNode : mobileChartNodeWithHeader;

  // Removed mobileTopBarNode as per user request

  const mobileOrderDrawerNode = useMemo(() => (
    <div className="h-[86vh] min-h-0 overflow-hidden bg-background">
      <div className="border-b border-slate-200/80 px-4 py-3 dark:border-white/[0.08]">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
          Order Ticket
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-slate-100">
          {selectedStock?.symbol || "EQUITY"}
        </p>
      </div>
      <div className="h-[calc(100%-62px)] min-h-0 overflow-y-auto">{orderPanelNode}</div>
    </div>
  ), [selectedStock, orderPanelNode]);

  return (
    <>
      <GlobalSearchModal
        open={searchModalOpen}
        onOpenChange={setSearchModalOpen}
        searchMode="EQUITY"
        placeholder="Search equities..."
        onSelectStock={(stock) => {
          handleSelectStock(stock);
          setSearchModalOpen(false);
        }}
      />

      <div
        className="h-[calc(100dvh-6rem)] md:h-[calc(100vh-2rem)] min-h-0 max-w-full overflow-hidden bg-background"
        style={{ touchAction: 'none' }}
      >
        <AdaptiveTradeLayout
          desktopLeft={watchlistNode}
          desktopLeftWidth="300px"
          desktopCenter={
            <div className={`relative h-full min-h-0 ${chartPanelClass}`}>
              {chartNode}
              {isDesktop && showOrderForm && selectedStock && selectedSymbol ? (
                <div className="absolute right-4 top-16 z-50 w-[340px] animate-in fade-in slide-in-from-right-8 duration-200">
                  <div className={`relative ${tileClass} shadow-2xl`}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-2 z-10 h-7 w-7 rounded-full bg-slate-100/80 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.12]"
                      onClick={() => setShowOrderForm(false)}
                    >
                      <span className="sr-only">Close</span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="lucide lucide-x"
                      >
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                    </Button>
                    <div className="h-auto max-h-[80vh] overflow-y-auto rounded-lg">
                      <EquityTradingForm
                        selectedStock={selectedStock}
                        onStockSelect={handleSelectStock}
                        instruments={currentInstruments}
                        onOpenSearch={() => setSearchModalOpen(true)}
                      />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          }
          tabletTop={mobileChartNode}
          tabletLeft={tabletWatchlistNode}
          tabletRight={tabletOrderNode}
          mobileContent={mobileMainNode}
          mobileOrderTitle={selectedStock ? `${selectedStock.symbol} equity order ticket` : "Equity order ticket"}
          mobileOrderOpen={mobileOrderOpen}
          onMobileOrderOpenChange={setMobileOrderOpen}
          mobileOrderDrawer={mobileOrderDrawerNode}
          footer={<BottomBar />}
        />
      </div>
    </>
  );
}
