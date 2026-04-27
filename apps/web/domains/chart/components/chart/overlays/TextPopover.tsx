import React, { useMemo, useEffect, useState } from "react";
import type { Point, TextDrawing as TextDrawingType, DrawingType } from "@/domains/chart/stores/analysis.store";
import type { Coordinate } from "lightweight-charts";
import { useAnalysisStore } from "@/domains/chart/stores/analysis.store";

interface TextPopoverProps {
  dialogState: {
    isOpen: boolean;
    point: Point | null;
    type: string;
    close: () => void;
  };
  symbol: string;
  pointToCoords: (p: Point) => { x: Coordinate; y: Coordinate } | null;
  width: number;
  height: number;
  popoverRef: React.RefObject<HTMLDivElement | null>;
}

export function TextPopover({ dialogState, symbol, pointToCoords, width, height, popoverRef }: TextPopoverProps) {
  const { addDrawing } = useAnalysisStore();
  const [textValue, setTextValue] = useState("Note");

  useEffect(() => {
    if (dialogState.isOpen) {
      setTextValue("Note");
    }
  }, [dialogState.isOpen]);

  const handleTextSubmit = () => {
    if (textValue && dialogState.point) {
      addDrawing(symbol, {
        type: dialogState.type as DrawingType,
        point: dialogState.point,
        text: textValue,
        visible: true,
      } as Omit<TextDrawingType, "id">);
    }
    dialogState.close();
  };

  const textPopoverAnchor = dialogState.point ? pointToCoords(dialogState.point) : null;
  
  const textPopoverStyle = useMemo(() => {
    if (!textPopoverAnchor) return null;
    const popoverWidth = 210;
    const popoverHeight = 34;
    const pad = 6;
    let left = textPopoverAnchor.x + 8;
    let top = textPopoverAnchor.y + 8;
    if (left + popoverWidth > width - pad) left = width - popoverWidth - pad;
    if (left < pad) left = pad;
    if (top + popoverHeight > height - pad) top = height - popoverHeight - pad;
    if (top < pad) top = pad;
    return { left, top };
  }, [height, textPopoverAnchor, width]);

  if (!dialogState.isOpen || !textPopoverAnchor || !textPopoverStyle) return null;

  return (
    <div
      ref={popoverRef as any}
      className="absolute z-[60]"
      style={{ left: textPopoverStyle.left, top: textPopoverStyle.top }}
    >
      <div className="rounded-md border border-slate-200/80 bg-white/95 px-1.5 py-1 shadow-lg backdrop-blur-md dark:border-white/[0.08] dark:bg-[#0c1322]/95">
        <div className="flex items-center gap-1.5">
          <input
            id="text-annotation"
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            placeholder="Enter text..."
            onKeyDown={(e) => { if (e.key === "Enter") handleTextSubmit(); }}
            autoFocus
            className="h-7 w-32 rounded border border-slate-200/80 bg-transparent px-2 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-300 dark:border-white/[0.08] dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          <button
            type="button"
            onClick={handleTextSubmit}
            className="h-7 w-7 rounded text-[12px] font-semibold text-white"
            style={{ backgroundColor: "#14338a" }}
            title="Add"
          >
            ✓
          </button>
          <button
            type="button"
            onClick={dialogState.close}
            className="h-7 w-7 rounded border border-slate-200/80 text-[12px] text-slate-500 hover:text-slate-900 dark:border-white/[0.08] dark:text-slate-400 dark:hover:text-slate-100"
            title="Cancel"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
