import { type ToolType } from "@/stores/trading/analysis.store";
import { REQUIRED_POINTS, ELLIOTT_LABELS, PATTERN_LABELS } from "./renderers/types";

export const SINGLE_CLICK_TOOLS = new Set<string>([
  "horizontal-line", "vertical-line", "cross-line", "horizontal-ray",
  "arrow-marker", "arrow-up", "arrow-down", "arrow-left", "arrow-right",
  "flag-mark", "signpost", "price-label", "comment",
]);

export const TEXT_TOOLS = new Set<string>([
  "text", "anchored-text", "note", "anchored-note", "callout",
]);

export const POSITION_TOOLS = new Set<string>(["long-position", "short-position"]);

export const THREE_POINT_TOOLS = new Set<string>([
  "pitchfork", "schiff-pitchfork", "modified-schiff-pitchfork", "inside-pitchfork",
  "parallel-channel", "triangle-shape",
]);

export const MULTI_POINT_TOOLS = new Set<string>([
  "xabcd-pattern", "cypher-pattern", "head-shoulders", "abcd-pattern",
  "triangle-pattern", "three-drives-pattern",
  "elliott-impulse", "elliott-correction", "elliott-triangle",
  "elliott-double-combo", "elliott-triple-combo",
  "polyline", "path",
]);

export const FREEHAND_TOOLS = new Set<string>(["brush", "highlighter"]);

export const TWO_POINT_TOOLS = new Set<string>([
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

export const isDrawingTool = (tool: ToolType): boolean =>
  tool !== "cursor" && tool !== "crosshair" && tool !== "select" && tool !== "eraser";

export { REQUIRED_POINTS, ELLIOTT_LABELS, PATTERN_LABELS };
