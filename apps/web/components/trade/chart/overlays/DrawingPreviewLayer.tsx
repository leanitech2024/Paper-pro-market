import React from "react";
import type { Coordinate } from "lightweight-charts";
import type { TwoPointDrawing } from "@/stores/trading/analysis.store";
import type { LocalInteractionState } from "./useDrawingInteraction";
import { TWO_POINT_TOOLS, THREE_POINT_TOOLS, MULTI_POINT_TOOLS } from "./drawingConstants";

interface DrawingPreviewLayerProps {
  localInteraction: LocalInteractionState;
  activeTool: string;
  pointToCoords: (p: { time: number; price: number }) => { x: Coordinate; y: Coordinate } | null;
  renderDrawing: (drawing: any, selected: boolean, isDraft?: boolean) => React.ReactNode;
}

export function DrawingPreviewLayer({
  localInteraction,
  activeTool,
  pointToCoords,
  renderDrawing,
}: DrawingPreviewLayerProps) {
  if (localInteraction.status === "idle") return null;

  return (
    <>
      {/* Box selection preview */}
      {localInteraction.status === "box-selecting" && localInteraction.startPoint && localInteraction.currentPoint && (() => {
        const sc = pointToCoords(localInteraction.startPoint);
        const ec = pointToCoords(localInteraction.currentPoint);
        if (!sc || !ec) return null;
        return (
          <rect
            x={Math.min(sc.x, ec.x)} y={Math.min(sc.y, ec.y)}
            width={Math.abs(ec.x - sc.x)} height={Math.abs(ec.y - sc.y)}
            fill="rgba(33,150,243,0.1)" stroke="#2196F3" strokeWidth={1} strokeDasharray="4 4"
          />
        );
      })()}

      {/* Draft preview for two-point tools */}
      {localInteraction.status === "drawing" && localInteraction.startPoint && localInteraction.currentPoint
        && TWO_POINT_TOOLS.has(activeTool) && (() => {
          const draftDrawing: TwoPointDrawing = {
            id: "__draft__",
            type: activeTool as any,
            visible: true,
            p1: localInteraction.startPoint!,
            p2: localInteraction.currentPoint!,
          };
          return renderDrawing(draftDrawing, false, true);
        })()}

      {/* Draft preview for multi-point tools (shows collected points + current cursor) */}
      {localInteraction.status === "drawing" && localInteraction.collectedPoints.length > 0
        && (THREE_POINT_TOOLS.has(activeTool) || MULTI_POINT_TOOLS.has(activeTool)) && (() => {
          const allPts = [...localInteraction.collectedPoints];
          if (localInteraction.currentPoint) allPts.push(localInteraction.currentPoint);
          // Preview as connected lines
          const coords = allPts
            .map(pointToCoords)
            .filter((c): c is { x: Coordinate; y: Coordinate } => Boolean(c));
          if (coords.length < 2) return null;
          return (
            <polyline
              points={coords.map((c) => `${c.x},${c.y}`).join(" ")}
              fill="none" stroke="#3B82F6" strokeWidth={2} strokeDasharray="4 4"
            />
          );
        })()}

      {/* Freehand preview */}
      {localInteraction.status === "freehand" && localInteraction.collectedPoints.length >= 2 && (() => {
        const coords = localInteraction.collectedPoints
          .map(pointToCoords)
          .filter((c): c is { x: Coordinate; y: Coordinate } => Boolean(c));
        if (coords.length < 2) return null;
        return (
          <polyline
            points={coords.map((c) => `${c.x},${c.y}`).join(" ")}
            fill="none"
            stroke={activeTool === "highlighter" ? "rgba(255,235,59,0.4)" : "#3B82F6"}
            strokeWidth={activeTool === "highlighter" ? 12 : 2}
            strokeLinecap="round" strokeLinejoin="round"
          />
        );
      })()}
    </>
  );
}
