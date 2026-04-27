"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronRight } from "lucide-react";
import type { ToolGroup } from "./toolConfig";
import { EXPAND_BUTTON_CLASS, TOOL_BUTTON_SIZE_CLASS, TOOL_ICON_CLASS, TOOLTIP_CLASS } from "./toolConfig";
import { resolveToolIcon } from "./toolIcons";
import { ToolbarPopover } from "./ToolbarPopover";
import type { ToolType } from "@/domains/chart/stores/analysis.store";

interface ToolbarGroupProps {
  group: ToolGroup;
  activeTool: ToolType;
  onSelect: (tool: ToolType, rect?: DOMRect) => void;
  openGroup: string | null;
  setOpenGroup: (value: string | null) => void;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
}

export function ToolbarGroup({
  group,
  activeTool,
  onSelect,
  openGroup,
  setOpenGroup,
  scrollContainerRef,
}: ToolbarGroupProps) {
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
    const rect = groupRef.current?.getBoundingClientRect();
    onSelect(tool, rect);
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
    canPortal && isHovered && !isOpen && !openGroup && anchorRect
      ? createPortal(
          <div
            className={TOOLTIP_CLASS}
            style={{
              left: Math.round(anchorRect.right + (isExpandable ? 20 : 12)),
              top: Math.round(anchorRect.top + anchorRect.height / 2),
              transform: "translateY(-50%)",
            }}
          >
            {displayTool.label}
            {displayTool.shortcut && (
              <span className="ml-1.5 text-slate-400 dark:text-slate-500 font-mono text-[9px]">
                {displayTool.shortcut}
              </span>
            )}
          </div>,
          document.body,
        )
      : null;

  const popoverEl =
    isOpen && isExpandable && anchorRect ? (
      <ToolbarPopover anchorRect={anchorRect} title={group.name} minWidth={190} dataAttribute="toolbar-popover">
        {group.tools.map((tool) => {
          const ToolIcon = resolveToolIcon(tool.icon);
          return (
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
                <ToolIcon className={TOOL_ICON_CLASS} />
              </span>
              <span className="flex-1 text-left">{tool.label}</span>
              {tool.shortcut && (
                <span className="text-[9px] text-slate-400 font-mono">{tool.shortcut}</span>
              )}
            </button>
          );
        })}
      </ToolbarPopover>
    ) : null;

  return (
    <div
      ref={groupRef}
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        onClick={() => {
          const rect = groupRef.current?.getBoundingClientRect();
          onSelect(displayTool.id, rect);
        }}
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

      {isExpandable && (isHovered || isOpen) && (
        <button
          type="button"
          onClick={handleToggle}
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
