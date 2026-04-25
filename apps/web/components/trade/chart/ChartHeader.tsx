"use client";

import { useState } from 'react';
import { ChartStyle, useAnalysisStore } from '@/stores/trading/analysis.store';
import { IndicatorsMenu } from './IndicatorsMenu';
import { Button } from '@/components/ui/button';
import {
  Search,
  Camera,
  Maximize,
  Minimize2,
  Undo2,
  Redo2,
  CandlestickChart,
  ChevronDown,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { resolveToolIcon } from './toolbar/toolIcons';
import { MOBILE_HEADER_MENUS } from './toolbar/toolConfig';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ChartHeaderProps {
  symbol: string;
  displaySymbol?: string;
  chartStyle?: ChartStyle;
  compact?: boolean;
  isInstantOrderActive: boolean;
  onToggleInstantOrder: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onScreenshot?: () => void;
  onMaximize?: () => void;
  onSearchClick?: () => void;
  onChartStyleChange?: (style: ChartStyle) => void;
  isLoading?: boolean;
  isFullscreen?: boolean;
}

export function ChartHeader({
  symbol,
  displaySymbol,
  chartStyle = "CANDLE",
  compact = false,
  isInstantOrderActive: _isInstantOrderActive,
  onToggleInstantOrder: _onToggleInstantOrder,
  onUndo,
  onRedo,
  onScreenshot,
  onMaximize,
  onSearchClick,
  onChartStyleChange,
  isLoading = false,
  isFullscreen = false,
}: ChartHeaderProps) {
  const {
    range,
    setRange,
    timeframe,
    setTimeframe,
    activeTool,
    setActiveTool,
    clearAllDrawings,
  } = useAnalysisStore();
  const headerText = displaySymbol || symbol;
  const [styleSearch, setStyleSearch] = useState("");

  const ranges = ['5Y', '1Y', '6M', '3M', '1M', '5D', '1D'];
  const rangeToTimeframe: Record<string, string> = {
    '1D': '1m',
    '5D': '5m',
    '1M': '15m',
    '3M': '1h',
    '6M': '1d',
    '1Y': '1d',
    '5Y': '1mo',
  };

  type TimeframeItem = { value: string; label: string };
  const timeframeGroups: { label: string; items: TimeframeItem[] }[] = [
    {
      label: "Minutes",
      items: [
        { value: "1m", label: "1 minute" },
        { value: "3m", label: "3 minutes" },
        { value: "5m", label: "5 minutes" },
        { value: "10m", label: "10 minutes" },
        { value: "15m", label: "15 minutes" },
        { value: "30m", label: "30 minutes" },
      ],
    },
    {
      label: "Hours",
      items: [
        { value: "1h", label: "1 hour" },
        { value: "2h", label: "2 hours" },
        { value: "3h", label: "3 hours" },
        { value: "4h", label: "4 hours" },
      ],
    },
    {
      label: "Days",
      items: [
        { value: "1d", label: "1 day" },
        { value: "1w", label: "1 week" },
        { value: "1mo", label: "1 month" },
      ],
    },
  ];

  const effectiveTimeframe = range ? rangeToTimeframe[range] || timeframe : timeframe;
  const activeTimeframeLabel =
    timeframeGroups.flatMap((g) => g.items).find((item) => item.value === effectiveTimeframe)?.label || "1 minute";

  const styleLabels = {
    BARS: "Bars",
    CANDLE: "Candles",
    HOLLOW_CANDLES: "Hollow candles",
    VOLUME_CANDLES: "Volume candles",
    LINE: "Line",
    LINE_WITH_MARKERS: "Line with markers",
    STEP_LINE: "Step line",
    AREA: "Area",
    HLC_AREA: "HLC area",
    BASELINE: "Baseline",
    COLUMNS: "Columns",
    HIGH_LOW: "High-low",
    HEIKIN_ASHI: "Heikin Ashi",
  } as const;

  const styleGroups = [
    ["BARS", "CANDLE", "HOLLOW_CANDLES", "VOLUME_CANDLES"],
    ["LINE", "LINE_WITH_MARKERS", "STEP_LINE"],
    ["AREA", "HLC_AREA", "BASELINE"],
    ["COLUMNS", "HIGH_LOW"],
    ["HEIKIN_ASHI"],
  ] as const;

  const filteredStyleGroups = styleSearch.trim()
    ? styleGroups
        .map((group) =>
          group.filter((style) =>
            styleLabels[style].toLowerCase().includes(styleSearch.toLowerCase()),
          ),
        )
        .filter((group) => group.length > 0)
    : styleGroups;

  // ─── Shared dropdown content components ──────────────────────────────────

  const timeframeDropdownContent = (
    <DropdownMenuContent
      align="start"
      className="w-56 bg-white border-slate-200/80 max-h-[60vh] overflow-y-auto overscroll-contain md:max-h-none dark:bg-[#0c1322] dark:border-white/[0.08]"
    >
      {timeframeGroups.map((group, groupIndex) => (
        <div key={group.label}>
          {groupIndex > 0 ? <DropdownMenuSeparator className="bg-border/50" /> : null}
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-slate-500/70 dark:text-slate-400/70">
            {group.label}
          </DropdownMenuLabel>
          {group.items.map((item) => (
            <DropdownMenuItem
              key={item.value}
              onClick={() => {
                setTimeframe(item.value);
                setRange("");
              }}
              className={cn(
                "text-xs cursor-pointer text-slate-700 dark:text-slate-300 data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900 dark:data-[highlighted]:bg-white/[0.06] dark:data-[highlighted]:text-white",
                effectiveTimeframe === item.value &&
                  "bg-blue-600/10 font-medium text-blue-500 dark:text-blue-400 data-[highlighted]:bg-blue-600/10 data-[highlighted]:text-blue-500 dark:data-[highlighted]:text-blue-400",
              )}
            >
              {item.label}
            </DropdownMenuItem>
          ))}
        </div>
      ))}
    </DropdownMenuContent>
  );

  const styleDropdownContent = (
    <DropdownMenuContent
      align="start"
      className="w-72 max-h-[420px] overflow-y-auto p-0 bg-white border-slate-200/80 dark:bg-[#0c1322] dark:border-white/[0.08]"
      style={{ scrollbarWidth: "thin" }}
    >
      <div className="sticky top-0 z-10 bg-white/95 border-b border-slate-200/80 p-2 dark:bg-[#0c1322]/95 dark:border-white/[0.08]">
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search chart styles..."
            className="h-7 text-xs pl-7 pr-2"
            value={styleSearch}
            onChange={(e) => setStyleSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="p-1.5 space-y-1">
        {filteredStyleGroups.map((group, groupIndex) => (
          <div key={group.join("-")}>
            {groupIndex > 0 ? <div className="h-px bg-slate-200/70 dark:bg-white/[0.08] my-1" /> : null}
            <div className="space-y-0.5">
              {group.map((style) => (
                <button
                  key={style}
                  onClick={() => {
                    onChartStyleChange?.(chartStyle === style ? "CANDLE" : style);
                  }}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-xs transition-colors ${
                    chartStyle === style
                      ? "bg-blue-600/10 text-blue-500 dark:text-blue-400"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/[0.06] dark:hover:text-white"
                  }`}
                >
                  <span>{styleLabels[style]}</span>
                  {chartStyle === style && (
                    <span className="text-[9px] text-blue-500/70 font-medium">ACTIVE</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
        {filteredStyleGroups.length === 0 && (
          <div className="text-center text-xs text-slate-500 py-4 dark:text-slate-400">
            No styles match "{styleSearch}"
          </div>
        )}
      </div>
      <div className="border-t border-slate-200/70 dark:border-white/[0.08] mx-1.5" />
      <div className="p-1.5 space-y-0.5">
        <div className="px-2 pt-1 pb-0.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400/70">
          Advanced
        </div>
        {["Renko", "Line break", "Kagi", "Point & figure"].map((label) => (
          <div
            key={label}
            className="px-2 py-1.5 rounded text-xs text-slate-400 cursor-not-allowed dark:text-slate-500/60"
          >
            {label}
          </div>
        ))}
      </div>
    </DropdownMenuContent>
  );

  // ─── MOBILE layout ────────────────────────────────────────────────────────
  // Two rows:
  //  Row 1 — symbol pill | range pill strip (scrollable) | timeframe chip | candle-style icon
  //  Row 2 — icon-only tool-category buttons (scrollable)

  const mobileLayout = (
    <div className="flex w-full flex-col border-b border-slate-200/80 bg-white/95 backdrop-blur-sm dark:border-white/[0.08] dark:bg-[#0c1322]/95 md:hidden">
      {/* ── Row 1: Symbol + controls ── */}
      <div className="flex items-center gap-1.5 px-2 pb-1.5 pt-2">
        {/* Symbol */}
        <button
          onClick={onSearchClick}
          disabled={isLoading}
          className="flex h-8 max-w-[40vw] shrink-0 items-center gap-1.5 rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 px-2.5 shadow-[0_6px_16px_rgba(15,23,42,0.06)] transition-transform active:scale-95 disabled:opacity-60 dark:border-white/[0.08] dark:bg-[#10192b] dark:shadow-none"
        >
          {isLoading ? (
            <div className="h-3.5 w-3.5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          ) : (
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200/70 dark:bg-white/[0.08]">
              <Search className="h-3 w-3 text-slate-500 dark:text-slate-400" />
            </div>
          )}
          <span className="truncate text-[11px] font-bold uppercase tracking-[0.14em] text-slate-800 dark:text-slate-100">
            {headerText}
          </span>
        </button>

        {/* Range pill strip — horizontal scroll */}
        <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [touch-action:pan-x] [overscroll-behavior-x:contain] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
          <div className="flex items-center gap-1 pr-1">
            {ranges.map((r) => (
              <button
                key={r}
                onClick={() => {
                  setRange(r);
                  const mapped = rangeToTimeframe[r];
                  if (mapped) setTimeframe(mapped);
                }}
                className={cn(
                  "h-8 shrink-0 whitespace-nowrap rounded-xl px-2.5 text-[11px] font-semibold tracking-[0.08em] transition-colors",
                  range === r
                    ? "bg-blue-600/15 text-blue-600 ring-1 ring-blue-500/20 dark:text-blue-300 dark:ring-blue-400/20"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-slate-200",
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Timeframe */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-8 shrink-0 items-center gap-1 rounded-xl border border-slate-200/80 bg-slate-50 px-2.5 text-[10px] font-semibold tracking-[0.12em] text-slate-600 transition-transform active:scale-95 dark:border-white/[0.08] dark:bg-[#10192b] dark:text-slate-300">
              <span>{effectiveTimeframe.toUpperCase()}</span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </button>
          </DropdownMenuTrigger>
          {timeframeDropdownContent}
        </DropdownMenu>

        {/* Chart style icon */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50 text-slate-500 transition-transform active:scale-95 dark:border-white/[0.08] dark:bg-[#10192b] dark:text-slate-400">
              <CandlestickChart className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          {styleDropdownContent}
        </DropdownMenu>

        {/* Indicators */}
        <IndicatorsMenu symbol={symbol} />
      </div>

      {/* ── Row 2: Tool category icon buttons ── */}
      <div
        className="flex items-center gap-1.5 overflow-x-auto overscroll-x-contain border-t border-slate-200/70 px-2 pb-2 pt-1.5 [scrollbar-width:none] [touch-action:pan-x] [-webkit-overflow-scrolling:touch] dark:border-white/[0.06] [&::-webkit-scrollbar]:hidden"
      >
        {MOBILE_HEADER_MENUS.map((menu) => {
          const MenuIcon = resolveToolIcon(menu.icon);
          const activeMenuItem = menu.items.find(
            (item) => item.kind === "tool" && item.id === activeTool,
          );
          const ActiveIcon = resolveToolIcon(activeMenuItem?.icon || menu.icon);
          const isMenuActive = Boolean(activeMenuItem);

          return (
            <DropdownMenu key={menu.id}>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "flex h-12 min-w-[3.4rem] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border px-1.5 transition-all active:scale-95",
                    isMenuActive
                      ? "border-blue-500/40 bg-blue-600/10 text-blue-500 shadow-[0_8px_18px_rgba(59,130,246,0.18)] dark:border-blue-400/30 dark:text-blue-400 dark:shadow-none"
                      : "border-slate-200/70 bg-slate-50 text-slate-500 dark:border-white/[0.08] dark:bg-[#10192b] dark:text-slate-400",
                  )}
                >
                  {isMenuActive ? (
                    <ActiveIcon className="h-4 w-4" />
                  ) : (
                    <MenuIcon className="h-4 w-4" />
                  )}
                  <span className="max-w-full truncate text-center text-[9px] font-semibold leading-none tracking-[0.08em]">
                    {menu.label}
                  </span>
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="start"
                className="w-[260px] max-w-[calc(100vw-20px)] max-h-[65vh] overflow-y-auto overscroll-contain bg-white border-slate-200/80 p-1.5 dark:bg-[#0c1322] dark:border-white/[0.08]"
              >
                <div className="px-2 py-1.5 mb-0.5 flex items-center gap-2 border-b border-slate-100 dark:border-white/[0.06]">
                  <MenuIcon className="h-4 w-4 text-blue-500 dark:text-blue-400 shrink-0" />
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {menu.label}
                  </span>
                </div>
                <div className="space-y-0.5 pt-1">
                  {menu.items.map((item) => {
                    const Icon = resolveToolIcon(item.icon);
                    const isActive = item.kind === "tool" && activeTool === item.id;
                    return (
                      <DropdownMenuItem
                        key={item.id}
                        // onClick instead of onSelect: prevents swipe-to-select on mobile.
                        // Radix onSelect fires on pointer-enter when sliding finger over items.
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.kind === "action") {
                            clearAllDrawings(symbol);
                            return;
                          }
                          setActiveTool(item.id);
                        }}
                        className={cn(
                          "cursor-pointer gap-2.5 rounded px-2 py-2.5 text-xs transition-colors text-slate-700 dark:text-slate-300 data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900 dark:data-[highlighted]:bg-white/[0.06] dark:data-[highlighted]:text-white",
                          isActive &&
                            "bg-blue-600/10 font-medium text-blue-500 dark:text-blue-400 data-[highlighted]:bg-blue-600/10 data-[highlighted]:text-blue-500 dark:data-[highlighted]:text-blue-400",
                          item.kind === "action" &&
                            "text-rose-600 dark:text-rose-400 data-[highlighted]:text-rose-600 dark:data-[highlighted]:text-rose-400",
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        {isActive && (
                          <span className="text-[9px] font-semibold uppercase tracking-wider opacity-60">
                            ✓
                          </span>
                        )}
                      </DropdownMenuItem>
                    );
                  })}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        })}
      </div>
    </div>
  );

  // ─── DESKTOP layout ───────────────────────────────────────────────────────

  const desktopLayout = (
    <div
      className={cn(
        "hidden md:flex z-30 shrink-0 border-b border-slate-200/80 bg-white/95 px-1.5 items-center justify-between gap-2 dark:border-white/[0.08] dark:bg-[#0c1322]/95",
        compact ? "h-auto py-1.5" : "h-11",
      )}
    >
      <div className="flex h-full items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex-1 min-w-0">
        {/* Symbol */}
        <Button
          variant="ghost"
          size="sm"
          disabled={isLoading}
          className="h-8 gap-1.5 px-2 text-slate-700 font-medium border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-70 shrink-0 dark:border-white/[0.08] dark:bg-[#10192b] dark:text-slate-100 dark:hover:bg-white/[0.08]"
          onClick={onSearchClick}
        >
          {isLoading ? (
            <div className="h-3.5 w-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          ) : (
            <Search className="h-3.5 w-3.5 text-slate-500 dark:text-slate-300" />
          )}
          <span className="text-sm">{headerText}</span>
          <span className="text-[10px] text-slate-500 bg-slate-100 px-1 rounded-sm border border-slate-200 dark:text-slate-300 dark:bg-[#10192b] dark:border-white/[0.08]">
            NSE
          </span>
        </Button>

        <Separator orientation="vertical" className="h-4 bg-slate-200/70 mx-0.5 shrink-0 dark:bg-white/[0.08]" />

        {/* Desktop Buy/Sell */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="sm"
            className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-600/90 text-white text-[10px] font-bold uppercase transition-transform active:scale-95"
            onClick={() => window.triggerTrade?.('BUY')}
          >
            Buy
          </Button>
          <Button
            size="sm"
            className="h-7 px-2.5 bg-rose-600 hover:bg-rose-600/90 text-white text-[10px] font-bold uppercase transition-transform active:scale-95"
            onClick={() => window.triggerTrade?.('SELL')}
          >
            Sell
          </Button>
        </div>

        <Separator orientation="vertical" className="h-4 bg-slate-200/70 mx-0.5 shrink-0 dark:bg-white/[0.08]" />

        {/* Desktop range inline */}
        <div className="flex items-center shrink-0">
          {ranges.map((r) => (
            <button
              key={r}
              onClick={() => {
                setRange(r);
                const mapped = rangeToTimeframe[r];
                if (mapped) setTimeframe(mapped);
              }}
              className={`px-2 h-7 text-xs font-semibold rounded-sm transition-colors uppercase ${
                range === r
                  ? 'text-blue-500 bg-blue-600/10 dark:text-blue-400'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-white/[0.06]'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <Separator orientation="vertical" className="h-4 bg-slate-200/70 mx-0.5 shrink-0 dark:bg-white/[0.08]" />

        {/* Desktop timeframe */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs text-slate-600 hover:text-slate-900 transition-none dark:text-slate-400 dark:hover:text-slate-100">
              {activeTimeframeLabel}
            </Button>
          </DropdownMenuTrigger>
          {timeframeDropdownContent}
        </DropdownMenu>

        <Separator orientation="vertical" className="h-4 bg-border/50 mx-0.5 shrink-0" />

        {/* Desktop chart style */}
        <div className="flex items-center shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs text-slate-500 hover:text-slate-900 transition-none dark:text-slate-400 dark:hover:text-slate-100">
                <CandlestickChart className="h-4 w-4" />
                {styleLabels[chartStyle]}
              </Button>
            </DropdownMenuTrigger>
            {styleDropdownContent}
          </DropdownMenu>

          {/* Indicators */}
          <IndicatorsMenu symbol={symbol} />
        </div>
      </div>

      {/* Desktop right actions */}
      <div className="flex items-center gap-1 shrink-0 ml-auto">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100" onClick={onUndo}>
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100" onClick={onRedo}>
          <Redo2 className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="h-4 bg-border/50 mx-1" />
        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100" onClick={onScreenshot}>
          <Camera className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100" onClick={onMaximize}>
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {mobileLayout}
      {desktopLayout}
    </>
  );
}
