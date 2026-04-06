import type { ToolType } from "@/stores/trading/analysis.store";

export interface ToolItem {
  id: ToolType;
  label: string;
  icon: string;
  shortcut?: string;
}

export interface ToolGroup {
  name: string;
  tools: ToolItem[];
  defaultTool?: ToolType;
}

export type MobileMenuActionId = "clear-all";

export type MobileMenuItem =
  | ({ kind: "tool" } & ToolItem)
  | { kind: "action"; id: MobileMenuActionId; label: string; icon: string };

export interface MobileMenuSection {
  name: string;
  items: MobileMenuItem[];
}

export const TOOL_ICON_SIZE = 22;
export const TOOL_ICON_CLASS = "w-[22px] h-[22px]";
export const TOOL_BUTTON_SIZE_CLASS = "w-[30px] h-[30px]";
export const TOOLTIP_CLASS =
  "fixed z-[9999] rounded-md bg-white/95 px-2 py-1 text-[10px] text-slate-700 shadow-lg border border-slate-200/80 whitespace-nowrap dark:bg-[#0c1322]/95 dark:text-slate-200 dark:border-white/[0.08]";
export const EXPAND_BUTTON_CLASS =
  "absolute -right-1 -bottom-1 flex h-4 w-4 items-center justify-center rounded-full border border-slate-200/80 bg-white/95 text-slate-500 transition dark:bg-[#0c1322]/95 dark:text-slate-400 dark:border-white/[0.08]";

export const TOOL_GROUPS: ToolGroup[] = [
  {
    name: "Cursor",
    tools: [
      { id: "cursor", label: "Cursor", icon: "cursor", shortcut: "V" },
      { id: "crosshair", label: "Crosshair", icon: "crosshair", shortcut: "C" },
    ],
  },
  {
    name: "Lines",
    tools: [
      { id: "trendline", label: "Trend Line", icon: "trendline", shortcut: "Alt+T" },
      { id: "ray", label: "Ray", icon: "ray" },
      { id: "info-line", label: "Info Line", icon: "info-line" },
      { id: "extended-line", label: "Extended Line", icon: "extended-line" },
      { id: "trend-angle", label: "Trend Angle", icon: "trend-angle" },
      { id: "horizontal-line", label: "Horizontal Line", icon: "horizontal-line", shortcut: "Alt+H" },
      { id: "horizontal-ray", label: "Horizontal Ray", icon: "horizontal-ray" },
      { id: "vertical-line", label: "Vertical Line", icon: "vertical-line", shortcut: "Alt+V" },
      { id: "cross-line", label: "Cross Line", icon: "cross-line", shortcut: "Alt+C" },
    ],
    defaultTool: "trendline",
  },
  {
    name: "Channels",
    tools: [
      { id: "parallel-channel", label: "Parallel Channel", icon: "parallel-channel" },
      { id: "regression-trend", label: "Regression Trend", icon: "regression-trend" },
      { id: "flat-top-bottom", label: "Flat Top/Bottom", icon: "flat-top-bottom" },
      { id: "disjoint-channel", label: "Disjoint Channel", icon: "disjoint-channel" },
    ],
    defaultTool: "parallel-channel",
  },
  {
    name: "Pitchforks",
    tools: [
      { id: "pitchfork", label: "Pitchfork", icon: "pitchfork" },
      { id: "schiff-pitchfork", label: "Schiff Pitchfork", icon: "schiff-pitchfork" },
      { id: "modified-schiff-pitchfork", label: "Modified Schiff", icon: "modified-schiff-pitchfork" },
      { id: "inside-pitchfork", label: "Inside Pitchfork", icon: "inside-pitchfork" },
    ],
    defaultTool: "pitchfork",
  },
  {
    name: "Fibonacci",
    tools: [
      { id: "fib-retracement", label: "Fib Retracement", icon: "fib-retracement" },
      { id: "fib-extension", label: "Fib Extension", icon: "fib-extension" },
      { id: "fib-channel", label: "Fib Channel", icon: "fib-channel" },
      { id: "fib-time-zone", label: "Fib Time Zone", icon: "fib-time-zone" },
      { id: "fib-speed-fan", label: "Fib Speed Fan", icon: "fib-speed-fan" },
      { id: "fib-time-extension", label: "Fib Time Extension", icon: "fib-time-extension" },
      { id: "fib-circles", label: "Fib Circles", icon: "fib-circles" },
      { id: "fib-spiral", label: "Fib Spiral", icon: "fib-spiral" },
      { id: "fib-speed-arcs", label: "Fib Speed Arcs", icon: "fib-speed-arcs" },
      { id: "fib-wedge", label: "Fib Wedge", icon: "fib-wedge" },
      { id: "pitchfan", label: "Pitchfan", icon: "pitchfan" },
    ],
    defaultTool: "fib-retracement",
  },
  {
    name: "Gann",
    tools: [
      { id: "gann-box", label: "Gann Box", icon: "gann-box" },
      { id: "gann-square-fixed", label: "Gann Square Fixed", icon: "gann-square-fixed" },
      { id: "gann-square", label: "Gann Square", icon: "gann-square" },
      { id: "gann-fan", label: "Gann Fan", icon: "gann-fan", shortcut: "Alt+F" },
    ],
    defaultTool: "gann-box",
  },
  {
    name: "Patterns",
    tools: [
      { id: "xabcd-pattern", label: "XABCD Pattern", icon: "xabcd-pattern" },
      { id: "cypher-pattern", label: "Cypher Pattern", icon: "cypher-pattern" },
      { id: "head-shoulders", label: "Head & Shoulders", icon: "head-shoulders" },
      { id: "abcd-pattern", label: "ABCD Pattern", icon: "abcd-pattern" },
      { id: "triangle-pattern", label: "Triangle Pattern", icon: "triangle-pattern" },
      { id: "three-drives-pattern", label: "Three Drives", icon: "three-drives-pattern" },
    ],
    defaultTool: "xabcd-pattern",
  },
  {
    name: "Elliott",
    tools: [
      { id: "elliott-impulse", label: "Impulse (12345)", icon: "elliott-impulse" },
      { id: "elliott-correction", label: "Correction (ABC)", icon: "elliott-correction" },
      { id: "elliott-triangle", label: "Triangle (ABCDE)", icon: "elliott-triangle" },
      { id: "elliott-double-combo", label: "Double Combo (WXY)", icon: "elliott-double-combo" },
      { id: "elliott-triple-combo", label: "Triple Combo (WXYXZ)", icon: "elliott-triple-combo" },
    ],
    defaultTool: "elliott-impulse",
  },
  {
    name: "Cycles",
    tools: [
      { id: "cyclic-lines", label: "Cyclic Lines", icon: "cyclic-lines" },
      { id: "time-cycles", label: "Time Cycles", icon: "time-cycles" },
    ],
    defaultTool: "cyclic-lines",
  },
  {
    name: "Projection",
    tools: [
      { id: "long-position", label: "Long Position", icon: "long-position", shortcut: "L" },
      { id: "short-position", label: "Short Position", icon: "short-position", shortcut: "S" },
      { id: "forecast", label: "Forecast", icon: "forecast" },
      { id: "bars-pattern", label: "Bars Pattern", icon: "bars-pattern" },
      { id: "ghost-feed", label: "Ghost Feed", icon: "ghost-feed" },
    ],
    defaultTool: "long-position",
  },
  {
    name: "Measurer",
    tools: [
      { id: "price-range", label: "Price Range", icon: "price-range" },
      { id: "date-range", label: "Date Range", icon: "date-range" },
      { id: "date-price-range", label: "Date & Price Range", icon: "date-price-range", shortcut: "M" },
    ],
    defaultTool: "date-price-range",
  },
  {
    name: "Brushes",
    tools: [
      { id: "brush", label: "Brush", icon: "brush", shortcut: "B" },
      { id: "highlighter", label: "Highlighter", icon: "highlighter" },
    ],
    defaultTool: "brush",
  },
  {
    name: "Arrows",
    tools: [
      { id: "arrow-marker", label: "Arrow Marker", icon: "arrow-marker" },
      { id: "arrow-up", label: "Arrow Up", icon: "arrow-up" },
      { id: "arrow-down", label: "Arrow Down", icon: "arrow-down" },
      { id: "arrow-left", label: "Arrow Left", icon: "arrow-left" },
      { id: "arrow-right", label: "Arrow Right", icon: "arrow-right" },
    ],
    defaultTool: "arrow-marker",
  },
  {
    name: "Shapes",
    tools: [
      { id: "rectangle", label: "Rectangle", icon: "rectangle", shortcut: "R" },
      { id: "rotated-rectangle", label: "Rotated Rectangle", icon: "rotated-rectangle" },
      { id: "path", label: "Path", icon: "path" },
      { id: "circle", label: "Circle", icon: "circle" },
      { id: "ellipse", label: "Ellipse", icon: "ellipse" },
      { id: "polyline", label: "Polyline", icon: "polyline", shortcut: "Alt+Shift+R" },
      { id: "triangle-shape", label: "Triangle", icon: "triangle-shape" },
      { id: "curve", label: "Curve", icon: "curve" },
      { id: "double-curve", label: "Double Curve", icon: "double-curve" },
    ],
    defaultTool: "rectangle",
  },
  {
    name: "Text",
    tools: [
      { id: "text", label: "Text", icon: "text", shortcut: "T" },
      { id: "anchored-text", label: "Anchored Text", icon: "anchored-text" },
      { id: "note", label: "Note", icon: "note" },
      { id: "anchored-note", label: "Anchored Note", icon: "anchored-note" },
      { id: "callout", label: "Callout", icon: "callout" },
      { id: "comment", label: "Comment", icon: "comment" },
      { id: "price-label", label: "Price Label", icon: "price-label" },
      { id: "signpost", label: "Signpost", icon: "signpost" },
      { id: "flag-mark", label: "Flag Mark", icon: "flag-mark" },
    ],
    defaultTool: "text",
  },
];

const EXTRA_TOOL_ITEMS: ToolItem[] = [
  { id: "eraser", label: "Eraser", icon: "eraser" },
];

export function findToolItem(toolId: ToolType): ToolItem | undefined {
  for (const group of TOOL_GROUPS) {
    const match = group.tools.find((tool) => tool.id === toolId);
    if (match) return match;
  }
  return EXTRA_TOOL_ITEMS.find((tool) => tool.id === toolId);
}

function pickTool(toolId: ToolType): ToolItem {
  const match = findToolItem(toolId);
  if (!match) {
    throw new Error(`Unknown tool id in mobile config: ${toolId}`);
  }
  return match;
}

function tool(toolId: ToolType): MobileMenuItem {
  return { kind: "tool", ...pickTool(toolId) };
}

export const MOBILE_DROPDOWN_SECTIONS: MobileMenuSection[] = [
  {
    name: "Cursor",
    items: [tool("cursor"), tool("crosshair")],
  },
  {
    name: "Lines",
    items: [
      tool("trendline"),
      tool("horizontal-line"),
      tool("vertical-line"),
      tool("ray"),
      tool("extended-line"),
    ],
  },
  {
    name: "Channels",
    items: [tool("parallel-channel"), tool("regression-trend"), tool("disjoint-channel")],
  },
  {
    name: "Projection",
    items: [tool("long-position"), tool("short-position"), tool("forecast"), tool("bars-pattern")],
  },
  {
    name: "Measurer",
    items: [tool("price-range"), tool("date-range"), tool("date-price-range")],
  },
  {
    name: "Brushes",
    items: [tool("brush"), tool("highlighter")],
  },
  {
    name: "Arrows",
    items: [tool("arrow-marker"), tool("arrow-up"), tool("arrow-down")],
  },
  {
    name: "Shapes",
    items: [tool("rectangle"), tool("rotated-rectangle"), tool("circle"), tool("ellipse"), tool("path")],
  },
  {
    name: "Text",
    items: [tool("text"), tool("anchored-text"), tool("note"), tool("callout"), tool("price-label")],
  },
  {
    name: "Actions",
    items: [
      tool("eraser"),
      { kind: "action", id: "clear-all", label: "Clear All", icon: "clear-all" },
    ],
  },
];
