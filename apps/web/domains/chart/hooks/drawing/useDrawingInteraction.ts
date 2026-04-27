// ⚠️ Internal dependency chain:
// useDrawingState → useDrawingHandlers → useDrawingEvents
// Order matters due to shared interaction state and handlers
import { type RefObject } from "react";

import {
  useAnalysisStore,
  type Point,
  type Drawing,
} from "@/domains/chart/stores/analysis.store";
import { useDrawingEvents } from "@/domains/chart/hooks/drawing/useDrawingEvents";
import { useDrawingHandlers } from "@/domains/chart/hooks/drawing/useDrawingHandlers";
import { useDrawingState } from "@/domains/chart/hooks/drawing/useDrawingState";
export type { LocalInteractionState } from "@/domains/chart/hooks/drawing/useDrawingState";

export function useDrawingInteraction({
  symbol,
  drawings,
  pointToCoords,
  coordsToPoint,
  snapTime,
  snapPrice,
  timeInterval,
  height,
  svgRef,
}: {
  symbol: string;
  drawings: Drawing[];
  pointToCoords: (point: Point) => { x: number; y: number } | null;
  coordsToPoint: (x: number, y: number) => Point | null;
  snapTime: (time: number) => number;
  snapPrice: (price: number) => number;
  timeInterval: number;
  height: number;
  svgRef: RefObject<SVGSVGElement | null>;
}) {
  const { activeTool, addDrawing } = useAnalysisStore();
  const selectedDrawingIds = useAnalysisStore((state) => state.selectedDrawingIds);
  const setSelectedDrawings = useAnalysisStore((state) => state.setSelectedDrawings);
  const toggleDrawingSelection = useAnalysisStore((state) => state.toggleDrawingSelection);
  const isEditMode =
    activeTool === "select" || activeTool === "cursor" || activeTool === "crosshair";

  const {
    localInteraction,
    setLocalInteraction,
    interactionCursor,
    setInteractionCursor,
    textDialog,
    openTextPopover,
    snapPoint,
    minDuration,
    minPriceGap,
    flushPendingDrawings,
    queueDrawingUpdates,
  } = useDrawingState({
    symbol,
    timeInterval,
    snapTime,
    snapPrice,
  });

  const {
    resolveNearestHandleTarget,
    createDefaultPositionDrawing,
    moveDrawing,
    resizeDrawing,
  } = useDrawingHandlers({
    drawings,
    pointToCoords,
    coordsToPoint,
    snapTime,
    snapPrice,
    height,
    timeInterval,
    minDuration,
    minPriceGap,
    snapPoint,
    selectedDrawingIds,
    isEditMode,
  });

  const {
    handleMouseDown,
    handleMouseMove,
    handleMouseLeave,
    handleMouseUp,
  } = useDrawingEvents({
    symbol,
    drawings,
    coordsToPoint,
    svgRef,
    activeTool,
    addDrawing,
    selectedDrawingIds,
    setSelectedDrawings,
    toggleDrawingSelection,
    isEditMode,
    localInteraction,
    setLocalInteraction,
    isTextDialogOpen: textDialog.isOpen,
    openTextPopover,
    setInteractionCursor,
    snapPoint,
    createDefaultPositionDrawing,
    resolveNearestHandleTarget,
    moveDrawing,
    queueDrawingUpdates,
    resizeDrawing,
    flushPendingDrawings,
  });

  return {
    localInteraction,
    setLocalInteraction,
    handleMouseDown,
    handleMouseMove,
    handleMouseLeave,
    handleMouseUp,
    interactionCursor,
    textDialog,
  };
}
