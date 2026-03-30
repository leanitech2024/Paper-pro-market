import type { Coordinate, ISeriesApi } from "lightweight-charts";
import type { CandlestickData } from "lightweight-charts";
import type { Drawing, Point } from "@/stores/trading/analysis.store";

export type PointCoords = { x: Coordinate; y: Coordinate };
export type PointToCoords = (p: Point) => PointCoords | null;
export type CoordsToPoint = (x: number, y: number) => Point | null;

export interface DrawingRendererProps {
  drawing: Drawing;
  pointToCoords: PointToCoords;
  coordsToPoint: CoordsToPoint;
  width: number;
  height: number;
  selected: boolean;
  mainSeries: ISeriesApi<"Candlestick">;
  data: CandlestickData[];
  isDraft?: boolean;
}

export type DrawingRenderer = (props: DrawingRendererProps) => React.ReactNode | null;

/** Standard stroke for selected vs normal */
export const SEL_COLOR = "#F59E0B";
export const DRAW_COLOR = "#2962FF";
export const DRAFT_COLOR = "#3B82F6";
export const GREEN_COLOR = "#089981";
export const RED_COLOR = "#F23645";

/** Common SVG line with selection styling */
export function drawingStroke(selected: boolean, isDraft = false): {
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
} {
  return {
    stroke: selected ? SEL_COLOR : isDraft ? DRAFT_COLOR : DRAW_COLOR,
    strokeWidth: selected ? 3 : 2,
    strokeDasharray: isDraft ? "4 4" : undefined,
  };
}

export const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
export const FIB_COLORS = [
  "rgba(244,67,54,0.3)",
  "rgba(255,152,0,0.25)",
  "rgba(255,235,59,0.2)",
  "rgba(76,175,80,0.2)",
  "rgba(33,150,243,0.2)",
  "rgba(156,39,176,0.25)",
  "rgba(244,67,54,0.3)",
];

/** Point count required for each multi-click tool */
export const REQUIRED_POINTS: Partial<Record<string, number>> = {
  // 3-point
  "pitchfork": 3,
  "schiff-pitchfork": 3,
  "modified-schiff-pitchfork": 3,
  "inside-pitchfork": 3,
  "parallel-channel": 3,
  "triangle-shape": 3,
  // 4-point
  "abcd-pattern": 4,
  // 5-point
  "xabcd-pattern": 5,
  "cypher-pattern": 5,
  "elliott-impulse": 6,
  "elliott-correction": 4,
  "elliott-triangle": 6,
  "elliott-double-combo": 4,
  "elliott-triple-combo": 6,
  // 3-point patterns
  "head-shoulders": 7,
  "triangle-pattern": 3,
  "three-drives-pattern": 7,
  // Unlimited
  "polyline": 0,
  "path": 0,
};

/** Default labels for Elliott wave tools */
export const ELLIOTT_LABELS: Record<string, string[]> = {
  "elliott-impulse": ["1", "2", "3", "4", "5", ""],
  "elliott-correction": ["A", "B", "C", ""],
  "elliott-triangle": ["A", "B", "C", "D", "E", ""],
  "elliott-double-combo": ["W", "X", "Y", ""],
  "elliott-triple-combo": ["W", "X", "Y", "X", "Z", ""],
};

/** Default labels for pattern tools */
export const PATTERN_LABELS: Record<string, string[]> = {
  "xabcd-pattern": ["X", "A", "B", "C", "D"],
  "cypher-pattern": ["X", "A", "B", "C", "D"],
  "abcd-pattern": ["A", "B", "C", "D"],
  "head-shoulders": ["LS", "H", "RS", "LS2", "H2", "RS2", "NL"],
  "triangle-pattern": ["A", "B", "C"],
  "three-drives-pattern": ["1", "A", "2", "B", "3", "C", "D"],
};
