import { IndicatorType } from "@/domains/chart/stores/analysis.store";

export interface IndicatorDef {
  type: IndicatorType;
  label: string;
  params?: Array<{ key: string; label: string; min?: number; step?: number }>;
}

export interface IndicatorCategory {
  name: string;
  items: IndicatorDef[];
}

export const CATEGORIES: IndicatorCategory[] = [
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

export const ALL_LABELS: Record<string, string> = {};
CATEGORIES.forEach((cat) => cat.items.forEach((item) => { ALL_LABELS[item.type] = item.label; }));
