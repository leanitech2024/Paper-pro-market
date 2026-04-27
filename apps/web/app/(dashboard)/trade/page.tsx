"use client";

import { useCallback, useState, useEffect, Suspense, useMemo } from "react";
import dynamic from "next/dynamic";
import { EquityTradingForm } from "@/domains/trading/components/equity/equity-trading-form";
import { Stock } from "@paper-market/core";
import { useMarketStore } from "@/domains/market/stores/market.store";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { WatchlistPanel } from "@/domains/watchlist/components/watchlist/WatchlistPanel";
import { PositionsTable } from "@/domains/trading/components/positions/PositionsTable";
import { toCanonicalSymbol } from "@paper-market/core";
import { AdaptiveTradeLayout } from "@/domains/trading/components/layout/AdaptiveTradeLayout";
import { PositionsCards } from "@/domains/trading/components/mobile/PositionsCards";
import { useTradeViewport } from "@/domains/trading/hooks/use-trade-viewport";
import { useSearchStore } from "@/domains/watchlist/stores/search.store";

const CandlestickChartComponent = dynamic(
  () => import("@/domains/chart/components/CandlestickChart").then((mod) => ({ default: mod.CandlestickChart })),
  { ssr: false },
);

export default function TradePage() {
  const { isMobile, isDesktop } = useTradeViewport();
  const stocks = useMarketStore((state) => state.stocks);
  const stocksBySymbol = useMarketStore((state) => state.stocksBySymbol);

  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [selectedFallback, setSelectedFallback] = useState<Stock | null>(null);
  const openSearch = useSearchStore((state) => state.openSearch);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [mobileOrderOpen, setMobileOrderOpen] = useState(false);

  const selectedStock = useMemo(() => {
    if (!selectedSymbol) return null;
    return stocksBySymbol[selectedSymbol] || selectedFallback;
  }, [selectedSymbol, selectedFallback, stocksBySymbol]);

  useEffect(() => {
    if (!selectedSymbol) return;
    if (!stocksBySymbol[selectedSymbol]) return;
    if (selectedFallback?.symbol !== selectedSymbol) return;
    setSelectedFallback(null);
  }, [selectedSymbol, selectedFallback, stocksBySymbol]);

  useEffect(() => {
    if (selectedSymbol) {
      localStorage.setItem("lastTradeSymbol", selectedSymbol);
    }
  }, [selectedSymbol]);

  const handleOpenSearch = () => {
    openSearch({
      onSelect: (stock) => {
        handleSelectStock(stock);
        useSearchStore.getState().closeSearch();
      }
    });
  };

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

  const handleSelectStock = useCallback((stock: Stock) => {
    setSelectedSymbol(toCanonicalSymbol(stock.symbol));
    setSelectedFallback(stock);
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedSymbol(null);
    setSelectedFallback(null);
  }, []);

  const chartNode = useMemo(() => (
    <div className="h-full w-full bg-card/50">
      {selectedSymbol ? (
        <Suspense fallback={<Skeleton className="h-full w-full" />}>
          <div className="h-full w-full">
            <CandlestickChartComponent
              symbol={selectedSymbol}
              instrumentKey={selectedStock?.instrumentToken}
              onSearchClick={handleOpenSearch}
            />
          </div>
        </Suspense>
      ) : (
        <div className="h-full overflow-auto p-4">
          <PositionsTable />
        </div>
      )}
    </div>
  ), [selectedSymbol, selectedStock, isMobile, showOrderForm, isDesktop]);

  const watchlistNode = useMemo(() => (
    <div className="h-full">
      <WatchlistPanel
        instruments={stocks}
        selectedSymbol={selectedSymbol ?? undefined}
        onSelect={handleSelectStock}
        onOpenSearch={handleOpenSearch}
        onClearSelection={handleClearSelection}
      />
    </div>
  ), [stocks, selectedSymbol, handleSelectStock, handleClearSelection]);

  const orderPanelNode = useMemo(() => (
    selectedStock ? (
      <div className="h-full min-h-0 overflow-y-auto">
        <EquityTradingForm selectedStock={selectedStock} onStockSelect={handleSelectStock} instruments={stocks} sheetMode />
      </div>
    ) : (
      <div className="flex h-full items-center justify-center p-4 text-xs text-slate-500">Select a stock to place an order.</div>
    )
  ), [selectedStock, stocks, handleSelectStock]);

  return (
    <>
      <div className="h-full min-h-0 overflow-hidden">
        <AdaptiveTradeLayout
          desktopLeft={watchlistNode}
          desktopLeftWidth="360px"
          desktopCenter={
            <div className="relative h-full min-h-0">
              {chartNode}
              {isDesktop && showOrderForm && selectedStock && selectedSymbol ? (
                <div className="absolute right-4 top-16 z-50 w-[340px] animate-in fade-in slide-in-from-right-8 duration-200">
                  <div className="relative rounded-lg border border-border bg-card shadow-2xl">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-2 z-10 h-7 w-7 rounded-full bg-background/70 hover:bg-background"
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
                      <EquityTradingForm selectedStock={selectedStock} onStockSelect={handleSelectStock} instruments={stocks} />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          }
          tabletTop={chartNode}
          tabletLeft={watchlistNode}
          tabletRight={orderPanelNode}
          mobileTabs={[
            { id: "chart", label: "Chart", content: chartNode, keepMounted: true },
            { id: "watchlist", label: "Watchlist", content: watchlistNode },
            { id: "order", label: "Order", onSelect: () => setMobileOrderOpen(true) },
            { id: "positions", label: "Positions", content: <PositionsCards instrumentFilter="equity" /> },
          ]}
          mobileDefaultTab="chart"
          mobileOrderOpen={mobileOrderOpen}
          onMobileOrderOpenChange={setMobileOrderOpen}
          mobileOrderDrawer={orderPanelNode}
        />
      </div>
    </>
  );
}
