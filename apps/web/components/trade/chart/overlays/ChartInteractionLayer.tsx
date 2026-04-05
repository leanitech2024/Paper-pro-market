import React, { ReactNode } from "react";
import { useAnalysisStore } from "@/stores/trading/analysis.store";
import { isDrawingTool } from "./drawingConstants";

interface ChartInteractionLayerProps {
  width: number;
  height: number;
  svgRef: React.RefObject<SVGSVGElement | null>;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseLeave?: () => void;
  onMouseUp: (e: React.MouseEvent) => void;
  cursor?: string;
  children: ReactNode;
}

export function ChartInteractionLayer({
  width,
  height,
  svgRef,
  onMouseDown,
  onMouseMove,
  onMouseLeave,
  onMouseUp,
  cursor,
  children,
}: ChartInteractionLayerProps) {
  const { activeTool } = useAnalysisStore();
  const isEditTool = activeTool === "select" || activeTool === "cursor" || activeTool === "crosshair";
  const isActive = isDrawingTool(activeTool) || isEditTool || activeTool === "eraser";

  return (
    <div
      className={`absolute inset-0 z-50 ${isActive ? "pointer-events-auto" : "pointer-events-none"}`}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onMouseUp={onMouseUp}
      style={{
        cursor:
          cursor ??
          (isDrawingTool(activeTool)
            ? "crosshair"
            : activeTool === "eraser"
            ? "not-allowed"
            : activeTool === "crosshair"
            ? "crosshair"
            : isEditTool
            ? "default"
            : "auto"),
      }}
    >
      <svg ref={svgRef as any} width={width} height={height} className="absolute inset-0">
        <defs>
          <clipPath id="chart-clip">
            <rect x={0} y={0} width={Math.max(0, width - 60)} height={Math.max(0, height - 26)} />
          </clipPath>
        </defs>
        {children}
      </svg>
    </div>
  );
}
