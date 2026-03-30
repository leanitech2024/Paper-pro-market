"use client";

import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import {
  MousePointer2,
  Crosshair,
  TrendingUp,
  Minus,
  ArrowUpRight,
  MoveHorizontal,
  MoveVertical,
  Plus,
  SplitSquareVertical,
  Triangle,
  PenTool,
  Ruler,
  Square,
  Circle,
  Type,
  StickyNote,
  Flag,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Lock,
  Trash2,
  Eye,
  EyeOff,
  Eraser,
  Target,
  Maximize2,
  ChevronRight,
  Paintbrush,
  Highlighter,
  Tag,
  Navigation,
} from "lucide-react";
import type { IconProps } from "@/src/icons/iconTypes";
import {
  AbcdPatternIcon,
  AnchoredNoteIcon,
  AnchoredTextIcon,
  BarsPatternIcon,
  CalloutIcon,
  CommentIcon,
  CurveIcon,
  CyclicLinesIcon,
  CypherPatternIcon,
  DatePriceRangeIcon,
  DateRangeIcon,
  DisjointChannelIcon,
  DoubleCurveIcon,
  ElliottCorrectionIcon,
  ElliottDoubleComboIcon,
  ElliottImpulseIcon,
  ElliottTriangleIcon,
  ElliottTripleComboIcon,
  EllipseIcon,
  FibChannelIcon,
  FibCirclesIcon,
  FibExtensionIcon,
  FibRetracementIcon,
  FibSpeedArcsIcon,
  FibSpeedFanIcon,
  FibSpiralIcon,
  FibTimeExtensionIcon,
  FibTimeZoneIcon,
  GannBoxIcon,
  GannFanIcon,
  GannSquareFixedIcon,
  GannSquareIcon,
  GhostFeedIcon,
  HeadAndShouldersIcon,
  InsidePitchforkIcon,
  LongPositionIcon,
  ModifiedSchiffPitchforkIcon,
  PitchfanIcon,
  PitchforkIcon,
  PolylineIcon,
  PriceRangeIcon,
  RegressionTrendIcon,
  RotatedRectangleIcon,
  SchiffPitchforkIcon,
  ShortPositionIcon,
  SignpostIcon,
  ThreeDrivesIcon,
  TimeCyclesIcon,
  XabcdPatternIcon,
} from "@/src/icons";
import type { ToolType } from "@/stores/trading/analysis.store";
import { useAnalysisStore } from "@/stores/trading/analysis.store";

// ─── Tool Group Definition ───────────────────────────────────────
interface ToolItem {
  id: ToolType;
  label: string;
  icon: string;
  shortcut?: string;
}

interface ToolGroup {
  name: string;
  tools: ToolItem[];
  defaultTool?: ToolType;
}

type ActionButtonProps = {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  className: string;
  suppressTooltip?: boolean;
};

const ActionButton = React.forwardRef<HTMLButtonElement, ActionButtonProps>(
  ({ label, onClick, children, className, suppressTooltip }, ref) => {
    const [isHovered, setIsHovered] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

    const setRefs = useCallback((node: HTMLButtonElement | null) => {
      buttonRef.current = node;
      if (!ref) return;
      if (typeof ref === "function") ref(node);
      else ref.current = node;
    }, [ref]);

    const updateAnchor = useCallback(() => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (rect) setAnchorRect(rect);
    }, []);

    useLayoutEffect(() => {
      if (!isHovered || suppressTooltip) return;
      updateAnchor();
    }, [isHovered, suppressTooltip, updateAnchor]);

    useEffect(() => {
      if (!isHovered || suppressTooltip) return;
      const handle = () => updateAnchor();
      window.addEventListener("resize", handle);
      window.addEventListener("scroll", handle, true);
      return () => {
        window.removeEventListener("resize", handle);
        window.removeEventListener("scroll", handle, true);
      };
    }, [isHovered, suppressTooltip, updateAnchor]);

    const canPortal = typeof document !== "undefined";
    const tooltipEl =
      canPortal && isHovered && !suppressTooltip && anchorRect
        ? createPortal(
            <div
              className={TOOLTIP_CLASS}
              style={{
                left: Math.round(anchorRect.right + 8),
                top: Math.round(anchorRect.top + anchorRect.height / 2),
                transform: "translateY(-50%)",
              }}
            >
              {label}
            </div>,
            document.body,
          )
        : null;

    return (
      <>
        <button
          ref={setRefs}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={onClick}
          title={label}
          className={className}
        >
          {children}
        </button>
        {tooltipEl}
      </>
    );
  },
);

ActionButton.displayName = "ActionButton";

const ICON_SIZE = 22;
const TOOL_ICON_CLASS = "w-[22px] h-[22px]";
const TOOL_BUTTON_SIZE_CLASS = "w-[30px] h-[30px]";
const TOOLTIP_CLASS =
  "fixed z-[9999] rounded-md bg-white/95 px-2 py-1 text-[10px] text-slate-700 shadow-lg border border-slate-200/80 whitespace-nowrap dark:bg-[#0c1322]/95 dark:text-slate-200 dark:border-white/[0.08]";
const EXPAND_BUTTON_CLASS =
  "absolute -right-1 -bottom-1 flex h-4 w-4 items-center justify-center rounded-full border border-slate-200/80 bg-white/95 text-slate-500 transition dark:bg-[#0c1322]/95 dark:text-slate-400 dark:border-white/[0.08]";
const DEFAULT_TOOL_ICON = MousePointer2;

const TOOL_ICONS: Record<string, React.ComponentType<IconProps>> = {
  "cursor": MousePointer2,
  "crosshair": Crosshair,
  "select": MousePointer2,
  "trendline": TrendingUp,
  "ray": ArrowUpRight,
  "info-line": Ruler,
  "extended-line": Minus,
  "trend-angle": Navigation,
  "horizontal-line": MoveHorizontal,
  "horizontal-ray": ArrowRight,
  "vertical-line": MoveVertical,
  "cross-line": Plus,
  "parallel-channel": SplitSquareVertical,
  "flat-top-bottom": Maximize2,
  "pitchfork": PitchforkIcon,
  "schiff-pitchfork": SchiffPitchforkIcon,
  "modified-schiff-pitchfork": ModifiedSchiffPitchforkIcon,
  "inside-pitchfork": InsidePitchforkIcon,
  "fib-retracement": FibRetracementIcon,
  "fib-extension": FibExtensionIcon,
  "fib-channel": FibChannelIcon,
  "fib-time-zone": FibTimeZoneIcon,
  "fib-time-extension": FibTimeExtensionIcon,
  "fib-speed-fan": FibSpeedFanIcon,
  "fib-circles": FibCirclesIcon,
  "fib-spiral": FibSpiralIcon,
  "fib-speed-arcs": FibSpeedArcsIcon,
  "pitchfan": PitchfanIcon,
  "gann-box": GannBoxIcon,
  "gann-square-fixed": GannSquareFixedIcon,
  "gann-square": GannSquareIcon,
  "gann-fan": GannFanIcon,
  "xabcd-pattern": XabcdPatternIcon,
  "cypher-pattern": CypherPatternIcon,
  "abcd-pattern": AbcdPatternIcon,
  "head-shoulders": HeadAndShouldersIcon,
  "three-drives-pattern": ThreeDrivesIcon,
  "elliott-impulse": ElliottImpulseIcon,
  "elliott-correction": ElliottCorrectionIcon,
  "elliott-triangle": ElliottTriangleIcon,
  "elliott-double-combo": ElliottDoubleComboIcon,
  "elliott-triple-combo": ElliottTripleComboIcon,
  "cyclic-lines": CyclicLinesIcon,
  "time-cycles": TimeCyclesIcon,
  "long-position": LongPositionIcon,
  "short-position": ShortPositionIcon,
  "forecast": Target,
  "bars-pattern": BarsPatternIcon,
  "ghost-feed": GhostFeedIcon,
  "price-range": PriceRangeIcon,
  "date-range": DateRangeIcon,
  "date-price-range": DatePriceRangeIcon,
  "regression-trend": RegressionTrendIcon,
  "disjoint-channel": DisjointChannelIcon,
  "brush": Paintbrush,
  "highlighter": Highlighter,
  "arrow-marker": ArrowUp,
  "arrow-up": ArrowUp,
  "arrow-down": ArrowDown,
  "arrow-left": ArrowLeft,
  "arrow-right": ArrowRight,
  "rectangle": Square,
  "rotated-rectangle": RotatedRectangleIcon,
  "path": PenTool,
  "circle": Circle,
  "ellipse": EllipseIcon,
  "curve": CurveIcon,
  "double-curve": DoubleCurveIcon,
  "polyline": PolylineIcon,
  "triangle-shape": Triangle,
  "fib-wedge": Triangle,
  "triangle-pattern": Triangle,
  "text": Type,
  "anchored-text": AnchoredTextIcon,
  "note": StickyNote,
  "anchored-note": AnchoredNoteIcon,
  "callout": CalloutIcon,
  "comment": CommentIcon,
  "price-label": Tag,
  "signpost": SignpostIcon,
  "flag-mark": Flag,
};

const resolveToolIcon = (key: string) => TOOL_ICONS[key] ?? DEFAULT_TOOL_ICON;

const TOOL_GROUPS: ToolGroup[] = [
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

// ─── ToolbarGroup Component ──────────────────────────────────────
function ToolbarGroup({
  group,
  activeTool,
  onSelect,
  openGroup,
  setOpenGroup,
  scrollContainerRef,
}: {
  group: ToolGroup;
  activeTool: ToolType;
  onSelect: (tool: ToolType) => void;
  openGroup: string | null;
  setOpenGroup: (value: string | null) => void;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const groupRef = useRef<HTMLDivElement>(null);
  const isGroupActive = group.tools.some((t) => t.id === activeTool);
  const activeTool_ = group.tools.find((t) => t.id === activeTool);
  const displayTool = activeTool_ ?? group.tools.find((t) => t.id === group.defaultTool) ?? group.tools[0];
  const Icon = resolveToolIcon(displayTool.icon);
  const isExpandable = group.tools.length > 1;
  const isOpen = openGroup === group.name;
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  const handleToggle = useCallback(
    (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if (!isExpandable) return;
      setOpenGroup(openGroup === group.name ? null : group.name);
    },
    [group.name, isExpandable, openGroup, setOpenGroup],
  );

  const handleSelect = useCallback((tool: ToolType) => {
    onSelect(tool);
    if (isExpandable) setOpenGroup(null);
  }, [isExpandable, onSelect, setOpenGroup]);

  const updateAnchor = useCallback(() => {
    const rect = groupRef.current?.getBoundingClientRect();
    if (rect) setAnchorRect(rect);
  }, []);

  useLayoutEffect(() => {
    if (!isOpen && !isHovered) return;
    updateAnchor();
  }, [isOpen, isHovered, updateAnchor]);

  useEffect(() => {
    if (!isOpen && !isHovered) return;
    const handle = () => updateAnchor();
    const scrollEl = scrollContainerRef.current;
    window.addEventListener("resize", handle);
    window.addEventListener("scroll", handle, true);
    if (scrollEl) scrollEl.addEventListener("scroll", handle);
    return () => {
      window.removeEventListener("resize", handle);
      window.removeEventListener("scroll", handle, true);
      if (scrollEl) scrollEl.removeEventListener("scroll", handle);
    };
  }, [isOpen, isHovered, updateAnchor, scrollContainerRef]);

  const canPortal = typeof document !== "undefined";
  const tooltipEl =
    canPortal && isHovered && !isOpen && anchorRect
      ? createPortal(
          <div
            className={TOOLTIP_CLASS}
            style={{
              left: Math.round(anchorRect.right + 8),
              top: Math.round(anchorRect.top + anchorRect.height / 2),
              transform: "translateY(-50%)",
            }}
          >
            {displayTool.label}
          </div>,
          document.body,
        )
      : null;

  const popoverEl =
    canPortal && isOpen && isExpandable && anchorRect
        ? createPortal(
            (() => {
              const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 0;
              const containerMaxHeight = viewportHeight ? Math.min(320, Math.max(200, viewportHeight - 16)) : 260;
              const headerHeight = 28;
              const scrollMaxHeight = Math.max(140, containerMaxHeight - headerHeight);
              const top = viewportHeight
                ? Math.max(8, Math.min(anchorRect.top, viewportHeight - containerMaxHeight - 8))
                : Math.round(anchorRect.top);
              return (
                <div
                  data-toolbar-popover="true"
                  className="fixed z-[9999] flex flex-col py-1 bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-lg shadow-2xl min-w-[190px] dark:bg-[#0c1322]/95 dark:border-white/[0.08]"
                  style={{
                    left: Math.round(anchorRect.right + 8),
                    top,
                    maxHeight: containerMaxHeight,
                  }}
                >
                  <div className="px-2.5 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400/70">
                    {group.name}
                  </div>
                  <div
                    className="overflow-y-auto px-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    style={{ maxHeight: scrollMaxHeight }}
                  >
                    {group.tools.map((tool) => (
                      <button
                        key={tool.id}
                        onClick={() => handleSelect(tool.id)}
                        className={`
                          flex items-center gap-2.5 w-full px-2.5 py-1.5 text-xs transition-colors
                          ${tool.id === activeTool
                            ? "bg-blue-600/15 text-blue-500 dark:text-blue-400"
                            : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/[0.06] dark:hover:text-white"
                          }
                        `}
                      >
                        <span className="w-4 flex-shrink-0">
                          {(() => {
                            const ToolIcon = resolveToolIcon(tool.icon);
                            return <ToolIcon className={TOOL_ICON_CLASS} />;
                          })()}
                        </span>
                        <span className="flex-1 text-left">{tool.label}</span>
                        {tool.shortcut && (
                          <span className="text-[9px] text-slate-400 font-mono">{tool.shortcut}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })(),
            document.body,
          )
      : null;

  return (
    <div
      ref={groupRef}
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main button */}
      <button
        onClick={() => {
          onSelect(displayTool.id);
        }}
        title={`${displayTool.label}${displayTool.shortcut ? ` (${displayTool.shortcut})` : ""}`}
        className={`
          group flex items-center justify-center ${TOOL_BUTTON_SIZE_CLASS} rounded-md transition-all duration-150
          ${isGroupActive
            ? "bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/40"
            : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-slate-100"
          }
        `}
      >
        <span className="relative">
          <Icon className={TOOL_ICON_CLASS} />
        </span>
      </button>

      {/* Small expand icon */}
      {isExpandable && (isHovered || isOpen) && (
        <button
          type="button"
          onClick={handleToggle}
          title={`Expand ${group.name}`}
          className={`
            ${EXPAND_BUTTON_CLASS}
            ${isOpen ? "text-blue-500 border-blue-500/50 dark:text-blue-400" : "hover:text-slate-900 dark:hover:text-slate-100"}
          `}
        >
          <ChevronRight size={10} className={`${isOpen ? "rotate-90" : ""}`} />
        </button>
      )}

      {tooltipEl}
      {popoverEl}
    </div>
  );
}

// ─── ChartToolbar Component ──────────────────────────────────────
export function ChartToolbar({ symbol }: { symbol: string }) {
  const activeTool = useAnalysisStore((s) => s.activeTool);
  const setActiveTool = useAnalysisStore((s) => s.setActiveTool);
  const globalHideState = useAnalysisStore((s) => s.globalHideState);
  const setGlobalHide = useAnalysisStore((s) => s.setGlobalHide);
  const lockAllDrawings = useAnalysisStore((s) => s.lockAllDrawings);
  const unlockAllDrawings = useAnalysisStore((s) => s.unlockAllDrawings);
  const clearAllDrawings = useAnalysisStore((s) => s.clearAllDrawings);
  const hideAll = useAnalysisStore((s) => s.hideAll);
  const showAll = useAnalysisStore((s) => s.showAll);

  const [isLocked, setIsLocked] = useState(false);
  const [showHideMenu, setShowHideMenu] = useState(false);
  const hideMenuButtonRef = useRef<HTMLButtonElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [hideMenuAnchor, setHideMenuAnchor] = useState<DOMRect | null>(null);
  const [isHideHovered, setIsHideHovered] = useState(false);

  const handleLockToggle = useCallback(() => {
    if (isLocked) {
      unlockAllDrawings(symbol);
    } else {
      lockAllDrawings(symbol);
    }
    setIsLocked(!isLocked);
  }, [isLocked, symbol, lockAllDrawings, unlockAllDrawings]);

  const updateHideMenuAnchor = useCallback(() => {
    const rect = hideMenuButtonRef.current?.getBoundingClientRect();
    if (rect) setHideMenuAnchor(rect);
  }, []);

  useLayoutEffect(() => {
    if (!showHideMenu) {
      setHideMenuAnchor(null);
      return;
    }
    updateHideMenuAnchor();
  }, [showHideMenu, updateHideMenuAnchor]);

  useEffect(() => {
    if (!showHideMenu) return;
    const handle = () => updateHideMenuAnchor();
    const scrollEl = toolbarRef.current;
    window.addEventListener("resize", handle);
    window.addEventListener("scroll", handle, true);
    if (scrollEl) scrollEl.addEventListener("scroll", handle);
    return () => {
      window.removeEventListener("resize", handle);
      window.removeEventListener("scroll", handle, true);
      if (scrollEl) scrollEl.removeEventListener("scroll", handle);
    };
  }, [showHideMenu, updateHideMenuAnchor]);

  // Close hide menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target?.closest?.('[data-hide-menu="true"]')) return;
      if (hideMenuButtonRef.current && hideMenuButtonRef.current.contains(target)) return;
      setShowHideMenu(false);
    };
    if (showHideMenu) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showHideMenu]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target?.closest?.('[data-toolbar-popover="true"]')) return;
      if (toolbarRef.current && !toolbarRef.current.contains(target)) {
        setOpenGroup(null);
      }
    };
    if (openGroup) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openGroup]);

  const canPortal = typeof document !== "undefined";
  const hideMenuEl =
    canPortal && showHideMenu && hideMenuAnchor
      ? createPortal(
          (() => {
            const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 0;
            const containerMaxHeight = viewportHeight ? Math.min(320, Math.max(200, viewportHeight - 16)) : 260;
            const headerHeight = 28;
            const scrollMaxHeight = Math.max(140, containerMaxHeight - headerHeight);
            const top = viewportHeight
              ? Math.max(8, Math.min(hideMenuAnchor.top, viewportHeight - containerMaxHeight - 8))
              : Math.round(hideMenuAnchor.top);
            return (
              <div
                data-hide-menu="true"
                className="fixed z-[9999] flex flex-col py-1 bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-lg shadow-2xl min-w-[180px] dark:bg-[#0c1322]/95 dark:border-white/[0.08]"
                style={{
                  left: Math.round(hideMenuAnchor.right + 8),
                  top,
                  maxHeight: containerMaxHeight,
                }}
              >
                <div className="px-2.5 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400/70">
                  Hide Options
                </div>
                <div
                  className="overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  style={{ maxHeight: scrollMaxHeight }}
                >
                  {([
                    { key: "drawings" as const, label: "Hide Drawings" },
                    { key: "indicators" as const, label: "Hide Indicators" },
                    { key: "positions" as const, label: "Hide Positions & Orders" },
                  ]).map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setGlobalHide(key, !globalHideState[key])}
                      className="flex items-center gap-2.5 w-full px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors dark:text-slate-300 dark:hover:bg-white/[0.06] dark:hover:text-white"
                    >
                      {globalHideState[key] ? <EyeOff size={12} className="text-slate-400 dark:text-slate-500" /> : <Eye size={12} className="text-blue-500" />}
                      <span>{label}</span>
                    </button>
                  ))}
                  <div className="h-px bg-slate-200/70 dark:bg-white/[0.08] my-1" />
                  <button
                    onClick={() => { hideAll(symbol); setShowHideMenu(false); }}
                    className="w-full px-2.5 py-1.5 text-xs text-blue-500 hover:bg-blue-50 text-left transition-colors dark:text-blue-400 dark:hover:bg-blue-900/20"
                  >
                    Hide All
                  </button>
                  <button
                    onClick={() => { showAll(symbol); setShowHideMenu(false); }}
                    className="w-full px-2.5 py-1.5 text-xs text-blue-500 hover:bg-blue-50 text-left transition-colors dark:text-blue-400 dark:hover:bg-blue-900/20"
                  >
                    Show All
                  </button>
                </div>
              </div>
            );
          })(),
          document.body,
        )
      : null;

  return (
    <div
      ref={toolbarRef}
      className="flex h-full flex-col items-center gap-1 py-1 px-1 bg-white/95 backdrop-blur-sm border-r border-slate-200/80 select-none overflow-y-auto overflow-x-hidden
      dark:bg-[#0c1322]/95 dark:border-white/[0.08]
      [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ width: 56 }}
    >
        {/* Tool groups + Actions */}
        {[...TOOL_GROUPS.map((group, index) => ({ kind: "tools" as const, group, index })), { kind: "actions" as const }].map((section) => {
          if (section.kind === "tools") {
            const i = section.index;
            return (
              <React.Fragment key={section.group.name}>
                {/* Separator between cursor group and drawing groups, and before actions */}
                {(i === 1 || i === 10) && <div className="w-5 h-px bg-slate-200/70 dark:bg-white/[0.08] my-0.5" />}
                <ToolbarGroup
                  group={section.group}
                  activeTool={activeTool}
                  onSelect={setActiveTool}
                  openGroup={openGroup}
                  setOpenGroup={setOpenGroup}
                  scrollContainerRef={toolbarRef}
                />
              </React.Fragment>
            );
          }

          return (
            <React.Fragment key="actions">
              {/* ─── Separator ─── */}
              <div className="w-5 h-px bg-slate-200/70 dark:bg-white/[0.08] my-1" />
              <div className="flex flex-col items-center gap-1">
                <ActionButton
                  label="Eraser"
                  onClick={() => setActiveTool("eraser")}
                  className={`flex items-center justify-center ${TOOL_BUTTON_SIZE_CLASS} rounded-md transition-all ${
                    activeTool === "eraser"
                      ? "bg-red-600/20 text-red-500 ring-1 ring-red-500/40 dark:text-red-400"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-slate-100"
                  }`}
                >
                  <Eraser size={ICON_SIZE} strokeWidth={1.5} />
                </ActionButton>

                <ActionButton
                  label={isLocked ? "Unlock All Drawings" : "Lock All Drawings"}
                  onClick={handleLockToggle}
                  className={`flex items-center justify-center ${TOOL_BUTTON_SIZE_CLASS} rounded-md transition-all ${
                    isLocked
                      ? "bg-amber-600/20 text-amber-500 ring-1 ring-amber-500/40 dark:text-amber-400"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-slate-100"
                  }`}
                >
                  <Lock size={ICON_SIZE} strokeWidth={1.5} />
                </ActionButton>

                <ActionButton
                  label="Clear All Drawings"
                  onClick={() => clearAllDrawings(symbol)}
                  className={`flex items-center justify-center ${TOOL_BUTTON_SIZE_CLASS} rounded-md text-slate-500 hover:bg-red-50 hover:text-red-500 transition-all dark:text-slate-400 dark:hover:bg-red-900/20 dark:hover:text-red-400`}
                >
                  <Trash2 size={ICON_SIZE} strokeWidth={1.5} />
                </ActionButton>

                <div
                  className="relative"
                  onMouseEnter={() => setIsHideHovered(true)}
                  onMouseLeave={() => setIsHideHovered(false)}
                >
                  <ActionButton
                    ref={hideMenuButtonRef}
                    label="Hide Options"
                    onClick={() => setShowHideMenu(!showHideMenu)}
                    suppressTooltip={showHideMenu}
                    className={`flex items-center justify-center ${TOOL_BUTTON_SIZE_CLASS} rounded-md transition-all ${
                      Object.values(globalHideState).some(Boolean)
                        ? "bg-slate-100 text-slate-900 dark:bg-white/[0.08] dark:text-white"
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-slate-100"
                    }`}
                  >
                    {Object.values(globalHideState).some(Boolean) ? <EyeOff size={ICON_SIZE} strokeWidth={1.5} /> : <Eye size={ICON_SIZE} strokeWidth={1.5} />}
                  </ActionButton>

                  {(isHideHovered || showHideMenu) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowHideMenu((prev) => !prev);
                      }}
                      title="Expand Hide Options"
                      className={`
                        ${EXPAND_BUTTON_CLASS}
                        ${showHideMenu ? "text-blue-500 border-blue-500/50 dark:text-blue-400" : "hover:text-slate-900 dark:hover:text-slate-100"}
                      `}
                    >
                      <ChevronRight size={10} className={`${showHideMenu ? "rotate-90" : ""}`} />
                    </button>
                  )}
                </div>
              </div>
              {hideMenuEl}
            </React.Fragment>
          );
        })}
    </div>
  );
}
