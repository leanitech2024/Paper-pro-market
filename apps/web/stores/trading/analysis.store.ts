import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Point {
  time: number;
  price: number;
}

// ─── Drawing Types ────────────────────────────────────────────────
export type DrawingType =
  // Lines
  | "trendline" | "ray" | "info-line" | "extended-line" | "trend-angle"
  | "horizontal-line" | "horizontal-ray" | "vertical-line" | "cross-line"
  // Channels
  | "parallel-channel" | "regression-trend" | "flat-top-bottom" | "disjoint-channel"
  // Pitchforks
  | "pitchfork" | "schiff-pitchfork" | "modified-schiff-pitchfork" | "inside-pitchfork"
  // Fibonacci
  | "fib-retracement" | "fib-extension" | "fib-channel" | "fib-time-zone"
  | "fib-speed-fan" | "fib-time-extension" | "fib-circles" | "fib-spiral"
  | "fib-speed-arcs" | "fib-wedge" | "pitchfan"
  // Gann
  | "gann-box" | "gann-square-fixed" | "gann-square" | "gann-fan"
  // Patterns
  | "xabcd-pattern" | "cypher-pattern" | "head-shoulders" | "abcd-pattern"
  | "triangle-pattern" | "three-drives-pattern"
  // Elliott Waves
  | "elliott-impulse" | "elliott-correction" | "elliott-triangle"
  | "elliott-double-combo" | "elliott-triple-combo"
  // Cycles
  | "cyclic-lines" | "time-cycles"
  // Projection
  | "long-position" | "short-position" | "forecast" | "bars-pattern" | "ghost-feed"
  // Measurer
  | "price-range" | "date-range" | "date-price-range"
  // Brushes
  | "brush" | "highlighter"
  // Arrows
  | "arrow-marker" | "arrow-up" | "arrow-down" | "arrow-left" | "arrow-right"
  // Shapes
  | "rectangle" | "rotated-rectangle" | "path" | "circle" | "ellipse"
  | "polyline" | "triangle-shape" | "curve" | "double-curve"
  // Text & Notes
  | "text" | "anchored-text" | "note" | "anchored-note" | "callout"
  | "comment" | "price-label" | "signpost" | "flag-mark";

export type ChartStyle =
  | "BARS"
  | "CANDLE"
  | "HOLLOW_CANDLES"
  | "VOLUME_CANDLES"
  | "LINE"
  | "LINE_WITH_MARKERS"
  | "STEP_LINE"
  | "AREA"
  | "HLC_AREA"
  | "BASELINE"
  | "COLUMNS"
  | "HIGH_LOW"
  | "HEIKIN_ASHI";

export type IndicatorType =
  | "SMA" | "EMA" | "RSI" | "MACD" | "VOL" | "BB" | "VWAP" | "ATR" | "SUPERTREND"
  | "ICHIMOKU" | "PSAR" | "ADX"
  | "STOCH" | "STOCHRSI" | "CCI" | "WILLR" | "ROC" | "AO" | "MFI" | "TRIX" | "KST"
  | "KC"
  | "OBV" | "FORCE" | "VOLPROFILE"
  | "PIVOT";

export type InteractionStatus = "idle" | "drawing" | "dragging" | "box-selecting";
export type ToolType = "cursor" | "crosshair" | "select" | "eraser" | DrawingType;

export interface IndicatorDisplay {
  color: string;
  lineWidth: number;
  visible: boolean;
}

export interface IndicatorConfig {
  id: string;
  type: IndicatorType;
  source: "close" | "open" | "high" | "low";
  params: Record<string, number>;
  display: IndicatorDisplay;
  seriesColors?: {
    macd: string;
    signal: string;
    histogram: string;
  };
}

// ─── Drawing Interfaces ───────────────────────────────────────────
interface BaseDrawing {
  id: string;
  type: DrawingType;
  visible: boolean;
  locked?: boolean;
  groupId?: string;
  zIndex?: number;
}

/** Single price-level drawings: horizontal-line */
export interface HorizontalLineDrawing extends BaseDrawing {
  type: "horizontal-line";
  price: number;
}

/** Single-point price-level: vertical-line, cross-line, horizontal-ray */
export interface SinglePointLineDrawing extends BaseDrawing {
  type: "vertical-line" | "cross-line" | "horizontal-ray";
  point: Point;
}

/** Two-point drawings: trendline, ray, extended-line, info-line, trend-angle, channels, fib, gann, etc. */
export interface TwoPointDrawing extends BaseDrawing {
  type: "trendline" | "ray" | "rectangle" | "extended-line" | "info-line" | "trend-angle"
    | "fib-retracement" | "fib-extension" | "fib-channel" | "fib-time-zone"
    | "fib-speed-fan" | "fib-time-extension" | "fib-circles" | "fib-spiral"
    | "fib-speed-arcs" | "fib-wedge" | "pitchfan"
    | "gann-box" | "gann-square-fixed" | "gann-square" | "gann-fan"
    | "regression-trend" | "flat-top-bottom" | "disjoint-channel"
    | "rotated-rectangle" | "ellipse" | "circle" | "curve" | "double-curve"
    | "price-range" | "date-range" | "date-price-range"
    | "cyclic-lines" | "time-cycles"
    | "forecast" | "bars-pattern" | "ghost-feed";
  p1: Point;
  p2: Point;
  /** Fibonacci levels override */
  fibLevels?: number[];
  /** Measurer computed stats */
  measurerStats?: {
    priceChange: number;
    pctChange: number;
    barCount: number;
    dayCount: number;
    volumeSum: number;
  };
}

/** Three-point drawings: pitchforks, parallel-channel */
export interface ThreePointDrawing extends BaseDrawing {
  type: "pitchfork" | "schiff-pitchfork" | "modified-schiff-pitchfork" | "inside-pitchfork"
    | "parallel-channel" | "triangle-shape";
  p1: Point;
  p2: Point;
  p3: Point;
}

/** Multi-point drawings: patterns, Elliott waves, polyline, path */
export interface MultiPointDrawing extends BaseDrawing {
  type: "xabcd-pattern" | "cypher-pattern" | "head-shoulders" | "abcd-pattern"
    | "triangle-pattern" | "three-drives-pattern"
    | "elliott-impulse" | "elliott-correction" | "elliott-triangle"
    | "elliott-double-combo" | "elliott-triple-combo"
    | "polyline" | "path";
  points: Point[];
  /** Labels for each point (e.g. ["1","2","3","4","5"] for Elliott impulse) */
  labels?: string[];
}

/** Position drawings: long/short position */
export interface PositionDrawing extends BaseDrawing {
  type: "long-position" | "short-position";
  entryPrice: number;
  targetPrice: number;
  stopPrice: number;
  entryTime: number;
  endTime: number;
  quantity?: number;
}

/** Brush / highlighter: freehand path */
export interface BrushDrawing extends BaseDrawing {
  type: "brush" | "highlighter";
  points: Point[];
  strokeWidth: number;
  opacity: number;
}

/** Arrow drawings */
export interface ArrowDrawing extends BaseDrawing {
  type: "arrow-marker" | "arrow-up" | "arrow-down" | "arrow-left" | "arrow-right";
  point: Point;
}

/** Text-based annotations */
export interface TextDrawing extends BaseDrawing {
  type: "text" | "anchored-text" | "note" | "anchored-note" | "callout"
    | "comment" | "price-label" | "signpost" | "flag-mark";
  point: Point;
  text: string;
}

export type Drawing =
  | HorizontalLineDrawing
  | SinglePointLineDrawing
  | TwoPointDrawing
  | ThreePointDrawing
  | MultiPointDrawing
  | PositionDrawing
  | BrushDrawing
  | ArrowDrawing
  | TextDrawing;

/** Global visibility toggles */
export interface GlobalHideState {
  drawings: boolean;
  indicators: boolean;
  positions: boolean;
}

export interface InteractionState {
  status: InteractionStatus;
  dragStartPoint?: Point;
  currentPoint?: Point;
  activeDrawingIds?: string[];
  originalDrawings?: Record<string, Drawing>;
  /** Accumulated points for multi-click tools (patterns, Elliott, polyline) */
  collectedPoints?: Point[];
  /** How many total points this tool needs (0 = unlimited/freehand) */
  requiredPoints?: number;
}

interface SymbolAnalysisState {
  indicators: IndicatorConfig[];
  drawings: Drawing[];
  redoStack: Drawing[];
  chartStyle?: ChartStyle;
}

let fallbackIdCounter = 0;
const nowId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `local-${Date.now()}-${++fallbackIdCounter}`;

const createSymbolState = (): SymbolAnalysisState => ({
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

const isChartStyle = (value: unknown): value is ChartStyle =>
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

export const makeDefaultIndicator = (type: IndicatorType): Omit<IndicatorConfig, "id"> => ({
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

function normalizeIndicator(input: Omit<IndicatorConfig, "id">): Omit<IndicatorConfig, "id"> {
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

const toggleId = (list: string[], id: string) =>
  list.includes(id) ? list.filter((item) => item !== id) : [...list, id];

// Helper to validate a Point-like object
const validPoint = (p: unknown): Point | null => {
  if (!p || typeof p !== "object") return null;
  const t = Number((p as any).time);
  const pr = Number((p as any).price);
  if (!Number.isFinite(t) || !Number.isFinite(pr)) return null;
  return { time: t, price: pr };
};

// All drawing types that use 2-point p1/p2 shape
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

function normalizeDrawing(input: any): Drawing | null {
  if (!input || typeof input !== "object" || typeof input.type !== "string") return null;

  const base = {
    id: typeof input.id === "string" ? input.id : nowId(),
    visible: input.visible !== false,
    locked: input.locked === true,
    groupId: typeof input.groupId === "string" ? input.groupId : undefined,
    zIndex: Number.isFinite(Number(input.zIndex)) ? Number(input.zIndex) : undefined,
  };

  const drawingType: string = input.type;

  // Horizontal line (price only)
  if (drawingType === "horizontal-line") {
    const price = Number(input.price);
    if (!Number.isFinite(price)) return null;
    return { ...base, type: "horizontal-line", price } as HorizontalLineDrawing;
  }

  // Single-point line types
  if (SINGLE_POINT_LINE_TYPES.has(drawingType)) {
    const point = validPoint(input.point);
    if (!point) return null;
    return { ...base, type: drawingType, point } as SinglePointLineDrawing;
  }

  // Two-point drawings
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

  // Three-point drawings
  if (THREE_POINT_TYPES.has(drawingType)) {
    const p1 = validPoint(input.p1);
    const p2 = validPoint(input.p2);
    const p3 = validPoint(input.p3);
    if (!p1 || !p2 || !p3) return null;
    return { ...base, type: drawingType, p1, p2, p3 } as ThreePointDrawing;
  }

  // Multi-point drawings
  if (MULTI_POINT_TYPES.has(drawingType)) {
    const points = Array.isArray(input.points)
      ? input.points.map(validPoint).filter((p: Point | null): p is Point => Boolean(p))
      : [];
    if (points.length < 2) return null;
    return {
      ...base,
      type: drawingType,
      points,
      labels: Array.isArray(input.labels) ? input.labels : undefined,
    } as MultiPointDrawing;
  }

  // Position drawings
  if (drawingType === "long-position" || drawingType === "short-position") {
    const entry = Number(input.entryPrice);
    const target = Number(input.targetPrice);
    const stop = Number(input.stopPrice);
    const entryTime = Number(input.entryTime);
    // Support legacy drawings by defaulting endTime to 20 bars later if missing
    const endTime = Number(input.endTime) || (entryTime + 20 * 60 * 1000); // 20 units (assuming 1m as base if not specified, but better than nothing)
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

  // Brush / highlighter
  if (drawingType === "brush" || drawingType === "highlighter") {
    const points = Array.isArray(input.points)
      ? input.points.map(validPoint).filter((p: Point | null): p is Point => Boolean(p))
      : [];
    if (points.length < 2) return null;
    return {
      ...base,
      type: drawingType,
      points,
      strokeWidth: Number.isFinite(Number(input.strokeWidth)) ? Number(input.strokeWidth) : 2,
      opacity: Number.isFinite(Number(input.opacity)) ? Number(input.opacity) : drawingType === "highlighter" ? 0.3 : 1,
    } as BrushDrawing;
  }

  // Arrow types
  if (ARROW_TYPES.has(drawingType)) {
    const point = validPoint(input.point);
    if (!point) return null;
    return { ...base, type: drawingType, point } as ArrowDrawing;
  }

  // Text & annotation types
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

function normalizeSymbolStateRecord(raw: unknown): Record<string, SymbolAnalysisState> {
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
                ...(Number.isFinite(Number(item?.period)) ? { period: Number(item.period) } : {}),
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

export interface AnalysisState {
  isAnalysisMode: boolean;
  timeframe: string;
  range: string;
  activeTool: ToolType;
  interactionState: InteractionState;
  selectedDrawingId: string | null;
  selectedDrawingIds: string[];
  chartStyle: ChartStyle;
  chartStyleBySymbol: Record<string, ChartStyle>;
  hotkeysEnabled: boolean;
  indicatorPresetsBySymbol: Record<string, IndicatorConfig[]>;
  symbolState: Record<string, SymbolAnalysisState>;
  globalHideState: GlobalHideState;

  setAnalysisMode: (isOpen: boolean) => void;
  setTimeframe: (tf: string) => void;
  setRange: (r: string) => void;
  setChartStyle: (style: ChartStyle) => void;
  setChartStyleForSymbol: (symbol: string, style: ChartStyle) => void;
  getChartStyle: (symbol: string) => ChartStyle;
  setHotkeysEnabled: (enabled: boolean) => void;
  setActiveTool: (tool: ToolType) => void;

  setSelectedDrawing: (id: string | null) => void;
  setSelectedDrawings: (ids: string[]) => void;
  toggleDrawingSelection: (id: string, additive?: boolean) => void;

  startDrawing: (point: Point) => void;
  startDragging: (id: string, startPoint: Point, originalDrawing: Drawing) => void;
  updateDraft: (point: Point) => void;
  commitDrawing: (symbol: string) => void;
  cancelDrawing: () => void;
  /** Multi-click: add a collected point for patterns/Elliott/polyline */
  addCollectedPoint: (point: Point) => void;

  updateDrawing: (symbol: string, drawing: Drawing) => void;
  undoDrawing: (symbol: string) => void;
  redoDrawing: (symbol: string) => void;

  addIndicator: (symbol: string, config: Omit<IndicatorConfig, "id">) => void;
  updateIndicator: (symbol: string, id: string, updater: Partial<IndicatorConfig>) => void;
  removeIndicator: (symbol: string, id: string) => void;
  clearIndicators: (symbol: string) => void;

  addDrawing: (symbol: string, drawing: Omit<Drawing, "id">) => void;
  removeDrawing: (symbol: string, id: string) => void;
  deleteDrawing: (symbol: string, id: string) => void;
  deleteSelectedDrawings: (symbol: string) => void;
  clearDrawings: (symbol: string) => void;
  setDrawingVisibility: (symbol: string, drawingId: string, visible: boolean) => void;
  setSelectedDrawingsLocked: (symbol: string, locked: boolean) => void;

  // Global actions
  lockAllDrawings: (symbol: string) => void;
  unlockAllDrawings: (symbol: string) => void;
  clearAllDrawings: (symbol: string) => void;
  setGlobalHide: (key: keyof GlobalHideState, hidden: boolean) => void;
  hideAll: (symbol: string) => void;
  showAll: (symbol: string) => void;

  getIndicators: (symbol: string) => IndicatorConfig[];
  getDrawings: (symbol: string) => Drawing[];
}

export const useAnalysisStore = create<AnalysisState>()(
  persist(
    (set, get) => ({
      isAnalysisMode: false,
      timeframe: "5m",
      range: "1D",
      activeTool: "crosshair",
      interactionState: { status: "idle" },
      selectedDrawingId: null,
      selectedDrawingIds: [],
      chartStyle: "CANDLE",
      chartStyleBySymbol: {},
      hotkeysEnabled: true,
      indicatorPresetsBySymbol: {},
      symbolState: {},
      globalHideState: { drawings: false, indicators: false, positions: false },

      setAnalysisMode: (isOpen) => set({ isAnalysisMode: isOpen }),
      setTimeframe: (tf) => set({ timeframe: tf }),
      setRange: (r) => set({ range: r }),
      setChartStyle: (style) => set({ chartStyle: style }),
      setChartStyleForSymbol: (symbol, style) =>
        set((state) => ({
          chartStyle: style,
          chartStyleBySymbol: {
            ...state.chartStyleBySymbol,
            [symbol]: style,
          },
          symbolState: {
            ...state.symbolState,
            [symbol]: {
              ...(state.symbolState[symbol] || createSymbolState()),
              chartStyle: style,
            },
          },
        })),
      getChartStyle: (symbol) => {
        const state = get();
        return state.chartStyleBySymbol[symbol] || state.symbolState[symbol]?.chartStyle || state.chartStyle;
      },
      setHotkeysEnabled: (enabled) => set({ hotkeysEnabled: enabled }),
      setActiveTool: (tool) =>
        set({
          activeTool: tool,
          interactionState: { status: "idle" },
        }),

      setSelectedDrawing: (id) =>
        set({
          selectedDrawingId: id,
          selectedDrawingIds: id ? [id] : [],
        }),
      setSelectedDrawings: (ids) =>
        set({
          selectedDrawingIds: ids,
          selectedDrawingId: ids[0] || null,
        }),
      toggleDrawingSelection: (id, additive = false) =>
        set((state) => {
          const next = additive ? toggleId(state.selectedDrawingIds, id) : [id];
          return {
            selectedDrawingIds: next,
            selectedDrawingId: next[0] || null,
          };
        }),

      startDrawing: (point) =>
        set({
          interactionState: {
            status: "drawing",
            dragStartPoint: point,
            currentPoint: point,
          },
          selectedDrawingId: null,
          selectedDrawingIds: [],
        }),
      startDragging: (id, startPoint, originalDrawing) =>
        set({
          interactionState: {
            status: "dragging",
            activeDrawingIds: [id],
            dragStartPoint: startPoint,
            originalDrawings: { [id]: originalDrawing },
            currentPoint: startPoint,
          },
          selectedDrawingId: id,
          selectedDrawingIds: [id],
        }),
      updateDraft: (point) =>
        set((state) => ({
          interactionState: {
            ...state.interactionState,
            currentPoint: point,
          },
        })),
      commitDrawing: (symbol) => {
        const { activeTool, interactionState } = get();
        if (
          interactionState.status !== "drawing" ||
          !interactionState.dragStartPoint ||
          !interactionState.currentPoint
        ) {
          return;
        }

        let draft: Omit<Drawing, "id"> | null = null;
        if (activeTool === "trendline" || activeTool === "ray" || activeTool === "rectangle") {
          draft = {
            type: activeTool,
            visible: true,
            locked: false,
            p1: interactionState.dragStartPoint,
            p2: interactionState.currentPoint,
          } as Omit<TwoPointDrawing, "id">;
        }

        if (draft) get().addDrawing(symbol, draft);
        set({ interactionState: { status: "idle" } });
      },
      cancelDrawing: () => set({ interactionState: { status: "idle" } }),

      addCollectedPoint: (point) =>
        set((state) => {
          const prev = state.interactionState.collectedPoints || [];
          return {
            interactionState: {
              ...state.interactionState,
              collectedPoints: [...prev, point],
              currentPoint: point,
            },
          };
        }),

      updateDrawing: (symbol, drawing) =>
        set((state) => {
          const current = state.symbolState[symbol] || createSymbolState();
          return {
            symbolState: {
              ...state.symbolState,
              [symbol]: {
                ...current,
                drawings: current.drawings.map((d) => (d.id === drawing.id ? drawing : d)),
              },
            },
          };
        }),

      undoDrawing: (symbol) =>
        set((state) => {
          const current = state.symbolState[symbol];
          if (!current || current.drawings.length === 0) return state;
          const nextDrawings = [...current.drawings];
          const popped = nextDrawings.pop();
          if (!popped) return state;
          return {
            symbolState: {
              ...state.symbolState,
              [symbol]: {
                ...current,
                drawings: nextDrawings,
                redoStack: [...current.redoStack, popped],
              },
            },
          };
        }),
      redoDrawing: (symbol) =>
        set((state) => {
          const current = state.symbolState[symbol];
          if (!current || current.redoStack.length === 0) return state;
          const redoStack = [...current.redoStack];
          const restored = redoStack.pop();
          if (!restored) return state;
          return {
            symbolState: {
              ...state.symbolState,
              [symbol]: {
                ...current,
                drawings: [...current.drawings, restored],
                redoStack,
              },
            },
          };
        }),

      addIndicator: (symbol, config) =>
        set((state) => {
          const current = state.symbolState[symbol] || createSymbolState();
          const normalized = normalizeIndicator(config);
          const duplicate = current.indicators.some((item) => item.type === normalized.type);
          if (duplicate) return state;
          return {
            symbolState: {
              ...state.symbolState,
              [symbol]: {
                ...current,
                indicators: [...current.indicators, { ...normalized, id: nowId() }],
              },
            },
          };
        }),

      updateIndicator: (symbol, id, updater) =>
        set((state) => {
          const current = state.symbolState[symbol];
          if (!current) return state;
          return {
            symbolState: {
              ...state.symbolState,
              [symbol]: {
                ...current,
                indicators: current.indicators.map((indicator) => {
                  if (indicator.id !== id) return indicator;
                  const merged = {
                    ...indicator,
                    ...updater,
                    params: {
                      ...indicator.params,
                      ...(updater.params || {}),
                    },
                    display: {
                      ...indicator.display,
                      ...(updater.display || {}),
                    },
                  };
                  const normalized = normalizeIndicator({
                    ...merged,
                    type: merged.type,
                    source: merged.source,
                  });
                  return {
                    ...normalized,
                    id: indicator.id,
                  };
                }),
              },
            },
          };
        }),

      removeIndicator: (symbol, id) =>
        set((state) => {
          const current = state.symbolState[symbol];
          if (!current) return state;
          return {
            symbolState: {
              ...state.symbolState,
              [symbol]: {
                ...current,
                indicators: current.indicators.filter((indicator) => indicator.id !== id),
              },
            },
          };
        }),
      clearIndicators: (symbol) =>
        set((state) => {
          const current = state.symbolState[symbol];
          if (!current) return state;
          return {
            symbolState: {
              ...state.symbolState,
              [symbol]: {
                ...current,
                indicators: [],
              },
            },
          };
        }),

      addDrawing: (symbol, drawing) =>
        set((state) => {
          const current = state.symbolState[symbol] || createSymbolState();
          const next = {
            ...drawing,
            id: typeof (drawing as any).id === "string" ? (drawing as any).id : nowId(),
            visible: drawing.visible ?? true,
            locked: drawing.locked ?? false,
            zIndex: drawing.zIndex ?? current.drawings.length + 1,
          } as Drawing;
          return {
            symbolState: {
              ...state.symbolState,
              [symbol]: {
                ...current,
                drawings: [...current.drawings, next],
                redoStack: [],
              },
            },
          };
        }),

      removeDrawing: (symbol, id) =>
        set((state) => {
          const current = state.symbolState[symbol];
          if (!current) return state;
          const selectedDrawingIds = state.selectedDrawingIds.filter((item) => item !== id);
          return {
            symbolState: {
              ...state.symbolState,
              [symbol]: {
                ...current,
                drawings: current.drawings.filter((drawing) => drawing.id !== id),
              },
            },
            selectedDrawingIds,
            selectedDrawingId: selectedDrawingIds[0] || null,
          };
        }),
      deleteDrawing: (symbol, id) => get().removeDrawing(symbol, id),
      deleteSelectedDrawings: (symbol) =>
        set((state) => {
          const current = state.symbolState[symbol];
          if (!current || state.selectedDrawingIds.length === 0) return state;
          const selected = new Set(state.selectedDrawingIds);
          return {
            symbolState: {
              ...state.symbolState,
              [symbol]: {
                ...current,
                drawings: current.drawings.filter((drawing) => !selected.has(drawing.id)),
              },
            },
            selectedDrawingId: null,
            selectedDrawingIds: [],
          };
        }),
      clearDrawings: (symbol) =>
        set((state) => {
          const current = state.symbolState[symbol];
          if (!current) return state;
          return {
            symbolState: {
              ...state.symbolState,
              [symbol]: {
                ...current,
                drawings: [],
                redoStack: [],
              },
            },
            selectedDrawingId: null,
            selectedDrawingIds: [],
          };
        }),
      setDrawingVisibility: (symbol, drawingId, visible) =>
        set((state) => {
          const current = state.symbolState[symbol];
          if (!current) return state;
          return {
            symbolState: {
              ...state.symbolState,
              [symbol]: {
                ...current,
                drawings: current.drawings.map((drawing) =>
                  drawing.id === drawingId ? { ...drawing, visible } : drawing
                ),
              },
            },
          };
        }),
      setSelectedDrawingsLocked: (symbol, locked) =>
        set((state) => {
          const current = state.symbolState[symbol];
          if (!current || state.selectedDrawingIds.length === 0) return state;
          const selected = new Set(state.selectedDrawingIds);
          return {
            symbolState: {
              ...state.symbolState,
              [symbol]: {
                ...current,
                drawings: current.drawings.map((drawing) =>
                  selected.has(drawing.id) ? { ...drawing, locked } : drawing
                ),
              },
            },
          };
        }),

      getIndicators: (symbol) => get().symbolState[symbol]?.indicators || [],
      getDrawings: (symbol) => get().symbolState[symbol]?.drawings || [],

      // Global actions
      lockAllDrawings: (symbol) =>
        set((state) => {
          const current = state.symbolState[symbol];
          if (!current) return state;
          return {
            symbolState: {
              ...state.symbolState,
              [symbol]: {
                ...current,
                drawings: current.drawings.map((d) => ({ ...d, locked: true })),
              },
            },
          };
        }),
      unlockAllDrawings: (symbol) =>
        set((state) => {
          const current = state.symbolState[symbol];
          if (!current) return state;
          return {
            symbolState: {
              ...state.symbolState,
              [symbol]: {
                ...current,
                drawings: current.drawings.map((d) => ({ ...d, locked: false })),
              },
            },
          };
        }),
      clearAllDrawings: (symbol) =>
        set((state) => {
          const current = state.symbolState[symbol];
          if (!current) return state;
          return {
            symbolState: {
              ...state.symbolState,
              [symbol]: { ...current, drawings: [], redoStack: [] },
            },
            selectedDrawingId: null,
            selectedDrawingIds: [],
          };
        }),
      setGlobalHide: (key, hidden) =>
        set((state) => ({
          globalHideState: { ...state.globalHideState, [key]: hidden },
        })),
      hideAll: (_symbol) =>
        set({ globalHideState: { drawings: true, indicators: true, positions: true } }),
      showAll: (_symbol) =>
        set({ globalHideState: { drawings: false, indicators: false, positions: false } }),
    }),
    {
      name: "analysis-storage-v2",
      version: 2,
      migrate: (persistedState: any, version) => {
        if (!persistedState || typeof persistedState !== "object") return persistedState;
        const symbolState = normalizeSymbolStateRecord(persistedState.symbolState);
        const chartStyleBySymbol = { ...(persistedState.chartStyleBySymbol || {}) } as Record<string, ChartStyle>;

        if (version < 2) {
          for (const [symbol, value] of Object.entries(symbolState)) {
            if (value?.chartStyle && !chartStyleBySymbol[symbol]) {
              chartStyleBySymbol[symbol] = value.chartStyle;
            }
          }
        }

        const chartStyle = isChartStyle(persistedState.chartStyle) ? persistedState.chartStyle : "CANDLE";

        return {
          ...persistedState,
          symbolState,
          chartStyle,
          chartStyleBySymbol,
        };
      },
      partialize: (state) => ({
        symbolState: state.symbolState,
        chartStyle: state.chartStyle,
        chartStyleBySymbol: state.chartStyleBySymbol,
        hotkeysEnabled: state.hotkeysEnabled,
        indicatorPresetsBySymbol: state.indicatorPresetsBySymbol,
      }),
    }
  )
);
