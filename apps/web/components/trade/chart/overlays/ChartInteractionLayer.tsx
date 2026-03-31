import React, { ReactNode } from "react";
import { useAnalysisStore } from "@/stores/trading/analysis.store";
import { isDrawingTool } from "./drawingConstants";

interface ChartInteractionLayerProps {
  width: number;
  height: number;
  svgRef: React.RefObject<SVGSVGElement | null>;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  children: ReactNode;
}

export function ChartInteractionLayer({
  width,
  height,
  svgRef,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  children,
}: ChartInteractionLayerProps) {
  const { activeTool } = useAnalysisStore();
  const isActive = isDrawingTool(activeTool) || activeTool === "select" || activeTool === "eraser";

  return (
    <div
      className={`absolute inset-0 z-50 ${isActive ? "pointer-events-auto" : "pointer-events-none"}`}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      style={{
        cursor: isDrawingTool(activeTool) ? "crosshair" : activeTool === "eraser" ? "not-allowed" : activeTool === "select" ? "default" : "auto",
      }}
    >
      <svg ref={svgRef as any} width={width} height={height} className="absolute inset-0">
        {children}
      </svg>
    </div>
  );
}
