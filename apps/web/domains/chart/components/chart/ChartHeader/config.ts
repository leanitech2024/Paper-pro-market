import { ChartStyle } from '@/domains/chart/stores/analysis.store';

export const ranges = ['5Y', '1Y', '6M', '3M', '1M', '5D', '1D'];

export const rangeToTimeframe: Record<string, string> = {
  '1D': '1m',
  '5D': '5m',
  '1M': '15m',
  '3M': '1h',
  '6M': '1d',
  '1Y': '1d',
  '5Y': '1mo',
};

export type TimeframeItem = { value: string; label: string };
export const timeframeGroups: { label: string; items: TimeframeItem[] }[] = [
  { label: "Minutes", items: [ { value: "1m", label: "1 minute" }, { value: "3m", label: "3 minutes" }, { value: "5m", label: "5 minutes" }, { value: "10m", label: "10 minutes" }, { value: "15m", label: "15 minutes" }, { value: "30m", label: "30 minutes" } ] },
  { label: "Hours", items: [ { value: "1h", label: "1 hour" }, { value: "2h", label: "2 hours" }, { value: "3h", label: "3 hours" }, { value: "4h", label: "4 hours" } ] },
  { label: "Days", items: [ { value: "1d", label: "1 day" }, { value: "1w", label: "1 week" }, { value: "1mo", label: "1 month" } ] },
];

export const styleLabels: Record<ChartStyle, string> = {
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

export const styleGroups: ChartStyle[][] = [
  ["BARS", "CANDLE", "HOLLOW_CANDLES", "VOLUME_CANDLES"],
  ["LINE", "LINE_WITH_MARKERS", "STEP_LINE"],
  ["AREA", "HLC_AREA", "BASELINE"],
  ["COLUMNS", "HIGH_LOW"],
  ["HEIKIN_ASHI"],
] as const;
