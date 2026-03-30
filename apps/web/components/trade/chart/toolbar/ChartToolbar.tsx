"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronRight, Eye, EyeOff, Eraser, Lock, Trash2 } from "lucide-react";
import { useAnalysisStore } from "@/stores/trading/analysis.store";
import { ActionButton } from "./ActionButton";
import { ToolbarGroup } from "./ToolbarGroup";
import { ToolbarPopover } from "./ToolbarPopover";
import {
  EXPAND_BUTTON_CLASS,
  TOOL_BUTTON_SIZE_CLASS,
  TOOL_GROUPS,
  TOOL_ICON_SIZE,
} from "./toolConfig";

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
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [hideMenuAnchor, setHideMenuAnchor] = useState<DOMRect | null>(null);
  const [isHideHovered, setIsHideHovered] = useState(false);

  const hideMenuButtonRef = useRef<HTMLButtonElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

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

  const hideMenuPopover = showHideMenu && hideMenuAnchor ? (
    <ToolbarPopover anchorRect={hideMenuAnchor} title="Hide Options" minWidth={180} dataAttribute="hide-menu">
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
          {globalHideState[key] ? (
            <EyeOff size={12} className="text-slate-400 dark:text-slate-500" />
          ) : (
            <Eye size={12} className="text-blue-500" />
          )}
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
    </ToolbarPopover>
  ) : null;

  return (
    <div
      ref={toolbarRef}
      className="flex h-full flex-col items-center gap-1 py-1 px-1 bg-white/95 backdrop-blur-sm border-r border-slate-200/80 select-none overflow-y-auto overflow-x-hidden dark:bg-[#0c1322]/95 dark:border-white/[0.08] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ width: 56 }}
    >
      {[...TOOL_GROUPS.map((group, index) => ({ kind: "tools" as const, group, index })), { kind: "actions" as const }].map((section) => {
        if (section.kind === "tools") {
          const i = section.index;
          return (
            <React.Fragment key={section.group.name}>
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
                <Eraser size={TOOL_ICON_SIZE} strokeWidth={1.5} />
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
                <Lock size={TOOL_ICON_SIZE} strokeWidth={1.5} />
              </ActionButton>

              <ActionButton
                label="Clear All Drawings"
                onClick={() => clearAllDrawings(symbol)}
                className={`flex items-center justify-center ${TOOL_BUTTON_SIZE_CLASS} rounded-md text-slate-500 hover:bg-red-50 hover:text-red-500 transition-all dark:text-slate-400 dark:hover:bg-red-900/20 dark:hover:text-red-400`}
              >
                <Trash2 size={TOOL_ICON_SIZE} strokeWidth={1.5} />
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
                  {Object.values(globalHideState).some(Boolean) ? (
                    <EyeOff size={TOOL_ICON_SIZE} strokeWidth={1.5} />
                  ) : (
                    <Eye size={TOOL_ICON_SIZE} strokeWidth={1.5} />
                  )}
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
            {hideMenuPopover}
          </React.Fragment>
        );
      })}
    </div>
  );
}
