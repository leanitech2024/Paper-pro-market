"use client";

import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import {
  MousePointer2, Crosshair, TrendingUp, Minus, ArrowUpRight, MoveHorizontal,
  MoveVertical, Plus, GitBranch, SplitSquareVertical, BarChart3, Triangle,
  PenTool, Ruler, Square, Circle, Type, StickyNote, Flag, ArrowUp, ArrowDown,
  ArrowLeft, ArrowRight, Lock, Trash2, Eye, EyeOff, Eraser, Target,
  Maximize2, Hash, Waves, ChevronRight, Paintbrush, Highlighter,
  MessageSquare, Tag, Navigation, TrendingDown, Hexagon, Diamond,
} from "lucide-react";
import type { DrawingType, ToolType } from "@/stores/trading/analysis.store";
import { useAnalysisStore } from "@/stores/trading/analysis.store";

// ─── Tool Group Definition ───────────────────────────────────────
interface ToolItem {
  id: ToolType;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
}

interface ToolGroup {
  name: string;
  tools: ToolItem[];
  defaultTool?: ToolType;
}

const ICON_SIZE = 16;
const ICON_PROPS = { size: ICON_SIZE, strokeWidth: 1.5 };

const TOOL_GROUPS: ToolGroup[] = [
  {
    name: "Cursor",
    tools: [
      { id: "cursor", label: "Cursor", icon: <MousePointer2 {...ICON_PROPS} />, shortcut: "V" },
      { id: "crosshair", label: "Crosshair", icon: <Crosshair {...ICON_PROPS} />, shortcut: "C" },
    ],
  },
  {
    name: "Lines",
    tools: [
      { id: "trendline", label: "Trend Line", icon: <TrendingUp {...ICON_PROPS} />, shortcut: "Alt+T" },
      { id: "ray", label: "Ray", icon: <ArrowUpRight {...ICON_PROPS} /> },
      { id: "info-line", label: "Info Line", icon: <Ruler {...ICON_PROPS} /> },
      { id: "extended-line", label: "Extended Line", icon: <Minus {...ICON_PROPS} /> },
      { id: "trend-angle", label: "Trend Angle", icon: <Navigation {...ICON_PROPS} /> },
      { id: "horizontal-line", label: "Horizontal Line", icon: <MoveHorizontal {...ICON_PROPS} />, shortcut: "Alt+H" },
      { id: "horizontal-ray", label: "Horizontal Ray", icon: <ArrowRight {...ICON_PROPS} /> },
      { id: "vertical-line", label: "Vertical Line", icon: <MoveVertical {...ICON_PROPS} />, shortcut: "Alt+V" },
      { id: "cross-line", label: "Cross Line", icon: <Plus {...ICON_PROPS} />, shortcut: "Alt+C" },
    ],
    defaultTool: "trendline",
  },
  {
    name: "Channels",
    tools: [
      { id: "parallel-channel", label: "Parallel Channel", icon: <SplitSquareVertical {...ICON_PROPS} /> },
      { id: "regression-trend", label: "Regression Trend", icon: <TrendingUp {...ICON_PROPS} /> },
      { id: "flat-top-bottom", label: "Flat Top/Bottom", icon: <Maximize2 {...ICON_PROPS} /> },
      { id: "disjoint-channel", label: "Disjoint Channel", icon: <SplitSquareVertical {...ICON_PROPS} /> },
    ],
    defaultTool: "parallel-channel",
  },
  {
    name: "Pitchforks",
    tools: [
      { id: "pitchfork", label: "Pitchfork", icon: <GitBranch {...ICON_PROPS} /> },
      { id: "schiff-pitchfork", label: "Schiff Pitchfork", icon: <GitBranch {...ICON_PROPS} /> },
      { id: "modified-schiff-pitchfork", label: "Modified Schiff", icon: <GitBranch {...ICON_PROPS} /> },
      { id: "inside-pitchfork", label: "Inside Pitchfork", icon: <GitBranch {...ICON_PROPS} /> },
    ],
    defaultTool: "pitchfork",
  },
  {
    name: "Fibonacci",
    tools: [
      { id: "fib-retracement", label: "Fib Retracement", icon: <BarChart3 {...ICON_PROPS} /> },
      { id: "fib-extension", label: "Fib Extension", icon: <BarChart3 {...ICON_PROPS} /> },
      { id: "fib-channel", label: "Fib Channel", icon: <BarChart3 {...ICON_PROPS} /> },
      { id: "fib-time-zone", label: "Fib Time Zone", icon: <Hash {...ICON_PROPS} /> },
      { id: "fib-speed-fan", label: "Fib Speed Fan", icon: <Waves {...ICON_PROPS} /> },
      { id: "fib-time-extension", label: "Fib Time Extension", icon: <Hash {...ICON_PROPS} /> },
      { id: "fib-circles", label: "Fib Circles", icon: <Circle {...ICON_PROPS} /> },
      { id: "fib-spiral", label: "Fib Spiral", icon: <Circle {...ICON_PROPS} /> },
      { id: "fib-speed-arcs", label: "Fib Speed Arcs", icon: <Circle {...ICON_PROPS} /> },
      { id: "fib-wedge", label: "Fib Wedge", icon: <Triangle {...ICON_PROPS} /> },
      { id: "pitchfan", label: "Pitchfan", icon: <Waves {...ICON_PROPS} /> },
    ],
    defaultTool: "fib-retracement",
  },
  {
    name: "Gann",
    tools: [
      { id: "gann-box", label: "Gann Box", icon: <Square {...ICON_PROPS} /> },
      { id: "gann-square-fixed", label: "Gann Square Fixed", icon: <Square {...ICON_PROPS} /> },
      { id: "gann-square", label: "Gann Square", icon: <Square {...ICON_PROPS} /> },
      { id: "gann-fan", label: "Gann Fan", icon: <Waves {...ICON_PROPS} />, shortcut: "Alt+F" },
    ],
    defaultTool: "gann-box",
  },
  {
    name: "Patterns",
    tools: [
      { id: "xabcd-pattern", label: "XABCD Pattern", icon: <Diamond {...ICON_PROPS} /> },
      { id: "cypher-pattern", label: "Cypher Pattern", icon: <Diamond {...ICON_PROPS} /> },
      { id: "head-shoulders", label: "Head & Shoulders", icon: <Hexagon {...ICON_PROPS} /> },
      { id: "abcd-pattern", label: "ABCD Pattern", icon: <Diamond {...ICON_PROPS} /> },
      { id: "triangle-pattern", label: "Triangle Pattern", icon: <Triangle {...ICON_PROPS} /> },
      { id: "three-drives-pattern", label: "Three Drives", icon: <TrendingUp {...ICON_PROPS} /> },
    ],
    defaultTool: "xabcd-pattern",
  },
  {
    name: "Elliott",
    tools: [
      { id: "elliott-impulse", label: "Impulse (12345)", icon: <TrendingUp {...ICON_PROPS} /> },
      { id: "elliott-correction", label: "Correction (ABC)", icon: <TrendingDown {...ICON_PROPS} /> },
      { id: "elliott-triangle", label: "Triangle (ABCDE)", icon: <Triangle {...ICON_PROPS} /> },
      { id: "elliott-double-combo", label: "Double Combo (WXY)", icon: <Waves {...ICON_PROPS} /> },
      { id: "elliott-triple-combo", label: "Triple Combo (WXYXZ)", icon: <Waves {...ICON_PROPS} /> },
    ],
    defaultTool: "elliott-impulse",
  },
  {
    name: "Cycles",
    tools: [
      { id: "cyclic-lines", label: "Cyclic Lines", icon: <Hash {...ICON_PROPS} /> },
      { id: "time-cycles", label: "Time Cycles", icon: <Hash {...ICON_PROPS} /> },
    ],
    defaultTool: "cyclic-lines",
  },
  {
    name: "Projection",
    tools: [
      { id: "long-position", label: "Long Position", icon: <TrendingUp {...ICON_PROPS} />, shortcut: "L" },
      { id: "short-position", label: "Short Position", icon: <TrendingDown {...ICON_PROPS} />, shortcut: "S" },
      { id: "forecast", label: "Forecast", icon: <Target {...ICON_PROPS} /> },
      { id: "bars-pattern", label: "Bars Pattern", icon: <BarChart3 {...ICON_PROPS} /> },
      { id: "ghost-feed", label: "Ghost Feed", icon: <Eye {...ICON_PROPS} /> },
    ],
    defaultTool: "long-position",
  },
  {
    name: "Measurer",
    tools: [
      { id: "price-range", label: "Price Range", icon: <Ruler {...ICON_PROPS} /> },
      { id: "date-range", label: "Date Range", icon: <Ruler {...ICON_PROPS} /> },
      { id: "date-price-range", label: "Date & Price Range", icon: <Ruler {...ICON_PROPS} />, shortcut: "M" },
    ],
    defaultTool: "date-price-range",
  },
  {
    name: "Brushes",
    tools: [
      { id: "brush", label: "Brush", icon: <Paintbrush {...ICON_PROPS} />, shortcut: "B" },
      { id: "highlighter", label: "Highlighter", icon: <Highlighter {...ICON_PROPS} /> },
    ],
    defaultTool: "brush",
  },
  {
    name: "Arrows",
    tools: [
      { id: "arrow-marker", label: "Arrow Marker", icon: <ArrowUp {...ICON_PROPS} /> },
      { id: "arrow-up", label: "Arrow Up", icon: <ArrowUp {...ICON_PROPS} /> },
      { id: "arrow-down", label: "Arrow Down", icon: <ArrowDown {...ICON_PROPS} /> },
      { id: "arrow-left", label: "Arrow Left", icon: <ArrowLeft {...ICON_PROPS} /> },
      { id: "arrow-right", label: "Arrow Right", icon: <ArrowRight {...ICON_PROPS} /> },
    ],
    defaultTool: "arrow-marker",
  },
  {
    name: "Shapes",
    tools: [
      { id: "rectangle", label: "Rectangle", icon: <Square {...ICON_PROPS} />, shortcut: "R" },
      { id: "rotated-rectangle", label: "Rotated Rectangle", icon: <Square {...ICON_PROPS} /> },
      { id: "path", label: "Path", icon: <PenTool {...ICON_PROPS} /> },
      { id: "circle", label: "Circle", icon: <Circle {...ICON_PROPS} /> },
      { id: "ellipse", label: "Ellipse", icon: <Circle {...ICON_PROPS} /> },
      { id: "polyline", label: "Polyline", icon: <PenTool {...ICON_PROPS} />, shortcut: "Alt+Shift+R" },
      { id: "triangle-shape", label: "Triangle", icon: <Triangle {...ICON_PROPS} /> },
      { id: "curve", label: "Curve", icon: <Waves {...ICON_PROPS} /> },
      { id: "double-curve", label: "Double Curve", icon: <Waves {...ICON_PROPS} /> },
    ],
    defaultTool: "rectangle",
  },
  {
    name: "Text",
    tools: [
      { id: "text", label: "Text", icon: <Type {...ICON_PROPS} />, shortcut: "T" },
      { id: "anchored-text", label: "Anchored Text", icon: <Type {...ICON_PROPS} /> },
      { id: "note", label: "Note", icon: <StickyNote {...ICON_PROPS} /> },
      { id: "anchored-note", label: "Anchored Note", icon: <StickyNote {...ICON_PROPS} /> },
      { id: "callout", label: "Callout", icon: <MessageSquare {...ICON_PROPS} /> },
      { id: "comment", label: "Comment", icon: <MessageSquare {...ICON_PROPS} /> },
      { id: "price-label", label: "Price Label", icon: <Tag {...ICON_PROPS} /> },
      { id: "signpost", label: "Signpost", icon: <Flag {...ICON_PROPS} /> },
      { id: "flag-mark", label: "Flag Mark", icon: <Flag {...ICON_PROPS} /> },
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
            className="fixed z-[9999] rounded-md bg-white/95 px-2 py-1 text-[10px] text-slate-700 shadow-lg border border-slate-200/80 whitespace-nowrap dark:bg-[#0c1322]/95 dark:text-slate-200 dark:border-white/[0.08]"
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
          <div
            data-toolbar-popover="true"
            className="fixed z-[9999] py-1 bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-lg shadow-2xl min-w-[190px] dark:bg-[#0c1322]/95 dark:border-white/[0.08]"
            style={{
              left: Math.round(anchorRect.right + 8),
              top: Math.round(anchorRect.top),
            }}
          >
            <div className="px-2.5 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400/70">
              {group.name}
            </div>
            <div className="max-h-[260px] overflow-y-auto px-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                  <span className="w-4 flex-shrink-0">{tool.icon}</span>
                  <span className="flex-1 text-left">{tool.label}</span>
                  {tool.shortcut && (
                    <span className="text-[9px] text-slate-400 font-mono">{tool.shortcut}</span>
                  )}
                </button>
              ))}
            </div>
          </div>,
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
          group flex items-center justify-center w-8 h-8 rounded-md transition-all duration-150
          ${isGroupActive
            ? "bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/40"
            : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-slate-100"
          }
        `}
      >
        <span className="relative">
          {displayTool.icon}
        </span>
      </button>

      {/* Small expand icon */}
      {isExpandable && (isHovered || isOpen) && (
        <button
          type="button"
          onClick={handleToggle}
          title={`Expand ${group.name}`}
          className={`
            absolute -right-1 -bottom-1 flex h-4 w-4 items-center justify-center rounded-full border border-slate-200/80
            bg-white/95 text-slate-500 transition dark:bg-[#0c1322]/95 dark:text-slate-400 dark:border-white/[0.08]
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
  const hideMenuRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  const handleLockToggle = useCallback(() => {
    if (isLocked) {
      unlockAllDrawings(symbol);
    } else {
      lockAllDrawings(symbol);
    }
    setIsLocked(!isLocked);
  }, [isLocked, symbol, lockAllDrawings, unlockAllDrawings]);

  // Close hide menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (hideMenuRef.current && !hideMenuRef.current.contains(e.target as Node)) {
        setShowHideMenu(false);
      }
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

  return (
    <div
      ref={toolbarRef}
      className="flex h-full flex-col items-center gap-1.5 py-2 px-2 bg-white/95 backdrop-blur-sm border-r border-slate-200/80 select-none overflow-y-auto overflow-x-hidden
      dark:bg-[#0c1322]/95 dark:border-white/[0.08]
      [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ width: 56 }}
    >
        {/* Tool groups */}
        {TOOL_GROUPS.map((group, i) => (
          <React.Fragment key={group.name}>
            {/* Separator between cursor group and drawing groups, and before actions */}
            {(i === 1 || i === 10) && <div className="w-5 h-px bg-slate-200/70 dark:bg-white/[0.08] my-1" />}
            <ToolbarGroup
              group={group}
              activeTool={activeTool}
              onSelect={setActiveTool}
              openGroup={openGroup}
              setOpenGroup={setOpenGroup}
              scrollContainerRef={toolbarRef}
            />
          </React.Fragment>
        ))}

        {/* ─── Separator ─── */}
        <div className="w-5 h-px bg-slate-200/70 dark:bg-white/[0.08] my-1.5" />

        {/* Eraser */}
        <button onClick={() => setActiveTool("eraser")}
          title="Eraser"
          className={`flex items-center justify-center w-8 h-8 rounded-md transition-all ${
            activeTool === "eraser" ? "bg-red-600/20 text-red-500 ring-1 ring-red-500/40 dark:text-red-400"
            : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-slate-100"
          }`}>
          <Eraser size={ICON_SIZE} strokeWidth={1.5} />
        </button>

        {/* Lock */}
        <button onClick={handleLockToggle}
          title={isLocked ? "Unlock All Drawings" : "Lock All Drawings"}
          className={`flex items-center justify-center w-8 h-8 rounded-md transition-all ${
            isLocked ? "bg-amber-600/20 text-amber-500 ring-1 ring-amber-500/40 dark:text-amber-400"
            : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-slate-100"
          }`}>
          <Lock size={ICON_SIZE} strokeWidth={1.5} />
        </button>

        {/* Clear */}
        <button onClick={() => clearAllDrawings(symbol)}
          title="Clear All Drawings"
        className="flex items-center justify-center w-8 h-8 rounded-md text-slate-500 hover:bg-red-50 hover:text-red-500 transition-all dark:text-slate-400 dark:hover:bg-red-900/20 dark:hover:text-red-400">
          <Trash2 size={ICON_SIZE} strokeWidth={1.5} />
        </button>

        {/* ─── Hide Options ─── */}
        <div className="relative" ref={hideMenuRef}>
          <button
            onClick={() => setShowHideMenu(!showHideMenu)}
            title="Hide Options"
            className={`flex items-center justify-center w-8 h-8 rounded-md transition-all ${
              Object.values(globalHideState).some(Boolean)
                ? "bg-slate-100 text-slate-900 dark:bg-white/[0.08] dark:text-white"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-slate-100"
            }`}
          >
            {Object.values(globalHideState).some(Boolean) ? <EyeOff size={ICON_SIZE} strokeWidth={1.5} /> : <Eye size={ICON_SIZE} strokeWidth={1.5} />}
          </button>

          {showHideMenu && (
            <div className="absolute left-full bottom-0 ml-1 z-50 py-1 bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-lg shadow-2xl min-w-[180px] dark:bg-[#0c1322]/95 dark:border-white/[0.08]">
              <div className="px-2.5 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400/70">
                Hide Options
              </div>
              {([
                { key: "drawings" as const, label: "Hide Drawings" },
                { key: "indicators" as const, label: "Hide Indicators" },
                { key: "positions" as const, label: "Hide Positions & Orders" },
              ]).map(({ key, label }) => (
                <button key={key}
                  onClick={() => setGlobalHide(key, !globalHideState[key])}
                  className="flex items-center gap-2.5 w-full px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors dark:text-slate-300 dark:hover:bg-white/[0.06] dark:hover:text-white"
                >
                  {globalHideState[key] ? <EyeOff size={12} className="text-slate-400 dark:text-slate-500" /> : <Eye size={12} className="text-emerald-500" />}
                  <span>{label}</span>
                </button>
              ))}
              <div className="h-px bg-slate-200/70 dark:bg-white/[0.08] my-1" />
              <button onClick={() => { hideAll(symbol); setShowHideMenu(false); }}
                className="w-full px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-50 text-left transition-colors dark:text-red-400 dark:hover:bg-red-900/20">
                Hide All
              </button>
              <button onClick={() => { showAll(symbol); setShowHideMenu(false); }}
                className="w-full px-2.5 py-1.5 text-xs text-emerald-600 hover:bg-emerald-50 text-left transition-colors dark:text-emerald-400 dark:hover:bg-emerald-900/20">
                Show All
              </button>
            </div>
          )}
        </div>
    </div>
  );
}
