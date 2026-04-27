"use client";

import React from "react";
import { createPortal } from "react-dom";

interface ToolbarPopoverProps {
  anchorRect: DOMRect | null;
  title?: string;
  minWidth?: number;
  maxHeight?: number;
  dataAttribute?: string;
  children: React.ReactNode;
}

export function ToolbarPopover({
  anchorRect,
  title,
  minWidth = 190,
  maxHeight = 320,
  dataAttribute,
  children,
}: ToolbarPopoverProps) {
  const canPortal = typeof document !== "undefined";
  if (!canPortal || !anchorRect) return null;

  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 0;
  const containerMaxHeight = viewportHeight ? Math.min(maxHeight, Math.max(200, viewportHeight - 16)) : maxHeight;
  const headerHeight = title ? 28 : 0;
  const scrollMaxHeight = Math.max(140, containerMaxHeight - headerHeight);
  const top = viewportHeight
    ? Math.max(8, Math.min(anchorRect.top, viewportHeight - containerMaxHeight - 8))
    : Math.round(anchorRect.top);

  const dataProps = dataAttribute
    ? ({ [`data-${dataAttribute}`]: "true" } as Record<string, string>)
    : {};

  return createPortal(
    <div
      {...dataProps}
      className="fixed z-[9999] flex flex-col py-1 bg-white/95 border border-slate-200/80 rounded-lg shadow-2xl min-w-[190px] dark:bg-[#131a2b]/95 dark:border-white/[0.1] backdrop-blur-xl"
      style={{
        left: Math.round(anchorRect.right + 20),
        top,
        minWidth,
        maxHeight: containerMaxHeight,
      }}
    >
      {title && (
        <div className="px-2.5 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400/70">
          {title}
        </div>
      )}
      <div
        className="overflow-y-auto px-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ maxHeight: scrollMaxHeight }}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
