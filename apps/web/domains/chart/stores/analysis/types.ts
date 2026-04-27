import type { StateCreator } from "zustand";

export interface Point {
  time: number;
  price: number;
}

export type DrawingType =
  | "trendline" | "ray" | "info-line" | "extended-line" | "trend-angle"
  | "horizontal-line" | "horizontal-ray" | "vertical-line" | "cross-line"
  | "parallel-channel" | "regression-trend" | "flat-top-bottom" | "disjoint-channel"
  | "pitchfork" | "schiff-pitchfork" | "modified-schiff-pitchfork" | "inside-pitchfork"
  | "fib-retracement" | "fib-extension" | "fib-channel" | "fib-time-zone"
  | "fib-speed-fan" | "fib-time-extension" | "fib-circles" | "fib-spiral"
  | "fib-speed-arcs" | "fib-wedge" | "pitchfan"
  | "gann-box" | "gann-square-fixed" | "gann-square" | "gann-fan"
  | "xabcd-pattern" | "cypher-pattern" | "head-shoulders" | "abcd-pattern"
  | "triangle-pattern" | "three-drives-pattern"
  | "elliott-impulse" | "elliott-correction" | "elliott-triangle"
  | "elliott-double-combo" | "elliott-triple-combo"
  | "cyclic-lines" | "time-cycles"
  | "long-position" | "short-position" | "forecast" | "bars-pattern" | "ghost-feed"
  | "price-range" | "date-range" | "date-price-range"
  | "brush" | "highlighter"
  | "arrow-marker" | "arrow-up" | "arrow-down" | "arrow-left" | "arrow-right"
  | "rectangle" | "rotated-rectangle" | "path" | "circle" | "ellipse"
  | "polyline" | "triangle-shape" | "curve" | "double-curve"
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
export type ToolType = "cursor" | "crosshair" | "select" | "eraser" | "lock" | "clear" | "hide" | DrawingType;

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

interface BaseDrawing {
  id: string;
  type: DrawingType;
  visible: boolean;
  locked?: boolean;
  groupId?: string;
  zIndex?: number;
}

export interface HorizontalLineDrawing extends BaseDrawing {
  type: "horizontal-line";
  price: number;
}

export interface SinglePointLineDrawing extends BaseDrawing {
  type: "vertical-line" | "cross-line" | "horizontal-ray";
  point: Point;
}

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
  fibLevels?: number[];
  measurerStats?: {
    priceChange: number;
    pctChange: number;
    barCount: number;
    dayCount: number;
    volumeSum: number;
  };
}

export interface ThreePointDrawing extends BaseDrawing {
  type: "pitchfork" | "schiff-pitchfork" | "modified-schiff-pitchfork" | "inside-pitchfork"
    | "parallel-channel" | "triangle-shape";
  p1: Point;
  p2: Point;
  p3: Point;
}

export interface MultiPointDrawing extends BaseDrawing {
  type: "xabcd-pattern" | "cypher-pattern" | "head-shoulders" | "abcd-pattern"
    | "triangle-pattern" | "three-drives-pattern"
    | "elliott-impulse" | "elliott-correction" | "elliott-triangle"
    | "elliott-double-combo" | "elliott-triple-combo"
    | "polyline" | "path";
  points: Point[];
  labels?: string[];
}

export interface PositionDrawing extends BaseDrawing {
  type: "long-position" | "short-position";
  entryPrice: number;
  targetPrice: number;
  stopPrice: number;
  entryTime: number;
  endTime: number;
  quantity?: number;
}

export interface BrushDrawing extends BaseDrawing {
  type: "brush" | "highlighter";
  points: Point[];
  strokeWidth: number;
  opacity: number;
}

export interface ArrowDrawing extends BaseDrawing {
  type: "arrow-marker" | "arrow-up" | "arrow-down" | "arrow-left" | "arrow-right";
  point: Point;
}

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
  collectedPoints?: Point[];
  requiredPoints?: number;
}

export interface SymbolAnalysisState {
  indicators: IndicatorConfig[];
  drawings: Drawing[];
  redoStack: Drawing[];
  chartStyle?: ChartStyle;
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

  lockAllDrawings: (symbol: string) => void;
  unlockAllDrawings: (symbol: string) => void;
  clearAllDrawings: (symbol: string) => void;
  setGlobalHide: (key: keyof GlobalHideState, hidden: boolean) => void;
  hideAll: (symbol: string) => void;
  showAll: (symbol: string) => void;

  getIndicators: (symbol: string) => IndicatorConfig[];
  getDrawings: (symbol: string) => Drawing[];
}

export type AnalysisStoreCreator<T> = StateCreator<AnalysisState, [], [], T>;
