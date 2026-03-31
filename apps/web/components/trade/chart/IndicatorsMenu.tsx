"use client";

import { useMemo, useState } from "react";
import { Settings2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  useAnalysisStore,
  type IndicatorConfig,
  type IndicatorType,
  makeDefaultIndicator,
} from "@/stores/trading/analysis.store";

interface IndicatorsMenuProps {
  symbol: string;
}

// ─── Categorized Indicator Registry ──────────────────────────
interface IndicatorDef {
  type: IndicatorType;
  label: string;
  params?: Array<{ key: string; label: string; min?: number; step?: number }>;
}

interface IndicatorCategory {
  name: string;
  items: IndicatorDef[];
}

const CATEGORIES: IndicatorCategory[] = [
  {
    name: "Trend",
    items: [
      { type: "SMA", label: "SMA", params: [{ key: "period", label: "Period", min: 1 }] },
      { type: "EMA", label: "EMA", params: [{ key: "period", label: "Period", min: 1 }] },
      { type: "VWAP", label: "VWAP" },
      { type: "SUPERTREND", label: "Supertrend", params: [{ key: "period", label: "Period", min: 1 }, { key: "multiplier", label: "Multiplier", min: 0.1, step: 0.1 }] },
      { type: "ICHIMOKU", label: "Ichimoku Cloud", params: [{ key: "conversionPeriod", label: "Conv", min: 1 }, { key: "basePeriod", label: "Base", min: 1 }, { key: "spanPeriod", label: "Span", min: 1 }] },
      { type: "PSAR", label: "Parabolic SAR", params: [{ key: "step", label: "Step", min: 0.001, step: 0.005 }, { key: "max", label: "Max", min: 0.01, step: 0.01 }] },
      { type: "ADX", label: "ADX", params: [{ key: "period", label: "Period", min: 1 }] },
    ],
  },
  {
    name: "Momentum / Oscillator",
    items: [
      { type: "RSI", label: "RSI", params: [{ key: "period", label: "Period", min: 1 }] },
      { type: "MACD", label: "MACD", params: [{ key: "fastPeriod", label: "Fast", min: 1 }, { key: "slowPeriod", label: "Slow", min: 2 }, { key: "signalPeriod", label: "Signal", min: 1 }] },
      { type: "STOCH", label: "Stochastic", params: [{ key: "period", label: "Period", min: 1 }, { key: "signalPeriod", label: "Signal", min: 1 }] },
      { type: "STOCHRSI", label: "Stoch RSI", params: [{ key: "rsiPeriod", label: "RSI", min: 1 }, { key: "stochasticPeriod", label: "Stoch", min: 1 }, { key: "kPeriod", label: "%K", min: 1 }, { key: "dPeriod", label: "%D", min: 1 }] },
      { type: "CCI", label: "CCI", params: [{ key: "period", label: "Period", min: 1 }] },
      { type: "WILLR", label: "Williams %R", params: [{ key: "period", label: "Period", min: 1 }] },
      { type: "ROC", label: "ROC", params: [{ key: "period", label: "Period", min: 1 }] },
      { type: "AO", label: "Awesome Oscillator", params: [{ key: "fastPeriod", label: "Fast", min: 1 }, { key: "slowPeriod", label: "Slow", min: 2 }] },
      { type: "MFI", label: "Money Flow Index", params: [{ key: "period", label: "Period", min: 1 }] },
      { type: "TRIX", label: "TRIX", params: [{ key: "period", label: "Period", min: 1 }] },
      { type: "KST", label: "KST", params: [{ key: "signalPeriod", label: "Signal", min: 1 }] },
    ],
  },
  {
    name: "Volatility",
    items: [
      { type: "BB", label: "Bollinger Bands", params: [{ key: "period", label: "Period", min: 1 }, { key: "stdDev", label: "Std Dev", min: 0.1, step: 0.1 }] },
      { type: "ATR", label: "ATR", params: [{ key: "period", label: "Period", min: 1 }] },
      { type: "KC", label: "Keltner Channels", params: [{ key: "maPeriod", label: "MA", min: 1 }, { key: "atrPeriod", label: "ATR", min: 1 }] },
    ],
  },
  {
    name: "Volume",
    items: [
      { type: "VOL", label: "Volume" },
      { type: "OBV", label: "On Balance Volume" },
      { type: "FORCE", label: "Force Index", params: [{ key: "period", label: "Period", min: 1 }] },
    ],
  },
  {
    name: "Support / Resistance",
    items: [
      { type: "PIVOT", label: "Pivot Points" },
    ],
  },
];

const ALL_LABELS: Record<string, string> = {};
CATEGORIES.forEach((cat) => cat.items.forEach((item) => { ALL_LABELS[item.type] = item.label; }));

// ─── Settings Row ────────────────────────────────────────────
function IndicatorSettingsRow({
  symbol,
  indicator,
  label,
  paramFields,
}: {
  symbol: string;
  indicator: IndicatorConfig;
  label: string;
  paramFields?: Array<{ key: string; label: string; min?: number; step?: number }>;
}) {
  const updateIndicator = useAnalysisStore((s) => s.updateIndicator);
  const removeIndicator = useAnalysisStore((s) => s.removeIndicator);
  const fields = paramFields ?? [];

  return (
    <div className="rounded-md border border-border/50 bg-card/30 p-2 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold text-foreground">{label}</div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => removeIndicator(symbol, indicator.id)}
            className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
            title="Remove"
          >
            <X size={12} />
          </button>
        </div>
      </div>
      {fields.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {fields.map((field) => (
            <div key={field.key} className="flex items-center gap-1">
              <label className="text-[10px] text-muted-foreground whitespace-nowrap">{field.label}</label>
              <Input
                type="number"
                className="h-6 w-12 text-xs px-1 text-center"
                min={field.min ?? 1}
                step={field.step ?? 1}
                value={indicator.params?.[field.key] ?? ""}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (!Number.isFinite(val)) return;
                  updateIndicator(symbol, indicator.id, {
                    params: { ...indicator.params, [field.key]: val },
                  });
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Menu ───────────────────────────────────────────────
export function IndicatorsMenu({ symbol }: IndicatorsMenuProps) {
  const storedIndicators = useAnalysisStore((s) => s.symbolState[symbol]?.indicators);
  const indicators = useMemo(() => storedIndicators ?? [], [storedIndicators]);
  
  const addIndicator = useAnalysisStore((s) => s.addIndicator);
  const removeIndicator = useAnalysisStore((s) => s.removeIndicator);
  const [search, setSearch] = useState("");

  const activeTypes = useMemo(() => new Set(indicators.map((i) => i.type)), [indicators]);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return CATEGORIES;
    const q = search.toLowerCase();
    return CATEGORIES.map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (item) => item.label.toLowerCase().includes(q) || item.type.toLowerCase().includes(q)
      ),
    })).filter((cat) => cat.items.length > 0);
  }, [search]);

  const activeCount = indicators.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <Settings2 size={14} />
          <span className="hidden sm:inline">Indicators</span>
          {activeCount > 0 && (
            <span className="ml-0.5 bg-blue-600/20 text-blue-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {activeCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-72 max-h-[480px] overflow-y-auto p-0"
        style={{ scrollbarWidth: "thin" }}
      >
        {/* Search */}
        <div className="sticky top-0 z-10 bg-popover border-b border-border p-2">
          <div className="relative">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search indicators..."
              className="h-7 text-xs pl-7 pr-2"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Categories */}
        <div className="p-1.5 space-y-1">
          {filteredCategories.map((cat) => (
            <div key={cat.name}>
              <div className="px-2 pt-2 pb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                {cat.name}
              </div>
              <div className="space-y-0.5">
                {cat.items.map((item) => {
                  const isActive = activeTypes.has(item.type);
                  return (
                    <button
                      key={item.type}
                      onClick={() => {
                        if (isActive) {
                          const existing = indicators.find((ind) => ind.type === item.type);
                          if (existing) removeIndicator(symbol, existing.id);
                          return;
                        }
                        const def = makeDefaultIndicator(item.type);
                        if (def) addIndicator(symbol, def);
                      }}
                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-xs transition-colors ${
                        isActive
                          ? "bg-blue-600/10 text-blue-400"
                          : "text-foreground hover:bg-accent/50"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-blue-400" : "bg-transparent"}`} />
                        {item.label}
                      </span>
                      {isActive && (
                        <span className="text-[9px] text-blue-400/70 font-medium">ACTIVE</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {filteredCategories.length === 0 && (
            <div className="text-center text-xs text-muted-foreground py-4">
              No indicators match "{search}"
            </div>
          )}
        </div>

        {/* Active indicator settings */}
        {indicators.length > 0 && (
          <>
            <div className="border-t border-border mx-1.5" />
            <div className="p-1.5 space-y-1.5">
              <div className="px-2 pt-1 pb-0.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Active Settings
              </div>
              {indicators.map((ind) => {
                const def = CATEGORIES.flatMap((c) => c.items).find((d) => d.type === ind.type);
                return (
                  <IndicatorSettingsRow
                    key={ind.id}
                    symbol={symbol}
                    indicator={ind}
                    label={def?.label ?? ind.type}
                    paramFields={def?.params}
                  />
                );
              })}
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
