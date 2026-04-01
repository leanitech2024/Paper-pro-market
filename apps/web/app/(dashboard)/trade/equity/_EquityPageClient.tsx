"use client";

import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { EquityTradeForm } from "@/components/trade/EquityTradeForm";
import { Stock } from "@paper-market/core";
import { useMarketStore } from "@/stores/trading/market.store";
import { useWalletStore } from "@/stores/wallet.store";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GlobalSearchModal } from "@/components/trade/search/GlobalSearchModal";
import { WatchlistPanel } from "@/components/trade/watchlist/WatchlistPanel";
import { AdaptiveTradeLayout } from "@/components/trade/layout/AdaptiveTradeLayout";
import { useTradeViewport } from "@/hooks/use-trade-viewport";
import { PositionsTable } from "@/components/positions/PositionsTable";
import { BottomBar } from "@/components/trade/options/BottomBar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronLeft, Search } from "lucide-react";

const CandlestickChartComponent = dynamic(
  () => import("@/components/trade/CandlestickChart").then((mod) => ({ default: mod.CandlestickChart })),
  { ssr: false },
);

function formatBalance(value: number): string {
  if (!Number.isFinite(value)) return "--";
  return `INR ${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function formatPrice(value?: number): string {
  if (!Number.isFinite(value) || Number(value) <= 0) return "--";
  return Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}

function formatChangePercent(value?: number): string {
  if (!Number.isFinite(value)) return "--";
  const v = Number(value);
  return `${v > 0 ? "+" : ""}${v.toFixed(2)}%`;
}

const panelClass =
  "rounded-[28px] border border-slate-200/80 bg-white dark:border-white/[0.08] dark:bg-[#0c1322]";
const chartPanelClass =
  "rounded-none border border-slate-200/80 bg-white dark:border-white/[0.08] dark:bg-[#0c1322]";
const tileClass =
  "rounded-[24px] border border-slate-200/80 bg-white dark:border-white/[0.08] dark:bg-[#0f1728]";
const headerBorderClass = "border-b border-slate-200/80 dark:border-white/[0.08]";

export default function EquityPage({ initialSymbol }: { initialSymbol?: string }) {
  const { isMobile, isDesktop } = useTradeViewport();
  const router = useRouter();
  const { data: session } = useSession();
  const { getCurrentInstruments, stocksBySymbol } = useMarketStore();
  const walletBalance = useWalletStore((state) => state.balance);

  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [mobileOrderOpen, setMobileOrderOpen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<"watchlist" | "chart">("watchlist");
  const hasAutoSelectedInitialStockRef = useRef(false);

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

  useEffect(() => {
    if (selectedSymbol) {
      hasAutoSelectedInitialStockRef.current = true;
      return;
    }
    if (hasAutoSelectedInitialStockRef.current) return;
    if (currentInstruments.length === 0) return;
    if (isMobile) return;

    const first = currentInstruments[0];
    setSelectedSymbol(first.symbol);
    setSelectedFallback(first);
    hasAutoSelectedInitialStockRef.current = true;
  }, [currentInstruments, isMobile, selectedSymbol]);

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

  const handleSelectStock = (stock: Stock) => {
    setSelectedSymbol(stock.symbol);
    setSelectedFallback(stock);
    if (isMobile) setMobilePanel("chart");
  };

  const handleClearSelection = () => {
    setSelectedSymbol(null);
    setSelectedFallback(null);
  };

  const navigateFromProfile = (path: string) => {
    router.push(path);
  };

  const chartNode = (
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
  );

  const watchlistNode = (
    <div className="h-full">
      <WatchlistPanel
        instruments={currentInstruments}
        selectedSymbol={selectedSymbol ?? undefined}
        onSelect={handleSelectStock}
        onOpenSearch={() => setSearchModalOpen(true)}
        onClearSelection={handleClearSelection}
      />
    </div>
  );

  const orderPanelNode = selectedStock ? (
    <div className="h-full min-h-0 overflow-y-auto">
      <EquityTradeForm
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
  );

  const tabletWatchlistNode = (
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
  );

  const tabletOrderNode = (
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
  );

  const mobileChartNode = (
    <div className="h-full min-h-0 bg-transparent p-2 pb-3">
      <div className={`h-full min-h-0 overflow-hidden ${chartPanelClass} shadow-sm`}>
        {chartNode}
      </div>
    </div>
  );

  const mobileWatchlistNode = (
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
  );

  const mobileChartNodeWithHeader = (
    <div className="h-full min-h-0 bg-transparent p-2 pb-3">
      <div className={`h-full min-h-0 overflow-hidden ${panelClass} shadow-sm`}>
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
  );

  const mobileMainNode = mobilePanel === "watchlist" ? mobileWatchlistNode : mobileChartNodeWithHeader;

  // Removed mobileTopBarNode as per user request

  const mobileOrderDrawerNode = (
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
  );

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

      <div className="h-[calc(100dvh-6rem)] md:h-[calc(100vh-2rem)] min-h-0 overflow-hidden bg-background">
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
                      <EquityTradeForm
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

