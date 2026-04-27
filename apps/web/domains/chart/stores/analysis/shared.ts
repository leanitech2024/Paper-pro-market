import type {
  ArrowDrawing,
  BrushDrawing,
  ChartStyle,
  Drawing,
  HorizontalLineDrawing,
  IndicatorConfig,
  IndicatorType,
  MultiPointDrawing,
  Point,
  PositionDrawing,
  SinglePointLineDrawing,
  SymbolAnalysisState,
  TextDrawing,
  ThreePointDrawing,
  TwoPointDrawing,
} from "./types";

let fallbackIdCounter = 0;

export const nowId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `local-${Date.now()}-${++fallbackIdCounter}`;

export const createSymbolState = (): SymbolAnalysisState => ({
  indicators: [],
  drawings: [],
  redoStack: [],
});

const DEFAULT_COLORS: Record<IndicatorType, string> = {
  SMA: "#FFA500",
  EMA: "#2196F3",
  RSI: "#E91E63",
  MACD: "#2962FF",
  VOL: "#64748B",
  VOLPROFILE: "#64748B",
  BB: "#22D3EE",
  VWAP: "#F59E0B",
  ATR: "#8B5CF6",
  SUPERTREND: "#10B981",
  ICHIMOKU: "#E040FB",
  PSAR: "#FF9800",
  ADX: "#00BCD4",
  STOCH: "#FF5722",
  STOCHRSI: "#795548",
  CCI: "#607D8B",
  WILLR: "#9C27B0",
  ROC: "#3F51B5",
  AO: "#4CAF50",
  MFI: "#CDDC39",
  TRIX: "#FF4081",
  KST: "#00E676",
  KC: "#18FFFF",
  OBV: "#FFD740",
  FORCE: "#B388FF",
  PIVOT: "#FF6E40",
};

const DEFAULT_PARAMS: Record<IndicatorType, Record<string, number>> = {
  SMA: { period: 20 },
  EMA: { period: 20 },
  RSI: { period: 14 },
  MACD: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
  VOL: {},
  VOLPROFILE: {},
  BB: { period: 20, stdDev: 2 },
  VWAP: {},
  ATR: { period: 14 },
  SUPERTREND: { period: 10, multiplier: 3 },
  ICHIMOKU: { conversionPeriod: 9, basePeriod: 26, spanPeriod: 52, displacement: 26 },
  PSAR: { step: 0.02, max: 0.2 },
  ADX: { period: 14 },
  STOCH: { period: 14, signalPeriod: 3 },
  STOCHRSI: { rsiPeriod: 14, stochasticPeriod: 14, kPeriod: 3, dPeriod: 3 },
  CCI: { period: 20 },
  WILLR: { period: 14 },
  ROC: { period: 12 },
  AO: { fastPeriod: 5, slowPeriod: 34 },
  MFI: { period: 14 },
  TRIX: { period: 18 },
  KST: {},
  KC: { maPeriod: 20, atrPeriod: 10 },
  OBV: {},
  FORCE: { period: 13 },
  PIVOT: {},
};

const DEFAULT_MACD_COLORS = {
  macd: "#2962FF",
  signal: "#FF6D00",
  histogram: "#26a69a",
};

export const isChartStyle = (value: unknown): value is ChartStyle =>
  value === "BARS" ||
  value === "CANDLE" ||
  value === "HOLLOW_CANDLES" ||
  value === "VOLUME_CANDLES" ||
  value === "LINE" ||
  value === "LINE_WITH_MARKERS" ||
  value === "STEP_LINE" ||
  value === "AREA" ||
  value === "HLC_AREA" ||
  value === "BASELINE" ||
  value === "COLUMNS" ||
  value === "HIGH_LOW" ||
  value === "HEIKIN_ASHI";

export const makeDefaultIndicator = (
  type: IndicatorType
): Omit<IndicatorConfig, "id"> => ({
  type,
  source: "close",
  params: { ...DEFAULT_PARAMS[type] },
  display: {
    color: DEFAULT_COLORS[type],
    lineWidth: 2,
    visible: true,
  },
  seriesColors: type === "MACD" ? { ...DEFAULT_MACD_COLORS } : undefined,
});

export function normalizeIndicator(
  input: Omit<IndicatorConfig, "id">
): Omit<IndicatorConfig, "id"> {
  const base = makeDefaultIndicator(input.type);
  return {
    ...base,
    ...input,
    params: {
      ...base.params,
      ...(input.params || {}),
    },
    display: {
      ...base.display,
      ...(input.display || {}),
    },
    seriesColors:
      input.type === "MACD"
        ? {
            ...DEFAULT_MACD_COLORS,
            ...(input.seriesColors || {}),
          }
        : undefined,
  };
}

export const toggleId = (list: string[], id: string) =>
  list.includes(id) ? list.filter((item) => item !== id) : [...list, id];

const validPoint = (point: unknown): Point | null => {
  if (!point || typeof point !== "object") return null;
  const time = Number((point as any).time);
  const price = Number((point as any).price);
  if (!Number.isFinite(time) || !Number.isFinite(price)) return null;
  return { time, price };
};

const TWO_POINT_TYPES = new Set<string>([
  "trendline", "ray", "rectangle", "extended-line", "info-line", "trend-angle",
  "fib-retracement", "fib-extension", "fib-channel", "fib-time-zone",
  "fib-speed-fan", "fib-time-extension", "fib-circles", "fib-spiral",
  "fib-speed-arcs", "fib-wedge", "pitchfan",
  "gann-box", "gann-square-fixed", "gann-square", "gann-fan",
  "regression-trend", "flat-top-bottom", "disjoint-channel",
  "rotated-rectangle", "ellipse", "circle", "curve", "double-curve",
  "price-range", "date-range", "date-price-range",
  "cyclic-lines", "time-cycles",
  "forecast", "bars-pattern", "ghost-feed",
]);

const THREE_POINT_TYPES = new Set<string>([
  "pitchfork", "schiff-pitchfork", "modified-schiff-pitchfork", "inside-pitchfork",
  "parallel-channel", "triangle-shape",
]);

const MULTI_POINT_TYPES = new Set<string>([
  "xabcd-pattern", "cypher-pattern", "head-shoulders", "abcd-pattern",
  "triangle-pattern", "three-drives-pattern",
  "elliott-impulse", "elliott-correction", "elliott-triangle",
  "elliott-double-combo", "elliott-triple-combo",
  "polyline", "path",
]);

const TEXT_TYPES = new Set<string>([
  "text", "anchored-text", "note", "anchored-note", "callout",
  "comment", "price-label", "signpost", "flag-mark",
]);

const ARROW_TYPES = new Set<string>([
  "arrow-marker", "arrow-up", "arrow-down", "arrow-left", "arrow-right",
]);

const SINGLE_POINT_LINE_TYPES = new Set<string>([
  "vertical-line", "cross-line", "horizontal-ray",
]);

export function normalizeDrawing(input: any): Drawing | null {
  if (!input || typeof input !== "object" || typeof input.type !== "string") return null;

  const base = {
    id: typeof input.id === "string" ? input.id : nowId(),
    visible: input.visible !== false,
    locked: input.locked === true,
    groupId: typeof input.groupId === "string" ? input.groupId : undefined,
    zIndex: Number.isFinite(Number(input.zIndex)) ? Number(input.zIndex) : undefined,
  };

  const drawingType: string = input.type;

  if (drawingType === "horizontal-line") {
    const price = Number(input.price);
    if (!Number.isFinite(price)) return null;
    return { ...base, type: "horizontal-line", price } as HorizontalLineDrawing;
  }

  if (SINGLE_POINT_LINE_TYPES.has(drawingType)) {
    const point = validPoint(input.point);
    if (!point) return null;
    return { ...base, type: drawingType, point } as SinglePointLineDrawing;
  }

  if (TWO_POINT_TYPES.has(drawingType)) {
    const p1 = validPoint(input.p1);
    const p2 = validPoint(input.p2);
    if (!p1 || !p2) return null;
    return {
      ...base,
      type: drawingType,
      p1,
      p2,
      fibLevels: Array.isArray(input.fibLevels) ? input.fibLevels : undefined,
      measurerStats: input.measurerStats || undefined,
    } as TwoPointDrawing;
  }

  if (THREE_POINT_TYPES.has(drawingType)) {
    const p1 = validPoint(input.p1);
    const p2 = validPoint(input.p2);
    const p3 = validPoint(input.p3);
    if (!p1 || !p2 || !p3) return null;
    return { ...base, type: drawingType, p1, p2, p3 } as ThreePointDrawing;
  }

  if (MULTI_POINT_TYPES.has(drawingType)) {
    const points = Array.isArray(input.points)
      ? input.points.map(validPoint).filter((point: Point | null): point is Point => Boolean(point))
      : [];
    if (points.length < 2) return null;
    return {
      ...base,
      type: drawingType,
      points,
      labels: Array.isArray(input.labels) ? input.labels : undefined,
    } as MultiPointDrawing;
  }

  if (drawingType === "long-position" || drawingType === "short-position") {
    const entry = Number(input.entryPrice);
    const target = Number(input.targetPrice);
    const stop = Number(input.stopPrice);
    const entryTime = Number(input.entryTime);
    const endTime = Number(input.endTime) || entryTime + 20 * 60 * 1000;
    if (![entry, target, stop, entryTime].every(Number.isFinite)) return null;
    return {
      ...base,
      type: drawingType,
      entryPrice: entry,
      targetPrice: target,
      stopPrice: stop,
      entryTime,
      endTime: Number.isFinite(endTime) ? endTime : entryTime + 20 * 60 * 1000,
      quantity: Number.isFinite(Number(input.quantity)) ? Number(input.quantity) : undefined,
    } as PositionDrawing;
  }

  if (drawingType === "brush" || drawingType === "highlighter") {
    const points = Array.isArray(input.points)
      ? input.points.map(validPoint).filter((point: Point | null): point is Point => Boolean(point))
      : [];
    if (points.length < 2) return null;
    return {
      ...base,
      type: drawingType,
      points,
      strokeWidth: Number.isFinite(Number(input.strokeWidth)) ? Number(input.strokeWidth) : 2,
      opacity: Number.isFinite(Number(input.opacity))
        ? Number(input.opacity)
        : drawingType === "highlighter"
          ? 0.3
          : 1,
    } as BrushDrawing;
  }

  if (ARROW_TYPES.has(drawingType)) {
    const point = validPoint(input.point);
    if (!point) return null;
    return { ...base, type: drawingType, point } as ArrowDrawing;
  }

  if (TEXT_TYPES.has(drawingType)) {
    const point = validPoint(input.point);
    if (!point) return null;
    return {
      ...base,
      type: drawingType,
      point,
      text: typeof input.text === "string" ? input.text : "",
    } as TextDrawing;
  }

  return null;
}

export function normalizeSymbolStateRecord(
  raw: unknown
): Record<string, SymbolAnalysisState> {
  if (!raw || typeof raw !== "object") return {};

  const next: Record<string, SymbolAnalysisState> = {};
  for (const [symbol, value] of Object.entries(raw as Record<string, any>)) {
    const indicators = Array.isArray(value?.indicators)
      ? value.indicators
          .map((item: any) => {
            const type = item?.type as IndicatorType | undefined;
            if (!type || !(type in DEFAULT_COLORS)) return null;
            const normalized = normalizeIndicator({
              type,
              source: item?.source || "close",
              params: {
                ...(item?.params || {}),
                ...(Number.isFinite(Number(item?.period))
                  ? { period: Number(item.period) }
                  : {}),
              },
              display: {
                color: item?.display?.color || item?.color || DEFAULT_COLORS[type],
                lineWidth: Number(item?.display?.lineWidth ?? item?.lineWidth ?? 2),
                visible: item?.display?.visible ?? item?.visible ?? true,
              },
              seriesColors: item?.seriesColors,
            });
            return {
              ...normalized,
              id: typeof item?.id === "string" ? item.id : nowId(),
            } as IndicatorConfig;
          })
          .filter((item: IndicatorConfig | null): item is IndicatorConfig => Boolean(item))
      : [];

    const drawings = Array.isArray(value?.drawings)
      ? value.drawings
          .map((drawing: any) => normalizeDrawing(drawing))
          .filter((drawing: Drawing | null): drawing is Drawing => Boolean(drawing))
      : [];

    const redoStack = Array.isArray(value?.redoStack)
      ? value.redoStack
          .map((drawing: any) => normalizeDrawing(drawing))
          .filter((drawing: Drawing | null): drawing is Drawing => Boolean(drawing))
      : [];

    next[symbol] = {
      indicators,
      drawings,
      redoStack,
      chartStyle: isChartStyle(value?.chartStyle) ? value.chartStyle : undefined,
    };
  }

  return next;
}
