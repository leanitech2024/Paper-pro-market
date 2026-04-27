import { useCallback, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type RefObject } from "react";

import {
  useAnalysisStore,
  type Point,
  type Drawing,
  type DrawingType,
} from "@/domains/chart/stores/analysis.store";
import {
  SINGLE_CLICK_TOOLS,
  TEXT_TOOLS,
  POSITION_TOOLS,
  FREEHAND_TOOLS,
  THREE_POINT_TOOLS,
  MULTI_POINT_TOOLS,
  TWO_POINT_TOOLS,
  isDrawingTool,
  REQUIRED_POINTS,
  ELLIOTT_LABELS,
  PATTERN_LABELS,
} from "@/domains/chart/components/chart/overlays/drawingConstants";

import {
  createDrawingId,
  getBodyTarget,
  getTargetElement,
} from "./useDrawingHandlers";
import type { LocalInteractionState, InteractionHandleType } from "./useDrawingState";
import { resetLocalInteraction } from "./useDrawingState";

type InteractionEvent = ReactPointerEvent<SVGSVGElement> | ReactMouseEvent;

const getHandleCursor = (handleType: InteractionHandleType) =>
  handleType === "start-time" ||
  handleType === "end-time" ||
  handleType === "left" ||
  handleType === "right"
    ? "ew-resize"
    : handleType === "top" || handleType === "bottom"
    ? "ns-resize"
    : handleType === "p1" || handleType === "p2"
    ? "nwse-resize"
    : "ns-resize";

export function useDrawingEvents({
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
  isTextDialogOpen,
  openTextPopover,
  setInteractionCursor,
  snapPoint,
  createDefaultPositionDrawing,
  resolveNearestHandleTarget,
  moveDrawing,
  queueDrawingUpdates,
  resizeDrawing,
  flushPendingDrawings,
}: {
  symbol: string;
  drawings: Drawing[];
  coordsToPoint: (x: number, y: number) => Point | null;
  svgRef: RefObject<SVGSVGElement | null>;
  activeTool: string;
  addDrawing: (symbol: string, drawing: Omit<Drawing, "id">) => void;
  selectedDrawingIds: string[];
  setSelectedDrawings: (ids: string[]) => void;
  toggleDrawingSelection: (id: string, additive?: boolean) => void;
  isEditMode: boolean;
  localInteraction: LocalInteractionState;
  setLocalInteraction: React.Dispatch<React.SetStateAction<LocalInteractionState>>;
  isTextDialogOpen: boolean;
  openTextPopover: (point: Point, toolType: string) => void;
  setInteractionCursor: React.Dispatch<React.SetStateAction<string | undefined>>;
  snapPoint: (point: Point) => Point;
  createDefaultPositionDrawing: (
    tool: "long-position" | "short-position",
    point: Point,
    mouseX: number
  ) => Drawing;
  resolveNearestHandleTarget: (mouseX: number, mouseY: number) => {
    kind: "handle";
    drawingId: string;
    handleType: InteractionHandleType;
    cursor: string;
  } | null;
  moveDrawing: (drawing: Drawing, dxTime: number, dyPrice: number) => Drawing;
  queueDrawingUpdates: (updates: Drawing[]) => void;
  resizeDrawing: (drawing: Drawing, handleType: InteractionHandleType, point: Point) => Drawing;
  flushPendingDrawings: () => void;
}) {
  const handleMouseDown = useCallback(
    (e: InteractionEvent, isTargetInPopover: boolean) => {
      if (isTextDialogOpen && isTargetInPopover) return;

      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const point = coordsToPoint(mouseX, mouseY);
      if (!point) return;
      const snappedPoint = snapPoint(point);

      const targetElement = getTargetElement(e.target);
      const bodyTarget = getBodyTarget(e.target);
      const drawingId = targetElement?.getAttribute("data-id");
      const explicitHandleType = targetElement?.getAttribute("data-handle") as InteractionHandleType | null;
      const drawing = drawingId ? drawings.find((item) => item.id === drawingId) : undefined;

      if (activeTool === "eraser" && drawingId) {
        useAnalysisStore.getState().deleteDrawing(symbol, drawingId);
        return;
      }

      if (isEditMode) {
        if (drawing && explicitHandleType && !drawing.locked) {
          e.preventDefault();
          e.stopPropagation();
          setLocalInteraction({
            status: "resizing",
            startPoint: snappedPoint,
            currentPoint: snappedPoint,
            activeDrawingIds: [drawing.id],
            originalDrawings: { [drawing.id]: drawing },
            collectedPoints: [],
            handleType: explicitHandleType,
          });
          setInteractionCursor(getHandleCursor(explicitHandleType));
          setSelectedDrawings([drawing.id]);
          return;
        }

        const nearestHandle = resolveNearestHandleTarget(mouseX, mouseY);

        if (nearestHandle?.kind === "handle") {
          e.preventDefault();
          e.stopPropagation();

          const handleDrawing = drawings.find((item) => item.id === nearestHandle.drawingId);
          if (handleDrawing && !handleDrawing.locked) {
            setLocalInteraction({
              status: "resizing",
              startPoint: snappedPoint,
              currentPoint: snappedPoint,
              activeDrawingIds: [nearestHandle.drawingId],
              originalDrawings: { [nearestHandle.drawingId]: handleDrawing },
              collectedPoints: [],
              handleType: nearestHandle.handleType,
            });
            setInteractionCursor(nearestHandle.cursor);
            setSelectedDrawings([nearestHandle.drawingId]);
            return;
          }
        }

        if (drawing && !isDrawingTool(activeTool as DrawingType)) {
          e.preventDefault();
          e.stopPropagation();
          const additive = e.ctrlKey || e.metaKey;

          if (additive) toggleDrawingSelection(drawing.id, true);
          else if (!selectedDrawingIds.includes(drawing.id)) setSelectedDrawings([drawing.id]);

          if (!drawing.locked && bodyTarget) {
            const targetIds = selectedDrawingIds.includes(drawing.id) ? selectedDrawingIds : [drawing.id];
            const draggableIds = targetIds.filter((id) => drawings.find((item) => item.id === id && !item.locked));
            if (draggableIds.length === 0) return;

            const originals = draggableIds.reduce(
              (acc, id) => {
                const item = drawings.find((candidate) => candidate.id === id);
                if (item) acc[id] = item;
                return acc;
              },
              {} as Record<string, Drawing>
            );

            setLocalInteraction({
              status: "dragging",
              startPoint: snappedPoint,
              currentPoint: snappedPoint,
              activeDrawingIds: draggableIds,
              originalDrawings: originals,
              collectedPoints: [],
            });
            setInteractionCursor("grabbing");
            setSelectedDrawings(draggableIds);
            return;
          }
        }

        if (!drawingId) {
          if (activeTool === "crosshair") {
            return;
          }
          if (activeTool === "cursor") {
            if (!(e.ctrlKey || e.metaKey)) setSelectedDrawings([]);
            return;
          }
          if (!(e.ctrlKey || e.metaKey)) setSelectedDrawings([]);
          setLocalInteraction({
            status: "box-selecting",
            startPoint: snappedPoint,
            currentPoint: snappedPoint,
            activeDrawingIds: [],
            originalDrawings: {},
            collectedPoints: [],
          });
          setInteractionCursor(undefined);
          return;
        }
      }

      if (SINGLE_CLICK_TOOLS.has(activeTool as DrawingType)) {
        const toolType = activeTool as DrawingType;
        if (activeTool === "horizontal-line") {
          addDrawing(symbol, { type: "horizontal-line", price: snappedPoint.price, visible: true } as any);
        } else if (["vertical-line", "cross-line", "horizontal-ray"].includes(activeTool)) {
          addDrawing(symbol, { type: toolType, point: snappedPoint, visible: true } as any);
        } else {
          addDrawing(symbol, { type: toolType, point: snappedPoint, visible: true, text: "" } as any);
        }
        return;
      }

      if (TEXT_TOOLS.has(activeTool as DrawingType)) {
        openTextPopover(snappedPoint, activeTool);
        return;
      }

      if (POSITION_TOOLS.has(activeTool as DrawingType)) {
        const next = createDefaultPositionDrawing(activeTool as "long-position" | "short-position", snappedPoint, mouseX);
        addDrawing(symbol, next as any);
        useAnalysisStore.getState().setSelectedDrawings([next.id]);
        useAnalysisStore.getState().setActiveTool("cursor");
        setInteractionCursor("grab");
        return;
      }

      if (FREEHAND_TOOLS.has(activeTool as DrawingType)) {
        setLocalInteraction({
          status: "freehand",
          startPoint: snappedPoint,
          currentPoint: snappedPoint,
          activeDrawingIds: [],
          originalDrawings: {},
          collectedPoints: [snappedPoint],
        });
        return;
      }

      if (THREE_POINT_TOOLS.has(activeTool as DrawingType) || MULTI_POINT_TOOLS.has(activeTool as DrawingType)) {
        const updated = [...localInteraction.collectedPoints, snappedPoint];
        const required = REQUIRED_POINTS[activeTool as DrawingType] ?? 0;

        if (required > 0 && updated.length >= required) {
          if (THREE_POINT_TOOLS.has(activeTool as DrawingType)) {
            addDrawing(
              symbol,
              { type: activeTool as DrawingType, p1: updated[0], p2: updated[1], p3: updated[2], visible: true } as any
            );
          } else {
            const labels =
              ELLIOTT_LABELS[activeTool as keyof typeof ELLIOTT_LABELS] ??
              PATTERN_LABELS[activeTool as keyof typeof PATTERN_LABELS];
            addDrawing(symbol, { type: activeTool as DrawingType, points: updated, labels, visible: true } as any);
          }
          setLocalInteraction(resetLocalInteraction());
        } else {
          setLocalInteraction((prev) => ({
            ...prev,
            status: "drawing",
            startPoint: prev.startPoint ?? snappedPoint,
            currentPoint: snappedPoint,
            collectedPoints: updated,
          }));
        }
        return;
      }

      if (TWO_POINT_TOOLS.has(activeTool as DrawingType)) {
        setLocalInteraction({
          status: "drawing",
          startPoint: snappedPoint,
          currentPoint: snappedPoint,
          activeDrawingIds: [],
          originalDrawings: {},
          collectedPoints: [],
        });
      }
    },
    [
      activeTool,
      addDrawing,
      coordsToPoint,
      createDefaultPositionDrawing,
      drawings,
      isEditMode,
      isTextDialogOpen,
      localInteraction.collectedPoints,
      openTextPopover,
      resolveNearestHandleTarget,
      selectedDrawingIds,
      setInteractionCursor,
      setLocalInteraction,
      setSelectedDrawings,
      snapPoint,
      svgRef,
      symbol,
      toggleDrawingSelection,
    ]
  );

  const handleMouseMove = useCallback(
    (e: InteractionEvent) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const point = coordsToPoint(mouseX, mouseY);
      if (!point) return;

      if (localInteraction.status === "idle") {
        if (!isEditMode) {
          setInteractionCursor(undefined);
          return;
        }

        const nearestHandle = resolveNearestHandleTarget(mouseX, mouseY);
        if (nearestHandle) {
          setInteractionCursor(nearestHandle.cursor);
          return;
        }

        const targetElement = getTargetElement(e.target);
        const hoveredId = targetElement?.getAttribute("data-id");
        const hoveredHandleType = targetElement?.getAttribute("data-handle") as InteractionHandleType | null;
        const hoveredDrawing = hoveredId ? drawings.find((item) => item.id === hoveredId) : undefined;
        if (hoveredHandleType) {
          setInteractionCursor(getHandleCursor(hoveredHandleType));
          return;
        }
        if (hoveredDrawing && !hoveredDrawing.locked && getBodyTarget(e.target)) {
          setInteractionCursor("grab");
          return;
        }

        setInteractionCursor(undefined);
        return;
      }

      const snappedPoint = snapPoint(point);

      if (localInteraction.status === "freehand") {
        setLocalInteraction((prev) => ({
          ...prev,
          currentPoint: point,
          collectedPoints: [...prev.collectedPoints, point],
        }));
        return;
      }

      setLocalInteraction((prev) => ({ ...prev, currentPoint: snappedPoint }));

      if (localInteraction.status === "dragging" && localInteraction.activeDrawingIds.length > 0) {
        if (!localInteraction.startPoint) return;
        const dxTime = snappedPoint.time - localInteraction.startPoint.time;
        const dyPrice = snappedPoint.price - localInteraction.startPoint.price;
        const updates = localInteraction.activeDrawingIds
          .map((id) => {
            const original = localInteraction.originalDrawings[id];
            return original ? moveDrawing(original, dxTime, dyPrice) : null;
          })
          .filter((drawing): drawing is Drawing => Boolean(drawing));

        setInteractionCursor("grabbing");
        queueDrawingUpdates(updates);
        return;
      }

      if (localInteraction.status === "resizing" && localInteraction.activeDrawingIds.length > 0) {
        const id = localInteraction.activeDrawingIds[0];
        const original = localInteraction.originalDrawings[id];
        if (!original || !localInteraction.handleType) return;
        const update = resizeDrawing(original, localInteraction.handleType, snappedPoint);
        setInteractionCursor(getHandleCursor(localInteraction.handleType));
        queueDrawingUpdates([update]);
      }
    },
    [
      coordsToPoint,
      drawings,
      isEditMode,
      localInteraction,
      moveDrawing,
      queueDrawingUpdates,
      resolveNearestHandleTarget,
      resizeDrawing,
      setInteractionCursor,
      setLocalInteraction,
      snapPoint,
      svgRef,
    ]
  );

  const handleMouseLeave = useCallback(() => {
    if (localInteraction.status === "idle") setInteractionCursor(undefined);
  }, [localInteraction.status, setInteractionCursor]);

  const handleMouseUp = useCallback(() => {
    flushPendingDrawings();

    if (localInteraction.status === "drawing" && localInteraction.startPoint && localInteraction.currentPoint) {
      if (TWO_POINT_TOOLS.has(activeTool as DrawingType)) {
        const nextDrawing =
          activeTool === "price-range"
            ? {
                id: createDrawingId(),
                type: activeTool as DrawingType,
                visible: true,
                p1: localInteraction.startPoint,
                p2: {
                  time: localInteraction.startPoint.time,
                  price: localInteraction.currentPoint.price,
                },
              }
            : {
                id: createDrawingId(),
                type: activeTool as DrawingType,
                visible: true,
                p1: localInteraction.startPoint,
                p2: localInteraction.currentPoint,
              };
        addDrawing(symbol, nextDrawing as any);
        if (
          activeTool === "forecast" ||
          activeTool === "price-range" ||
          activeTool === "date-range" ||
          activeTool === "date-price-range"
        ) {
          useAnalysisStore.getState().setSelectedDrawings([nextDrawing.id]);
          useAnalysisStore.getState().setActiveTool("cursor");
        }
      }
      if (!THREE_POINT_TOOLS.has(activeTool as DrawingType) && !MULTI_POINT_TOOLS.has(activeTool as DrawingType)) {
        setLocalInteraction(resetLocalInteraction());
      }
    } else if (localInteraction.status === "freehand" && localInteraction.collectedPoints.length >= 2) {
      addDrawing(
        symbol,
        {
          type: activeTool as DrawingType,
          points: localInteraction.collectedPoints,
          strokeWidth: activeTool === "highlighter" ? 12 : 2,
          opacity: activeTool === "highlighter" ? 0.3 : 1,
          visible: true,
        } as any
      );
      setLocalInteraction(resetLocalInteraction());
    } else if (
      localInteraction.status === "box-selecting" &&
      localInteraction.startPoint &&
      localInteraction.currentPoint
    ) {
      const { startPoint: p1, currentPoint: p2 } = localInteraction;
      const tMin = Math.min(p1.time, p2.time);
      const tMax = Math.max(p1.time, p2.time);
      const priceMin = Math.min(p1.price, p2.price);
      const priceMax = Math.max(p1.price, p2.price);

      const selectedIds = drawings
        .filter((drawing) => {
          if ("p1" in drawing && "p2" in drawing) {
            return (
              Math.min(drawing.p1.time, drawing.p2.time) <= tMax &&
              Math.max(drawing.p1.time, drawing.p2.time) >= tMin &&
              Math.min(drawing.p1.price, drawing.p2.price) <= priceMax &&
              Math.max(drawing.p1.price, drawing.p2.price) >= priceMin
            );
          }

          if ("point" in drawing) {
            return (
              drawing.point.time >= tMin &&
              drawing.point.time <= tMax &&
              drawing.point.price >= priceMin &&
              drawing.point.price <= priceMax
            );
          }

          if ("price" in drawing) {
            return drawing.price >= priceMin && drawing.price <= priceMax;
          }

          return false;
        })
        .map((drawing) => drawing.id);

      setSelectedDrawings(selectedIds);
      setLocalInteraction(resetLocalInteraction());
    } else if (localInteraction.status === "dragging" || localInteraction.status === "resizing") {
      setLocalInteraction(resetLocalInteraction());
    }

    setInteractionCursor(undefined);
  }, [
    activeTool,
    addDrawing,
    drawings,
    flushPendingDrawings,
    localInteraction,
    setInteractionCursor,
    setLocalInteraction,
    setSelectedDrawings,
    symbol,
  ]);

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseLeave,
    handleMouseUp,
  };
}
