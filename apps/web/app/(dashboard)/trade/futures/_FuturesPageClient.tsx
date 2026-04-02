"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { GlobalSearchModal } from "@/components/trade/search/GlobalSearchModal";
import { FuturesTradeForm } from "@/components/trade/FuturesTradeForm";
import { ChartLoadingIndicator } from "@/components/trade/chart/ChartLoadingIndicator";
import { Stock } from "@paper-market/core";
import { symbolToIndexInstrumentKey } from "@paper-market/core";
import { AdaptiveTradeLayout } from "@/components/trade/layout/AdaptiveTradeLayout";
import { PositionsCards } from "@/components/trade/mobile/PositionsCards";
import { cn } from "@/lib/utils";
import { useMarketStore } from "@/stores/trading/market.store";
import { BottomBar } from "@/components/trade/options/BottomBar";
import { Search } from "lucide-react";

const CandlestickChartComponent = dynamic(
  () =>
    import("@/components/trade/CandlestickChart").then((mod) => ({
      default: mod.CandlestickChart,
    })),
  {
    loading: () => <ChartLoadingIndicator />,
    ssr: false,
  },
);

function normalizeKey(value: string): string {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function resolveUnderlyingName(stock: Stock): string {
  const raw = String(stock.name || stock.symbol || "").trim();
  if (!raw) return "";

  const key = normalizeKey(raw);
  if (key.includes("NIFTYBANK")) return "BANKNIFTY";
  if (key.includes("NIFTYFINSERVICE")) return "FINNIFTY";
  if (key.includes("MIDCPNIFTY") || key.includes("MIDCAP")) return "MIDCAP";
  if (key.includes("NIFTY50") || key === "NIFTY") return "NIFTY";
  if (key.includes("SENSEX")) return "SENSEX";

  return raw.toUpperCase();
}

function isIndexUnderlying(value: string): boolean {
  const key = normalizeKey(value);
  return (
    key === "NIFTY" ||
    key === "BANKNIFTY" ||
    key === "FINNIFTY" ||
    key === "SENSEX" ||
    key === "MIDCAP" ||
    key === "MIDCPNIFTY"
  );
}

async function fetchFuturesContracts(underlying: string): Promise<Stock[]> {
  const params = new URLSearchParams({
    underlying,
    instrumentType: "FUTURE",
  });

  const res = await fetch(`/api/v1/instruments/derivatives?${params.toString()}`, {
    cache: "no-store",
  });
  const payload = await res.json();
  return payload?.data?.instruments || [];
}

function formatLtp(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "--";
  return value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPct(value: number): string {
  if (!Number.isFinite(value)) return "--";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatExpiryShort(value: unknown): string {
  if (!value) return "No expiry";
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return "No expiry";
  return parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

const panelClass =
  "rounded-none border border-slate-200/80 bg-white dark:border-white/[0.08] dark:bg-[#0c1322]";
const headerBorderClass = "border-b border-slate-200/80 dark:border-white/[0.08]";

export default function FuturesPage() {
  const [currentInstruments, setCurrentInstruments] = useState<Stock[]>([]);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [isBootstrappingDefault, setIsBootstrappingDefault] = useState(true);
  const [mobileOrderOpen, setMobileOrderOpen] = useState(false);
  const quotesByInstrument = useMarketStore((state) => state.quotesByInstrument);
  const selectQuote = useMarketStore((state) => state.selectQuote);
  const selectPrice = useMarketStore((state) => state.selectPrice);
  const livePrice = useMarketStore((state) => state.livePrice);

  const liveTokenPrice = useMemo(() => {
    const token = selectedStock?.instrumentToken;
    if (!token) return 0;
    const price = Number(quotesByInstrument[token]?.price);
    return Number.isFinite(price) && price > 0 ? price : 0;
  }, [quotesByInstrument, selectedStock?.instrumentToken]);

  const liveSymbolPrice = useMemo(() => {
    const symbol = selectedStock?.symbol;
    if (!symbol) return 0;
    const price = Number(selectPrice(symbol));
    return Number.isFinite(price) && price > 0 ? price : 0;
  }, [selectPrice, selectedStock?.symbol]);

  const liveTokenChange = useMemo(() => {
    const token = selectedStock?.instrumentToken;
    if (!token) return Number.NaN;
    const change = Number(quotesByInstrument[token]?.changePercent);
    return Number.isFinite(change) ? change : Number.NaN;
  }, [quotesByInstrument, selectedStock?.instrumentToken]);

  const liveSymbolChange = useMemo(() => {
    const symbol = selectedStock?.symbol;
    if (!symbol) return Number.NaN;
    const change = Number(selectQuote(symbol)?.changePercent);
    return Number.isFinite(change) ? change : Number.NaN;
  }, [selectQuote, selectedStock?.symbol]);

  useEffect(() => {
    if (selectedStock) {
      setIsBootstrappingDefault(false);
      return;
    }

    let cancelled = false;
    setIsBootstrappingDefault(true);

    const loadDefaultNiftyFuture = async () => {
      try {
        const contracts = await fetchFuturesContracts("NIFTY");
        if (cancelled || contracts.length === 0) return;

        const defaultContract = contracts[0];
        setCurrentInstruments(contracts);
        setSelectedStock((prev) => prev ?? defaultContract);
      } catch {
        if (!cancelled) {
          setCurrentInstruments([]);
        }
      } finally {
        if (!cancelled) {
          setIsBootstrappingDefault(false);
        }
      }
    };

    loadDefaultNiftyFuture();

    return () => {
      cancelled = true;
    };
  }, [selectedStock]);

  useEffect(() => {
    if (!selectedStock) {
      setCurrentInstruments([]);
      return;
    }

    let cancelled = false;
    const underlying = resolveUnderlyingName(selectedStock);

    const loadSiblingContracts = async () => {
      const contracts = await fetchFuturesContracts(underlying);

      if (cancelled) return;

      setCurrentInstruments(contracts);
      if (!selectedStock.instrumentToken) return;

      const exact = contracts.find(
        (item) => item.instrumentToken === selectedStock.instrumentToken,
      );
      if (exact && exact.symbol !== selectedStock.symbol) {
        setSelectedStock(exact);
      }
    };

    loadSiblingContracts().catch(() => {
      if (!cancelled) {
        setCurrentInstruments([]);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [selectedStock]);

  const chartBinding = useMemo(() => {
    const headerSymbol = selectedStock?.symbol || "FUTURES";
    if (!selectedStock) {
      return {
        symbol: "NIFTY",
        instrumentKey: symbolToIndexInstrumentKey("NIFTY") || undefined,
        headerSymbol,
      };
    }

    const underlying = resolveUnderlyingName(selectedStock);
    if (isIndexUnderlying(underlying)) {
      return {
        symbol: underlying,
        instrumentKey: symbolToIndexInstrumentKey(underlying) || undefined,
        headerSymbol,
      };
    }

    return {
      symbol: selectedStock.symbol || underlying,
      instrumentKey: selectedStock.instrumentToken || undefined,
      headerSymbol,
    };
  }, [selectedStock]);

  const renderOrderNode = (sheetMode = false) => (
    <FuturesTradeForm
      selectedStock={selectedStock}
      onStockSelect={setSelectedStock}
      instruments={currentInstruments}
      onOpenSearch={() => setSearchModalOpen(true)}
      isBootstrapping={isBootstrappingDefault}
      sheetMode={sheetMode}
    />
  );

  const headerSymbolPrice = useMemo(() => {
    const symbol = selectedStock?.symbol || chartBinding.symbol;
    if (!symbol) return 0;
    const price = Number(selectPrice(symbol));
    return Number.isFinite(price) && price > 0 ? price : 0;
  }, [selectPrice, selectedStock?.symbol, chartBinding.symbol]);

  const headerSymbolChange = useMemo(() => {
    const symbol = selectedStock?.symbol || chartBinding.symbol;
    if (!symbol) return Number.NaN;
    const change = Number(selectQuote(symbol)?.changePercent);
    return Number.isFinite(change) ? change : Number.NaN;
  }, [selectQuote, selectedStock?.symbol, chartBinding.symbol]);

  const displayLtp =
    liveTokenPrice ||
    liveSymbolPrice ||
    headerSymbolPrice ||
    livePrice ||
    Number(selectedStock?.price || 0);
  const fallbackChange = Number(selectedStock?.changePercent || 0);
  const displayChange = Number.isFinite(liveTokenChange)
    ? liveTokenChange
    : Number.isFinite(liveSymbolChange)
    ? liveSymbolChange
    : Number.isFinite(headerSymbolChange)
    ? headerSymbolChange
    : fallbackChange;

  const chartNode = (
    <div className="relative h-full min-h-0 flex-1">
      <div className="absolute inset-0">
        <CandlestickChartComponent
          symbol={chartBinding.symbol}
          headerSymbol={chartBinding.headerSymbol}
          instrumentKey={chartBinding.instrumentKey}
          onSearchClick={() => setSearchModalOpen(true)}
        />
      </div>
    </div>
  );

  const mobileContentNode = (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className={`shrink-0 ${headerBorderClass} bg-white/95 backdrop-blur dark:bg-[#0c1322]/95`}>
        <div className="space-y-2 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setSearchModalOpen(true)}
              className="inline-flex h-9 min-w-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-[11px] font-semibold text-slate-700 dark:border-white/[0.08] dark:bg-[#10192b] dark:text-slate-100"
            >
              <Search className="h-3.5 w-3.5 text-slate-500 dark:text-slate-300" />
              <span className="truncate uppercase">{selectedStock?.symbol || "FUTURES"}</span>
            </button>
            <div className="flex flex-col items-end">
              <span className="text-[11px] font-semibold tabular-nums text-slate-950 dark:text-slate-100">
                {formatLtp(displayLtp)}
              </span>
              <span
                className={cn(
                  "text-[10px] font-semibold",
                  Number.isFinite(displayChange) && displayChange >= 0
                    ? "text-emerald-600 dark:text-emerald-300"
                    : "text-rose-600 dark:text-rose-300",
                )}
              >
                {formatPct(displayChange)}
              </span>
            </div>
          </div>

          <div className="flex items-end justify-between gap-3">
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
              {formatExpiryShort(selectedStock?.expiryDate)}
            </span>

            <div className="flex items-center gap-1.5 pb-1">
              <button
                type="button"
                onClick={() => setMobileOrderOpen(true)}
                className="h-9 rounded-md bg-emerald-600 px-3 text-xs font-bold text-white shadow-sm"
              >
                BUY
              </button>
              <button
                type="button"
                onClick={() => setMobileOrderOpen(true)}
                className="h-9 rounded-md bg-rose-600 px-3 text-xs font-bold text-white shadow-sm"
              >
                SELL
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 p-2 pb-3">
        <div className={`h-full min-h-0 overflow-hidden ${panelClass}`}>
          <div className="h-full min-h-0">{chartNode}</div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <GlobalSearchModal
        open={searchModalOpen}
        onOpenChange={setSearchModalOpen}
        searchMode="FUTURE"
        placeholder="Search futures contracts..."
        onSelectStock={(stock) => {
          setSelectedStock(stock);
          setSearchModalOpen(false);
        }}
      />

      <div className="h-[calc(100dvh-6rem)] md:h-[calc(100vh-32px)] min-h-0 overflow-hidden bg-background">
        <AdaptiveTradeLayout
          desktopLeft={<div className="h-full min-h-0">{renderOrderNode(true)}</div>}
          desktopLeftWidth="280px"
          desktopCenter={<div className={`flex h-full min-h-0 flex-col ${panelClass}`}>{chartNode}</div>}
          tabletTop={<div className={`flex h-full min-h-0 flex-col ${panelClass}`}>{chartNode}</div>}
          tabletLeft={<div className="h-full min-h-0">{renderOrderNode(true)}</div>}
          tabletRight={<PositionsCards instrumentFilter="futures" />}
          mobileContent={mobileContentNode}
          mobileOrderTitle={selectedStock ? `${selectedStock.symbol} futures order ticket` : "Futures order ticket"}
          mobileOrderOpen={mobileOrderOpen}
          onMobileOrderOpenChange={setMobileOrderOpen}
          mobileOrderDrawer={renderOrderNode(true)}
          footer={<BottomBar />}
        />
      </div>
    </>
  );
}
