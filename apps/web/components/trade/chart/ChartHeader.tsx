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
  Eye,
  EyeOff
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
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
    isInstantOrderActive, 
    onToggleInstantOrder,
    onUndo,
    onRedo,
    onScreenshot,
    onMaximize,
    onSearchClick,
    onChartStyleChange,
    isLoading = false,
    isFullscreen = false
}: ChartHeaderProps) {
  const { range, setRange, timeframe, setTimeframe } = useAnalysisStore();
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
    timeframeGroups.flatMap((group) => group.items).find((item) => item.value === effectiveTimeframe)?.label || "1 minute";
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
          group.filter((style) => styleLabels[style].toLowerCase().includes(styleSearch.toLowerCase()))
        )
        .filter((group) => group.length > 0)
    : styleGroups;

  return (
    <div
      className={cn(
        "z-30 shrink-0 border-b border-slate-200/80 bg-white/95 p-1.5 flex items-center justify-between gap-2 dark:border-white/[0.08] dark:bg-[#0c1322]/95",
        compact ? "h-auto" : "h-11 md:h-11",
      )}
    >
      {/* Scrollable Container for Mobile, standard for Desktop */}
      <div className="flex h-full items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden w-full md:w-auto">
        {/* Symbol Search Trigger */}
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
          <span className="uppercase text-[10px] md:text-sm">{headerText}</span>
          <span className="hidden md:inline-block text-[10px] text-slate-500 bg-slate-100 px-1 rounded-sm border border-slate-200 dark:text-slate-300 dark:bg-[#10192b] dark:border-white/[0.08]">
            NSE
          </span>
        </Button>

        <Separator orientation="vertical" className="h-4 bg-slate-200/70 mx-0.5 shrink-0 dark:bg-white/[0.08]" />

        {/* Buy/Sell Buttons - Now using Tailwind hidden for mobile */}
        <div className="hidden md:flex items-center gap-1 shrink-0">
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

        <Separator orientation="vertical" className="hidden md:block h-4 bg-slate-200/70 mx-0.5 shrink-0 dark:bg-white/[0.08]" />

        {/* Range Selector (Mobile Dropdown) */}
        <div className="md:hidden flex items-center shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-[10px] text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
                <span>{range}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[120px] grid grid-cols-2 gap-1 p-2">
              {ranges.map((r) => (
                <DropdownMenuItem
                  key={r}
                  onClick={() => {
                    setRange(r);
                    const mapped = rangeToTimeframe[r];
                    if (mapped) setTimeframe(mapped);
                  }}
                  className={`text-xs justify-center flex cursor-pointer ${
                    range === r ? "bg-blue-600/10 font-medium text-blue-500 dark:text-blue-400" : ""
                  }`}
                >
                  {r}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Range Selector (Desktop Inline list) */}
        <div className="hidden md:flex items-center shrink-0">
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-[10px] md:text-xs text-slate-600 hover:text-slate-900 transition-none dark:text-slate-400 dark:hover:text-slate-100">
                <span className="hidden sm:inline-block">{activeTimeframeLabel}</span>
                <span className="sm:hidden">{effectiveTimeframe.toUpperCase()}</span>
              </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 bg-white border-slate-200/80 max-h-[60vh] overflow-y-auto overscroll-contain md:max-h-none dark:bg-[#0c1322] dark:border-white/[0.08]">
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
        </DropdownMenu>

        <Separator orientation="vertical" className="h-4 bg-border/50 mx-0.5 shrink-0" />

        {/* Chart Style (Visible on both) */}
        <div className="flex items-center shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-[10px] md:text-xs text-slate-500 hover:text-slate-900 transition-none dark:text-slate-400 dark:hover:text-slate-100">
                <CandlestickChart className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span className="hidden sm:inline-block">{styleLabels[chartStyle]}</span>
              </Button>
            </DropdownMenuTrigger>
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
                            if (chartStyle === style) {
                              onChartStyleChange?.("CANDLE");
                              return;
                            }
                            onChartStyleChange?.(style);
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
          </DropdownMenu>

          {/* Indicators */}
          <IndicatorsMenu symbol={symbol} />
        </div>
      </div>

      {/* Right Section - Desktop Only Settings */}
      <div className="hidden md:flex items-center gap-1 shrink-0 ml-auto">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100" onClick={onUndo}>
              <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100" onClick={onRedo}>
              <Redo2 className="h-4 w-4" />
          </Button>
          
          <Separator orientation="vertical" className="h-4 bg-border/50 mx-1" />

          {/* Hide Options Dropdown */}
          <HideOptionsDropdown symbol={symbol} />
          
           <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100" onClick={onScreenshot}>
              <Camera className="h-4 w-4" />
          </Button>
           <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100" onClick={onMaximize}>
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
      </div>
    </div>
  );
}

function HideOptionsDropdown({ symbol }: { symbol: string }) {
  const globalHideState = useAnalysisStore((s) => s.globalHideState);
  const setGlobalHide = useAnalysisStore((s) => s.setGlobalHide);
  const hideAll = useAnalysisStore((s) => s.hideAll);
  const showAll = useAnalysisStore((s) => s.showAll);

  const anyHidden = Object.values(globalHideState).some(Boolean);
  const items = [
    { key: "drawings" as const, label: "Hide Drawings" },
    { key: "indicators" as const, label: "Hide Indicators" },
    { key: "positions" as const, label: "Hide Positions & Orders" },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 gap-1.5 px-2 text-[10px] md:text-xs font-medium border border-transparent",
            anyHidden
              ? "text-slate-900 bg-slate-100 border-slate-200 dark:text-white dark:bg-white/[0.08] dark:border-white/[0.08]"
              : "text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-white/[0.06]",
          )}
        >
          {anyHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          <span className="hidden md:inline">Hide</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 bg-white border-slate-200/80 dark:bg-[#0c1322] dark:border-white/[0.08]">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-slate-500/70 dark:text-slate-400/70">
          Hide Options
        </DropdownMenuLabel>
        {items.map((item) => (
          <DropdownMenuItem
            key={item.key}
            onSelect={(event) => event.preventDefault()}
            onClick={() => setGlobalHide(item.key, !globalHideState[item.key])}
            className={cn(
              "text-xs cursor-pointer flex items-center gap-2",
              globalHideState[item.key] && "bg-slate-100 text-slate-900 dark:bg-white/[0.08] dark:text-white",
            )}
          >
            {globalHideState[item.key] ? (
              <EyeOff className="h-3.5 w-3.5 text-slate-500" />
            ) : (
              <Eye className="h-3.5 w-3.5 text-blue-500" />
            )}
            <span className="flex-1">{item.label}</span>
            <span className="text-[10px] text-slate-400">{globalHideState[item.key] ? "On" : "Off"}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="bg-slate-200/70 dark:bg-white/[0.08]" />
        <DropdownMenuItem
          onClick={() => hideAll(symbol)}
          className="text-xs cursor-pointer text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10"
        >
          Hide All
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => showAll(symbol)}
          className="text-xs cursor-pointer text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10"
        >
          Show All
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
