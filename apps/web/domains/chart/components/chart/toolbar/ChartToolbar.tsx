"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAnalysisStore } from "@/domains/chart/stores/analysis.store";

import { ToolbarGroup } from "./ToolbarGroup";
import { ToolbarPopover } from "./ToolbarPopover";
import {
  ACTION_GROUPS,
  TOOL_GROUPS,
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

  const toolbarRef = useRef<HTMLDivElement>(null);

  const handleLockToggle = useCallback(() => {
    if (isLocked) {
      unlockAllDrawings(symbol);
    } else {
      lockAllDrawings(symbol);
    }
    setIsLocked(!isLocked);
  }, [isLocked, symbol, lockAllDrawings, unlockAllDrawings]);


  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target?.closest?.('[data-hide-menu="true"]')) return;
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
      className="flex h-full flex-col items-center gap-2 py-3 px-1.5 bg-white/95 backdrop-blur-sm border-r border-slate-200/80 select-none overflow-y-auto overflow-x-hidden dark:bg-[#0c1322]/95 dark:border-white/[0.08] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ width: 62 }}
    >
      {[
        ...TOOL_GROUPS.map((group, index) => ({ kind: "tools" as const, group, index })),
        { kind: "separator" as const },
        ...ACTION_GROUPS.map((group, index) => ({ kind: "actions" as const, group, index }))
      ].map((section, sectionIdx) => {
        if (section.kind === "separator") {
          return <div key={`sep-${sectionIdx}`} className="w-5 h-px bg-slate-200/70 dark:bg-white/[0.08] my-1" />;
        }
        if (section.kind === "tools" || section.kind === "actions") {
          const group = section.group;
          return (
            <ToolbarGroup
              key={group.name}
              group={group}
              activeTool={
                section.kind === "actions"
                  ? (group.tools.find(t => {
                      if (t.id === "eraser") return activeTool === "eraser";
                      if (t.id === "lock") return isLocked;
                      if (t.id === "hide") return Object.values(globalHideState).some(Boolean);
                      return false;
                    })?.id || "" as any)
                  : activeTool
              }
              onSelect={(toolId, rect) => {
                if (toolId === "lock") {
                  handleLockToggle();
                } else if (toolId === "clear") {
                  clearAllDrawings(symbol);
                } else if (toolId === "hide") {
                  if (rect) setHideMenuAnchor(rect);
                  setShowHideMenu(!showHideMenu);
                } else {
                  setActiveTool(toolId);
                }
              }}
              openGroup={openGroup}
              setOpenGroup={setOpenGroup}
              scrollContainerRef={toolbarRef}
            />
          );
        }

        return null;
      })}
      {hideMenuPopover}
    </div>
  );
}
