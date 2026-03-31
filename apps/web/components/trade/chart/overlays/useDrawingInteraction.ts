import { useState, useCallback } from "react";
import { useAnalysisStore, type Point, type Drawing, type DrawingType, type TwoPointDrawing, type PositionDrawing } from "@/stores/trading/analysis.store";
import {
  SINGLE_CLICK_TOOLS, TEXT_TOOLS, POSITION_TOOLS, FREEHAND_TOOLS,
  THREE_POINT_TOOLS, MULTI_POINT_TOOLS, TWO_POINT_TOOLS, isDrawingTool,
  REQUIRED_POINTS, ELLIOTT_LABELS, PATTERN_LABELS
} from "./drawingConstants";

export interface LocalInteractionState {
  status: "idle" | "drawing" | "dragging" | "box-selecting" | "freehand";
  startPoint: Point | null;
  currentPoint: Point | null;
  activeDrawingIds: string[];
  originalDrawings: Record<string, Drawing>;
  collectedPoints: Point[];
}

export function useDrawingInteraction({
  symbol,
  drawings,
  coordsToPoint,
  svgRef,
}: {
  symbol: string;
  drawings: Drawing[];
  coordsToPoint: (x: number, y: number) => Point | null;
  svgRef: React.RefObject<SVGSVGElement | null>;
}) {
  const { activeTool, addDrawing } = useAnalysisStore();
  const selectedDrawingIds = useAnalysisStore((s) => s.selectedDrawingIds);
  const setSelectedDrawings = useAnalysisStore((s) => s.setSelectedDrawings);
  const toggleDrawingSelection = useAnalysisStore((s) => s.toggleDrawingSelection);

  const [localInteraction, setLocalInteraction] = useState<LocalInteractionState>({
    status: "idle", startPoint: null, currentPoint: null,
    activeDrawingIds: [], originalDrawings: {}, collectedPoints: [],
  });

  const [isTextDialogOpen, setIsTextDialogOpen] = useState(false);
  const [textDialogPoint, setTextDialogPoint] = useState<Point | null>(null);
  const [textDialogType, setTextDialogType] = useState<string>("text");

  const closeTextPopover = useCallback(() => {
    setIsTextDialogOpen(false);
    setTextDialogPoint(null);
  }, []);

  const openTextPopover = useCallback((point: Point, toolType: string) => {
    setTextDialogPoint(point);
    setTextDialogType(toolType);
    setIsTextDialogOpen(true);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent, isTargetInPopover: boolean) => {
    if (isTextDialogOpen && isTargetInPopover) return;

    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const point = coordsToPoint(e.clientX - rect.left, e.clientY - rect.top);
    if (!point) return;

    const target = e.target as SVGElement | null;
    const drawingId = target?.getAttribute("data-id");

    if (activeTool === "eraser" && drawingId) return useAnalysisStore.getState().deleteDrawing(symbol, drawingId);

    if (drawingId && !isDrawingTool(activeTool)) {
      e.preventDefault();
      e.stopPropagation();
      const drawing = drawings.find((d) => d.id === drawingId);
      const additive = e.ctrlKey || e.metaKey;

      if (drawing && activeTool === "select") {
        if (additive) toggleDrawingSelection(drawingId, true);
        else if (!selectedDrawingIds.includes(drawingId)) setSelectedDrawings([drawingId]);
      }

      if (drawing && !drawing.locked && activeTool === "select") {
        const targetIds = selectedDrawingIds.includes(drawingId) ? selectedDrawingIds : [drawingId];
        const draggableIds = targetIds.filter((id) => drawings.find((d) => d.id === id && !d.locked));
        if (draggableIds.length === 0) return;

        const originals = draggableIds.reduce((acc, id) => {
          const item = drawings.find((d) => d.id === id);
          if (item) acc[id] = item;
          return acc;
        }, {} as Record<string, Drawing>);

        setLocalInteraction({
          status: "dragging", startPoint: point, currentPoint: point,
          activeDrawingIds: draggableIds, originalDrawings: originals, collectedPoints: [],
        });
        return setSelectedDrawings(draggableIds);
      }
    }

    if (activeTool === "select" && !drawingId) {
      if (!(e.ctrlKey || e.metaKey)) setSelectedDrawings([]);
      return setLocalInteraction({
        status: "box-selecting", startPoint: point, currentPoint: point,
        activeDrawingIds: [], originalDrawings: {}, collectedPoints: [],
      });
    }

    if (SINGLE_CLICK_TOOLS.has(activeTool)) {
      const toolType = activeTool as DrawingType;
      if (activeTool === "horizontal-line") addDrawing(symbol, { type: "horizontal-line", price: point.price, visible: true } as any);
      else if (["vertical-line", "cross-line", "horizontal-ray"].includes(activeTool)) addDrawing(symbol, { type: toolType, point, visible: true } as any);
      else addDrawing(symbol, { type: toolType, point, visible: true, text: "" } as any);
      return;
    }

    if (TEXT_TOOLS.has(activeTool)) return openTextPopover(point, activeTool);

    if (POSITION_TOOLS.has(activeTool)) {
      const pct = 0.03;
      const isLong = activeTool === "long-position";
      addDrawing(symbol, {
        type: activeTool as DrawingType, entryPrice: point.price,
        targetPrice: point.price * (1 + (isLong ? pct : -pct)),
        stopPrice: point.price * (1 + (isLong ? -pct * 0.67 : pct * 0.67)),
        entryTime: point.time, visible: true,
      } as any);
      return;
    }

    if (FREEHAND_TOOLS.has(activeTool)) {
      return setLocalInteraction({
        status: "freehand", startPoint: point, currentPoint: point,
        activeDrawingIds: [], originalDrawings: {}, collectedPoints: [point],
      });
    }

    if (THREE_POINT_TOOLS.has(activeTool) || MULTI_POINT_TOOLS.has(activeTool)) {
      const updated = [...localInteraction.collectedPoints, point];
      const required = REQUIRED_POINTS[activeTool] ?? 0;

      if (required > 0 && updated.length >= required) {
        if (THREE_POINT_TOOLS.has(activeTool)) {
          addDrawing(symbol, { type: activeTool as DrawingType, p1: updated[0], p2: updated[1], p3: updated[2], visible: true } as any);
        } else {
          const labels = ELLIOTT_LABELS[activeTool] ?? PATTERN_LABELS[activeTool];
          addDrawing(symbol, { type: activeTool as DrawingType, points: updated, labels, visible: true } as any);
        }
        setLocalInteraction({ status: "idle", startPoint: null, currentPoint: null, activeDrawingIds: [], originalDrawings: {}, collectedPoints: [] });
      } else {
        setLocalInteraction(prev => ({ ...prev, status: "drawing", startPoint: prev.startPoint ?? point, currentPoint: point, collectedPoints: updated }));
      }
      return;
    }

    if (TWO_POINT_TOOLS.has(activeTool)) {
      setLocalInteraction({
        status: "drawing", startPoint: point, currentPoint: point,
        activeDrawingIds: [], originalDrawings: {}, collectedPoints: [],
      });
    }
  }, [activeTool, addDrawing, coordsToPoint, drawings, isTextDialogOpen, localInteraction, openTextPopover, selectedDrawingIds, setSelectedDrawings, svgRef, symbol, toggleDrawingSelection]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (localInteraction.status === "idle") return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const point = coordsToPoint(e.clientX - rect.left, e.clientY - rect.top);
    if (!point) return;

    if (localInteraction.status === "freehand") {
      return setLocalInteraction((prev) => ({ ...prev, currentPoint: point, collectedPoints: [...prev.collectedPoints, point] }));
    }

    setLocalInteraction((prev) => ({ ...prev, currentPoint: point }));

    if (localInteraction.status === "dragging" && localInteraction.activeDrawingIds.length > 0) {
      localInteraction.activeDrawingIds.forEach((id) => {
        const original = localInteraction.originalDrawings[id];
        if (!original || !localInteraction.startPoint) return;
        const dxTime = (point.time as number) - (localInteraction.startPoint.time as number);
        const dyPrice = point.price - localInteraction.startPoint.price;
        let newDrawing = { ...original };
        if ("p1" in original && "p2" in original) {
          const tp = original as TwoPointDrawing;
          newDrawing = { ...newDrawing, p1: { time: tp.p1.time + dxTime, price: tp.p1.price + dyPrice }, p2: { time: tp.p2.time + dxTime, price: tp.p2.price + dyPrice } } as any;
        } else if ("point" in original) {
          const sp = original as any;
          newDrawing = { ...sp, point: { time: sp.point.time + dxTime, price: sp.point.price + dyPrice } };
        } else if ("price" in original) {
          const hp = original as any;
          newDrawing = { ...hp, price: hp.price + dyPrice };
        } else if ("entryPrice" in original) {
          const pos = original as PositionDrawing;
          newDrawing = { ...pos, entryPrice: pos.entryPrice + dyPrice, targetPrice: pos.targetPrice + dyPrice, stopPrice: pos.stopPrice + dyPrice, entryTime: pos.entryTime + dxTime } as any;
        }
        useAnalysisStore.getState().updateDrawing(symbol, newDrawing as Drawing);
      });
    }
  }, [coordsToPoint, localInteraction, svgRef, symbol]);

  const handleMouseUp = useCallback(() => {
    if (localInteraction.status === "drawing" && localInteraction.startPoint && localInteraction.currentPoint) {
      if (TWO_POINT_TOOLS.has(activeTool)) {
        addDrawing(symbol, { type: activeTool as DrawingType, visible: true, p1: localInteraction.startPoint, p2: localInteraction.currentPoint } as any);
      }
      if (!THREE_POINT_TOOLS.has(activeTool) && !MULTI_POINT_TOOLS.has(activeTool)) {
        setLocalInteraction({ status: "idle", startPoint: null, currentPoint: null, activeDrawingIds: [], originalDrawings: {}, collectedPoints: [] });
      }
    } else if (localInteraction.status === "freehand" && localInteraction.collectedPoints.length >= 2) {
      addDrawing(symbol, { type: activeTool as DrawingType, points: localInteraction.collectedPoints, strokeWidth: activeTool === "highlighter" ? 12 : 2, opacity: activeTool === "highlighter" ? 0.3 : 1, visible: true } as any);
      setLocalInteraction({ status: "idle", startPoint: null, currentPoint: null, activeDrawingIds: [], originalDrawings: {}, collectedPoints: [] });
    } else if (localInteraction.status === "box-selecting" && localInteraction.startPoint && localInteraction.currentPoint) {
      const { startPoint: p1, currentPoint: p2 } = localInteraction;
      const tMin = Math.min(p1.time, p2.time);
      const tMax = Math.max(p1.time, p2.time);
      const priceMin = Math.min(p1.price, p2.price);
      const priceMax = Math.max(p1.price, p2.price);

      const selectedIds = drawings.filter((d) => {
        if ("p1" in d && "p2" in d) {
          const tp = d as TwoPointDrawing;
          return Math.min(tp.p1.time, tp.p2.time) <= tMax && Math.max(tp.p1.time, tp.p2.time) >= tMin && Math.min(tp.p1.price, tp.p2.price) <= priceMax && Math.max(tp.p1.price, tp.p2.price) >= priceMin;
        } else if ("point" in d) {
          const sp = d as any;
          return sp.point.time >= tMin && sp.point.time <= tMax && sp.point.price >= priceMin && sp.point.price <= priceMax;
        } else if ("price" in d) {
          return (d as any).price >= priceMin && (d as any).price <= priceMax;
        }
        return false;
      }).map(d => d.id);
      setSelectedDrawings(selectedIds);
      setLocalInteraction({ status: "idle", startPoint: null, currentPoint: null, activeDrawingIds: [], originalDrawings: {}, collectedPoints: [] });
    } else if (localInteraction.status === "dragging") {
      setLocalInteraction({ status: "idle", startPoint: null, currentPoint: null, activeDrawingIds: [], originalDrawings: {}, collectedPoints: [] });
    }
  }, [activeTool, addDrawing, drawings, localInteraction, setSelectedDrawings, symbol]);

  return { localInteraction, setLocalInteraction, handleMouseDown, handleMouseMove, handleMouseUp, textDialog: { isOpen: isTextDialogOpen, point: textDialogPoint, type: textDialogType, close: closeTextPopover } };
}
