"use client";

import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TerminalHeader } from "@/domains/trading/components/options/TerminalHeader";
import { OptionChainTable } from "@/domains/trading/components/options/OptionChainTable";
import { OrderPanel } from "@/domains/trading/components/options/OrderPanel";
import { EmptyPanel } from "@/domains/trading/components/options/EmptyPanel";
import { StrategyBuilderPanel } from "@/domains/trading/components/options/StrategyBuilderPanel";
import { BottomBar } from "@/domains/trading/components/options/BottomBar";
import { OptionChainRow } from "@/domains/trading/components/options/types";
import { Stock } from "@paper-market/core";
import { useMarketStore } from "@/domains/market/stores/market.store";
import { AdaptiveTradeLayout } from "@/domains/trading/components/layout/AdaptiveTradeLayout";
import { PositionsCards } from "@/domains/trading/components/mobile/PositionsCards";
import { useTradeViewport } from "@/domains/trading/hooks/use-trade-viewport";
import { useSearchStore } from "@/domains/watchlist/stores/search.store";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

type TradeMode = "single" | "strategy";
type MobileView = "chain" | "positions" | "strategy";

function normalizeKey(v: string): string {
  return String(v || "").trim().toUpperCase().replace(/\s+/g, "");
}

function toDateKey(raw: Date | string | undefined): string {
  if (!raw) return "";
  const d = raw instanceof Date ? raw : new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function buildOptionChainKey(symbol: string, expiry?: string): string {
  const s = String(symbol || "").trim().toUpperCase();
  const e = toDateKey(expiry);
  return `${s}::${e || "NEAREST"}`;
}

function resolveUnderlying(stock: Stock): string {
  const key = normalizeKey(String(stock.name || stock.symbol || ""));
  if (key === "NIFTY" || key === "NIFTY50" || key === "NIFTY_50") return "NIFTY";
  if (key === "BANKNIFTY" || key === "NIFTYBANK") return "BANKNIFTY";
  if (key === "FINNIFTY" || key === "NIFTYFINSERVICE") return "FINNIFTY";
  if (key === "SENSEX") return "SENSEX";
  if (key === "MIDCAP" || key === "MIDCPNIFTY") return "MIDCAP";
  return key;
}

function getDaysToExpiry(dateKey: string): number | null {
  if (!dateKey) return null;
  const now = new Date();
  const exp = new Date(`${dateKey}T15:30:00+05:30`);
  if (Number.isNaN(exp.getTime())) return null;
  return Math.ceil((exp.getTime() - now.getTime()) / 86_400_000);
}

function formatExpiryChip(dateKey: string): string {
  if (!dateKey) return "--";
  const date = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateKey;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function formatLtp(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "--";
  return value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPct(value: number): string {
  if (!Number.isFinite(value)) return "--";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

const panelClass =
  "rounded-none border border-slate-200/80 bg-white dark:border-white/[0.08] dark:bg-[#0c1322]";
const headerBorderClass = "border-b border-slate-200/80 dark:border-white/[0.08]";

function OptionsPageContent() {
  const searchParams = useSearchParams();
  const { isMobile } = useTradeViewport();
  const openSearch = useSearchStore((state) => state.openSearch);

  const [underlying, setUnderlying] = useState("NIFTY");
  const [selectedExpiry, setSelectedExpiry] = useState("");
  const [selectedContract, setSelectedContract] = useState<Stock | null>(null);
  const [initialSide, setInitialSide] = useState<"BUY" | "SELL">("BUY");
  const [mode, setMode] = useState<TradeMode>("single");
  const [mobileOrderOpen, setMobileOrderOpen] = useState(false);
  const [mobileView, setMobileView] = useState<MobileView>("chain");
  const skipResetRef = useRef(false);

  useEffect(() => {
    const requestedUnderlying = String(searchParams.get("underlying") || "").trim().toUpperCase();
    if (!requestedUnderlying) return;
    setUnderlying(requestedUnderlying);
  }, [searchParams]);

  useEffect(() => {
    if (skipResetRef.current) {
      skipResetRef.current = false;
      return;
    }
    setSelectedExpiry("");
    setSelectedContract(null);
  }, [underlying]);

  const fetchOptionChain = useMarketStore((s) => s.fetchOptionChain);
  const chainKey = useMemo(
    () => buildOptionChainKey(underlying, selectedExpiry || undefined),
    [selectedExpiry, underlying],
  );
  const optionChain = useMarketStore((s) => s.optionChainByKey[chainKey] || null);
  const isFetching = useMarketStore(
    (s) => s.isFetchingChain && s.fetchingOptionChainKey === chainKey,
  );
  const selectPrice = useMarketStore((s) => s.selectPrice);
  const selectQuote = useMarketStore((s) => s.selectQuote);

  const expiries = useMemo(() => optionChain?.expiries ?? [], [optionChain?.expiries]);

  useEffect(() => {
    if (expiries.length === 0) {
      return;
    }
    if (!selectedExpiry || !expiries.includes(selectedExpiry)) setSelectedExpiry(expiries[0]);
  }, [expiries, selectedExpiry]);

  useEffect(() => {
    if (!optionChain?.expiry) return;
    if (!selectedExpiry) {
      setSelectedExpiry(optionChain.expiry);
    }
  }, [optionChain?.expiry, selectedExpiry]);

  useEffect(() => {
    if (!underlying) return;
    const timer = window.setTimeout(() => {
      fetchOptionChain(underlying, selectedExpiry || undefined).catch(() => undefined);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [fetchOptionChain, selectedExpiry, underlying]);

  const chainRows = useMemo<OptionChainRow[]>(() => {
    const strikes = optionChain?.strikes || [];
    return (strikes as Array<Record<string, unknown>>)
      .map((item) => ({
        strike: Number(item.strike || 0),
        ce: item.ce
          ? {
              symbol: String((item.ce as Record<string, unknown>).symbol || ""),
              instrumentToken: String((item.ce as Record<string, unknown>).instrumentToken || ""),
              lotSize: Number((item.ce as Record<string, unknown>).lotSize || 0),
              ltp: Number((item.ce as Record<string, unknown>).ltp || 0),
              oi: Number((item.ce as Record<string, unknown>).oi || 0),
              volume: Number((item.ce as Record<string, unknown>).volume || 0),
            }
          : undefined,
        pe: item.pe
          ? {
              symbol: String((item.pe as Record<string, unknown>).symbol || ""),
              instrumentToken: String((item.pe as Record<string, unknown>).instrumentToken || ""),
              lotSize: Number((item.pe as Record<string, unknown>).lotSize || 0),
              ltp: Number((item.pe as Record<string, unknown>).ltp || 0),
              oi: Number((item.pe as Record<string, unknown>).oi || 0),
              volume: Number((item.pe as Record<string, unknown>).volume || 0),
            }
          : undefined,
      }))
      .filter((r) => Number.isFinite(r.strike) && r.strike > 0)
      .sort((a, b) => a.strike - b.strike);
  }, [optionChain?.strikes]);

  const optionTokenBySymbol = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const row of chainRows) {
      const ceToken = row.ce?.instrumentToken;
      const peToken = row.pe?.instrumentToken;
      if (row.ce?.symbol && ceToken) map[row.ce.symbol] = ceToken;
      if (row.pe?.symbol && peToken) map[row.pe.symbol] = peToken;
    }
    return map;
  }, [chainRows]);

  const underlyingQuote = selectQuote(underlying);
  const chainPrice = Number(optionChain?.underlyingPrice || 0);
  const fallbackPrice = Number(selectPrice(underlying) || 0);
  const underlyingPrice =
    (Number.isFinite(chainPrice) && chainPrice > 0 ? chainPrice : fallbackPrice) || 0;

  const chainChange = Number(optionChain?.underlyingChangePercent || 0);
  const quoteChange = Number(underlyingQuote?.changePercent || 0);
  const changePercent =
    Number.isFinite(chainChange) && chainChange !== 0 ? chainChange : quoteChange;

  const atmStrike = useMemo(() => {
    if (!chainRows.length || !Number.isFinite(underlyingPrice) || underlyingPrice <= 0) return null;
    let best = chainRows[0].strike;
    let minD = Math.abs(best - underlyingPrice);
    for (const r of chainRows) {
      const d = Math.abs(r.strike - underlyingPrice);
      if (d < minD) {
        minD = d;
        best = r.strike;
      }
    }
    return best;
  }, [chainRows, underlyingPrice]);

  const daysToExpiry = getDaysToExpiry(selectedExpiry);

  const handleSearchSelect = (stock: Stock) => {
    skipResetRef.current = true;
    setUnderlying(resolveUnderlying(stock));
    const exp = toDateKey(stock.expiryDate);
    if (exp) setSelectedExpiry(exp);
    setSelectedContract(stock);
    setMode("single");
    if (isMobile) setMobileView("chain");
  };

  const handleOpenSearch = () => {
    openSearch({
      mode: "OPTION",
      placeholder: "Search option contracts...",
      onSelect: handleSearchSelect
    });
  };

  const handleSelectChainSymbol = (symbol: string, side: "BUY" | "SELL" = "BUY") => {
    const selectedRow = chainRows.find((r) => r.ce?.symbol === symbol || r.pe?.symbol === symbol);
    if (!selectedRow) return;

    const leg =
      selectedRow.ce?.symbol === symbol
        ? selectedRow.ce
        : selectedRow.pe?.symbol === symbol
        ? selectedRow.pe
        : undefined;
    if (!leg) return;

    const token = leg.instrumentToken || optionTokenBySymbol[symbol];
    if (!token) return;

    let chainLtp = 0;
    for (const rowItem of chainRows) {
      if (rowItem.ce?.symbol === symbol && rowItem.ce.ltp > 0) {
        chainLtp = rowItem.ce.ltp;
        break;
      }
      if (rowItem.pe?.symbol === symbol && rowItem.pe.ltp > 0) {
        chainLtp = rowItem.pe.ltp;
        break;
      }
    }

    const expiryValue = optionChain?.expiry || selectedExpiry;
    const expiryDate = expiryValue ? new Date(`${expiryValue}T00:00:00`) : undefined;
    const contract: Stock = {
      symbol,
      name: symbol,
      price: chainLtp,
      change: 0,
      changePercent: 0,
      volume: 0,
      lotSize: Number(leg.lotSize || 1),
      instrumentToken: token,
      expiryDate,
      strikePrice: Number.isFinite(selectedRow.strike) ? selectedRow.strike : undefined,
      optionType:
        selectedRow.ce?.symbol === symbol
          ? "CE"
          : selectedRow.pe?.symbol === symbol
          ? "PE"
          : undefined,
    };

    const contractWithPrice = chainLtp > 0 ? { ...contract, price: chainLtp } : contract;
    setSelectedContract(contractWithPrice);
    setInitialSide(side);
    setMode("single");
    if (isMobile) setMobileOrderOpen(true);
  };

  const handleModeChange = (nextMode: TradeMode) => {
    setMode(nextMode);
    if (nextMode === "strategy") {
      setSelectedContract(null);
      if (isMobile) setMobileView("strategy");
      return;
    }
    if (isMobile && mobileView === "strategy") setMobileView("chain");
  };

  const renderPanel = (sheetMode = false) => {
    if (mode === "strategy") {
      return (
        <div className="h-full overflow-y-auto">
          <StrategyBuilderPanel
            underlying={underlying}
            expiry={selectedExpiry}
            rows={chainRows}
            spotPrice={underlyingPrice}
            onExecutionComplete={() => undefined}
          />
        </div>
      );
    }

    if (selectedContract) {
      return (
        <OrderPanel
          contract={selectedContract}
          underlyingPrice={underlyingPrice}
          daysToExpiry={daysToExpiry}
          initialSide={initialSide}
          onClose={() => setSelectedContract(null)}
          sheetMode={sheetMode}
        />
      );
    }

    return (
      <EmptyPanel
        underlyingSymbol={underlying}
        atmStrike={atmStrike}
        daysToExpiry={daysToExpiry}
        onSearchClick={handleOpenSearch}
      />
    );
  };

  const headerNode = (
    <TerminalHeader
      underlyingLabel={underlying}
      underlyingPrice={underlyingPrice}
      underlyingChangePercent={changePercent}
      selectedExpiry={selectedExpiry}
      expiries={expiries}
      daysToExpiry={daysToExpiry}
      atmStrike={atmStrike}
      mode={mode}
      onOpenSearch={handleOpenSearch}
      onModeChange={handleModeChange}
      onExpiryChange={setSelectedExpiry}
    />
  );

  const chainNode = (
    <OptionChainTable
      rows={chainRows}
      underlyingPrice={underlyingPrice}
      atmStrike={atmStrike}
      expiryKey={optionChain?.expiry || selectedExpiry || ""}
      chainKey={chainKey}
      optionTokenBySymbol={optionTokenBySymbol}
      selectedSymbol={selectedContract?.symbol || null}
      onSelectSymbol={handleSelectChainSymbol}
      isLoading={isFetching}
    />
  );

  const mobileChainNode = (
    <OptionChainTable
      rows={chainRows}
      underlyingPrice={underlyingPrice}
      atmStrike={atmStrike}
      expiryKey={optionChain?.expiry || selectedExpiry || ""}
      chainKey={chainKey}
      optionTokenBySymbol={optionTokenBySymbol}
      selectedSymbol={selectedContract?.symbol || null}
      onSelectSymbol={handleSelectChainSymbol}
      isLoading={isFetching}
      mobileMode
    />
  );

  const mobileViewNode =
    mobileView === "positions"
      ? <PositionsCards instrumentFilter="options" />
      : mobileView === "strategy"
      ? <div className="h-full min-h-0 overflow-y-auto">{renderPanel(true)}</div>
      : mobileChainNode;

  const mobileContentNode = (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className={`shrink-0 ${headerBorderClass} bg-white/95 backdrop-blur dark:bg-[#0c1322]/95`}>
        <div className="space-y-2 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleOpenSearch}
              className="inline-flex h-9 min-w-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-[11px] font-semibold text-slate-700 dark:border-white/[0.08] dark:bg-[#10192b] dark:text-slate-100"
            >
              <Search className="h-3.5 w-3.5 text-slate-500 dark:text-slate-300" />
              <span className="truncate uppercase">{underlying || "OPTIONS"}</span>
            </button>
            <div className="flex flex-col items-end">
              <span className="text-[11px] font-semibold tabular-nums text-slate-950 dark:text-slate-100">
                {formatLtp(underlyingPrice)}
              </span>
              <span
                className={cn(
                  "text-[10px] font-semibold",
                  changePercent >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300",
                )}
              >
                {formatPct(changePercent)}
              </span>
              {atmStrike ? (
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  ATM {atmStrike.toLocaleString("en-IN")}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex items-center justify-end gap-1.5 pb-1">
            <button
              type="button"
              onClick={() => {
                setMode("single");
                setInitialSide("BUY");
                setMobileOrderOpen(true);
              }}
              className="h-9 rounded-md bg-emerald-600 px-3 text-xs font-bold text-white shadow-sm"
            >
              BUY
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("single");
                setInitialSide("SELL");
                setMobileOrderOpen(true);
              }}
              className="h-9 rounded-md bg-rose-600 px-3 text-xs font-bold text-white shadow-sm"
            >
              SELL
            </button>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {expiries.length === 0 ? (
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Loading expiries...</span>
            ) : (
              expiries.slice(0, 8).map((exp) => {
                const active = exp === selectedExpiry;
                return (
                  <button
                    key={exp}
                    type="button"
                    onClick={() => setSelectedExpiry(exp)}
                    className={cn(
                      "shrink-0 rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                      active
                        ? "border-slate-900 bg-slate-900 text-white dark:border-white/10 dark:bg-white/10 dark:text-slate-100"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/[0.08] dark:bg-[#10192b] dark:text-slate-300",
                    )}
                  >
                    {formatExpiryChip(exp)}
                  </button>
                );
              })
            )}
          </div>

          <div className="relative grid h-9 grid-cols-2 rounded-full bg-slate-100/80 p-1 dark:bg-white/[0.06]">
            <span
              className={cn(
                "absolute inset-y-1 w-[calc(50%-4px)] rounded-full border transition-transform duration-200",
                mode === "single"
                  ? "translate-x-0 border-emerald-500/30 bg-emerald-500/15"
                  : "translate-x-[calc(100%+4px)] border-rose-500/30 bg-rose-500/12",
              )}
            />
            <button
              type="button"
              onClick={() => {
                handleModeChange("single");
                if (mobileView === "strategy") setMobileView("chain");
              }}
              className={cn(
                "relative z-10 h-7 rounded-full text-xs font-semibold transition-colors",
                mode === "single"
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  : "text-slate-500 dark:text-slate-400",
              )}
            >
              Single
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("strategy")}
              className={cn(
                "relative z-10 h-7 rounded-full text-xs font-semibold transition-colors",
                mode === "strategy"
                  ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                  : "text-slate-500 dark:text-slate-400",
              )}
            >
              Strategy
            </button>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto rounded-full bg-slate-100/70 p-1 dark:bg-white/[0.06] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => {
                handleModeChange("single");
                setMobileView("chain");
              }}
              className={cn(
                "h-8 min-w-[74px] rounded-full px-3 text-[11px] font-semibold transition-colors",
                mobileView === "chain"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-[#10192b] dark:text-slate-100"
                  : "text-slate-500 dark:text-slate-400",
              )}
            >
              Chain
            </button>
            <button
              type="button"
              onClick={() => {
                handleModeChange("single");
                setMobileView("positions");
              }}
              className={cn(
                "h-8 min-w-[82px] rounded-full px-3 text-[11px] font-semibold transition-colors",
                mobileView === "positions"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-[#10192b] dark:text-slate-100"
                  : "text-slate-500 dark:text-slate-400",
              )}
            >
              Positions
            </button>
            <button
              type="button"
              onClick={() => setMobileOrderOpen(true)}
              className={cn(
                "h-8 min-w-[70px] rounded-full px-3 text-[11px] font-semibold transition-colors",
                mobileOrderOpen
                  ? "bg-white text-slate-900 shadow-sm dark:bg-[#10192b] dark:text-slate-100"
                  : "text-slate-500 dark:text-slate-400",
              )}
            >
              Order
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 p-2 pb-3">
        <div className={`h-full min-h-0 overflow-hidden ${panelClass}`}>
          {mobileViewNode}
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100dvh-6rem)] md:h-[calc(100vh-32px)] min-h-0 overflow-hidden bg-background">
      <AdaptiveTradeLayout
        header={!isMobile ? headerNode : undefined}
        desktopLeft={undefined}
        desktopCenter={
          <div className={`h-full min-h-0 overflow-hidden ${panelClass}`}>
            {chainNode}
          </div>
        }
        desktopRight={
          <div className={`h-full min-h-0 overflow-hidden ${panelClass}`}>
            <div className="h-full min-h-0 overflow-y-auto">{renderPanel()}</div>
          </div>
        }
        desktopRightWidth="340px"
        tabletTop={
          <div className={`h-full min-h-0 overflow-hidden ${panelClass}`}>
            {chainNode}
          </div>
        }
        tabletLeft={undefined}
        tabletRight={
          <div className={`h-full min-h-0 overflow-hidden ${panelClass}`}>
            <div className="h-full min-h-0 overflow-y-auto">{renderPanel()}</div>
          </div>
        }
        mobileContent={mobileContentNode}
        mobileOrderTitle={`${underlying} options order ticket`}
        mobileOrderOpen={mobileOrderOpen}
        onMobileOrderOpenChange={setMobileOrderOpen}
        mobileOrderDrawer={renderPanel(true)}
        footer={<BottomBar />}
      />
    </div>
  );
}

export default function OptionsPage() {
  return (
    <Suspense fallback={null}>
      <OptionsPageContent />
    </Suspense>
  );
}
