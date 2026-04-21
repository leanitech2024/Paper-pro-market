import {
  useState,
  useCallback,
  useEffect,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import {
  useAnalysisStore,
  type Point,
  type Drawing,
  type DrawingType,
  type TwoPointDrawing,
  type PositionDrawing,
} from "@/stores/trading/analysis.store";
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
} from "./drawingConstants";

type InteractionHandleType =
  | "entry"
  | "target"
  | "stop"
  | "start-time"
  | "end-time"
  | "top"
  | "bottom"
  | "p1"
  | "p2"
  | "left"
  | "right";

type InteractionTarget =
  | {
      kind: "handle";
      drawingId: string;
      handleType: InteractionHandleType;
      cursor: string;
    }
  | {
      kind: "body";
      drawingId: string;
      cursor: string;
    };

type HandleAnchor = {
  drawingId: string;
  handleType: InteractionHandleType;
  cursor: string;
  x: number;
  y: number;
};

type HandleMatch = {
  drawingId: string;
  handleType: InteractionHandleType;
  cursor: string;
  distance: number;
};

const HANDLE_PROXIMITY_PX = 14;
const MIN_DURATION_BARS = 2;
const MIN_PRICE_STEPS = 2;

const createDrawingId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export interface LocalInteractionState {
  status: "idle" | "drawing" | "dragging" | "box-selecting" | "freehand" | "resizing";
  startPoint: Point | null;
  currentPoint: Point | null;
  activeDrawingIds: string[];
  originalDrawings: Record<string, Drawing>;
  collectedPoints: Point[];
  handleType?: InteractionHandleType;
}

type InteractionEvent = ReactPointerEvent<SVGSVGElement> | ReactMouseEvent;

const isElement = (value: EventTarget | null): value is Element =>
  value instanceof Element;

const isPositionDrawing = (drawing: Drawing): drawing is PositionDrawing =>
  "entryPrice" in drawing;

const isTwoPointDrawing = (drawing: Drawing): drawing is TwoPointDrawing =>
  "p1" in drawing && "p2" in drawing;

const resetLocalInteraction = (): LocalInteractionState => ({
  status: "idle",
  startPoint: null,
  currentPoint: null,
  activeDrawingIds: [],
  originalDrawings: {},
  collectedPoints: [],
});

function getTargetElement(target: EventTarget | null): Element | null {
  if (!isElement(target)) return null;
  return target.closest("[data-id]");
}

function getBodyTarget(target: EventTarget | null): Element | null {
  if (!isElement(target)) return null;
  return target.closest("[data-drag-role='body']");
}

function getHandleAnchors(
  drawing: Drawing,
  pointToCoords: (point: Point) => { x: number; y: number } | null,
  height: number
): HandleAnchor[] {
  if (isPositionDrawing(drawing)) {
    const entry = pointToCoords({ time: drawing.entryTime, price: drawing.entryPrice });
    const end = pointToCoords({ time: drawing.endTime, price: drawing.entryPrice });
    const target = pointToCoords({ time: drawing.endTime, price: drawing.targetPrice });
    const stop = pointToCoords({ time: drawing.endTime, price: drawing.stopPrice });
    if (!entry || !end || !target || !stop) return [];
    const midY = (target.y + stop.y) / 2;
    return [
      { drawingId: drawing.id, handleType: "target", cursor: "ns-resize", x: end.x, y: target.y },
      { drawingId: drawing.id, handleType: "entry", cursor: "ns-resize", x: end.x, y: entry.y },
      { drawingId: drawing.id, handleType: "stop", cursor: "ns-resize", x: end.x, y: stop.y },
      {
        drawingId: drawing.id,
        handleType: "start-time",
        cursor: "ew-resize",
        x: entry.x,
        y: midY,
      },
      {
        drawingId: drawing.id,
        handleType: "end-time",
        cursor: "ew-resize",
        x: end.x,
        y: midY,
      },
    ];
  }

  if (isTwoPointDrawing(drawing)) {
    const p1 = pointToCoords(drawing.p1);
    const p2 = pointToCoords(drawing.p2);
    if (!p1 || !p2) return [];

    if (drawing.type === "forecast") {
      return [
        { drawingId: drawing.id, handleType: "p1", cursor: "nwse-resize", x: p1.x, y: p1.y },
        { drawingId: drawing.id, handleType: "p2", cursor: "nwse-resize", x: p2.x, y: p2.y },
      ];
    }

    if (drawing.type === "date-range") {
      const leftX = Math.min(p1.x, p2.x);
      const rightX = Math.max(p1.x, p2.x);
      const midY = height / 2;
      return [
        { drawingId: drawing.id, handleType: "left", cursor: "ew-resize", x: leftX, y: midY },
        { drawingId: drawing.id, handleType: "right", cursor: "ew-resize", x: rightX, y: midY },
      ];
    }

    if (drawing.type === "price-range") {
      const topPoint = drawing.p1.price >= drawing.p2.price ? p1 : p2;
      const bottomPoint = drawing.p1.price >= drawing.p2.price ? p2 : p1;
      return [
        { drawingId: drawing.id, handleType: "top", cursor: "ns-resize", x: topPoint.x, y: topPoint.y },
        { drawingId: drawing.id, handleType: "bottom", cursor: "ns-resize", x: bottomPoint.x, y: bottomPoint.y },
      ];
    }

    if (drawing.type === "date-price-range") {
      return [
        { drawingId: drawing.id, handleType: "p1", cursor: "nwse-resize", x: p1.x, y: p1.y },
        { drawingId: drawing.id, handleType: "p2", cursor: "nwse-resize", x: p2.x, y: p2.y },
      ];
    }
  }

  return [];
}

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
  const selectedDrawingIds = useAnalysisStore((s) => s.selectedDrawingIds);
  const setSelectedDrawings = useAnalysisStore((s) => s.setSelectedDrawings);
  const toggleDrawingSelection = useAnalysisStore((s) => s.toggleDrawingSelection);
  const isEditMode = activeTool === "select" || activeTool === "cursor" || activeTool === "crosshair";

  const [localInteraction, setLocalInteraction] = useState<LocalInteractionState>(resetLocalInteraction);
  const [interactionCursor, setInteractionCursor] = useState<string>();

  const [isTextDialogOpen, setIsTextDialogOpen] = useState(false);
  const [textDialogPoint, setTextDialogPoint] = useState<Point | null>(null);
  const [textDialogType, setTextDialogType] = useState<string>("text");

  const rafRef = useRef<number | null>(null);
  const pendingDrawingsRef = useRef<Record<string, Drawing>>({});
  const minDuration = timeInterval * MIN_DURATION_BARS;
  const minPriceGap = snapPrice(MIN_PRICE_STEPS * 0.01);

  const snapPoint = useCallback(
    (point: Point): Point => ({
      time: snapTime(point.time),
      price: snapPrice(point.price),
    }),
    [snapPrice, snapTime]
  );

  const closeTextPopover = useCallback(() => {
    setIsTextDialogOpen(false);
    setTextDialogPoint(null);
  }, []);

  const openTextPopover = useCallback((point: Point, toolType: string) => {
    setTextDialogPoint(point);
    setTextDialogType(toolType);
    setIsTextDialogOpen(true);
  }, []);

  const flushPendingDrawings = useCallback(() => {
    const pending = Object.values(pendingDrawingsRef.current);
    pendingDrawingsRef.current = {};
    rafRef.current = null;
    if (pending.length === 0) return;
    const store = useAnalysisStore.getState();
    pending.forEach((drawing) => store.updateDrawing(symbol, drawing));
  }, [symbol]);

  const queueDrawingUpdates = useCallback(
    (updates: Drawing[]) => {
      if (updates.length === 0) return;
      updates.forEach((drawing) => {
        pendingDrawingsRef.current[drawing.id] = drawing;
      });

      if (rafRef.current !== null) return;

      if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
        flushPendingDrawings();
        return;
      }

      rafRef.current = window.requestAnimationFrame(() => {
        flushPendingDrawings();
      });
    },
    [flushPendingDrawings]
  );

  useEffect(
    () => () => {
      if (rafRef.current !== null && typeof window !== "undefined") {
        window.cancelAnimationFrame(rafRef.current);
      }
    },
    []
  );

  const resolveNearestHandleTarget = useCallback(
    (mouseX: number, mouseY: number): InteractionTarget | null => {
      if (!isEditMode) return null;
      let bestMatch: HandleMatch | null = null;

      for (const id of selectedDrawingIds) {
        const drawing = drawings.find((item) => item.id === id);
        if (!drawing || drawing.locked) continue;

        for (const anchor of getHandleAnchors(drawing, pointToCoords, height)) {
          const distance = Math.hypot(anchor.x - mouseX, anchor.y - mouseY);
          if (distance > HANDLE_PROXIMITY_PX) continue;
          if (!bestMatch || distance < bestMatch.distance) {
            bestMatch = {
              drawingId: anchor.drawingId,
              handleType: anchor.handleType,
              cursor: anchor.cursor,
              distance,
            };
          }
        }
      }

      if (!bestMatch) return null;
      return {
        kind: "handle",
        drawingId: bestMatch.drawingId,
        handleType: bestMatch.handleType,
        cursor: bestMatch.cursor,
      };
    },
    [drawings, height, isEditMode, pointToCoords, selectedDrawingIds]
  );

  const normalizePositionDrawing = useCallback(
    (drawing: PositionDrawing): PositionDrawing => {
      const isLong = drawing.type === "long-position";
      const entryTime = snapTime(drawing.entryTime);
      const endTime = Math.max(snapTime(drawing.endTime), entryTime + minDuration);
      const entryPrice = snapPrice(drawing.entryPrice);

      if (isLong) {
        return {
          ...drawing,
          entryTime,
          endTime,
          entryPrice,
          targetPrice: Math.max(snapPrice(drawing.targetPrice), entryPrice + minPriceGap),
          stopPrice: Math.min(snapPrice(drawing.stopPrice), entryPrice - minPriceGap),
        };
      }

      return {
        ...drawing,
        entryTime,
        endTime,
        entryPrice,
        targetPrice: Math.min(snapPrice(drawing.targetPrice), entryPrice - minPriceGap),
        stopPrice: Math.max(snapPrice(drawing.stopPrice), entryPrice + minPriceGap),
      };
    },
    [minDuration, minPriceGap, snapPrice, snapTime]
  );

  const createDefaultPositionDrawing = useCallback(
    (tool: "long-position" | "short-position", point: Point, mouseX: number) => {
      const topPoint = coordsToPoint(mouseX, 16);
      const bottomPoint = coordsToPoint(mouseX, Math.max(32, height - 42));
      const visibleRange =
        topPoint && bottomPoint
          ? Math.abs(topPoint.price - bottomPoint.price)
          : Math.abs(point.price) * 0.02;

      const rewardDistance = Math.max(visibleRange * 0.075, point.price * 0.0035, minPriceGap * 2);
      const riskDistance = Math.max(visibleRange * 0.05, point.price * 0.0025, minPriceGap);
      const defaultBars = 46;
      const isLong = tool === "long-position";
      const raw: PositionDrawing = {
        id: createDrawingId(),
        type: tool,
        entryPrice: point.price,
        targetPrice: point.price + (isLong ? rewardDistance : -rewardDistance),
        stopPrice: point.price + (isLong ? -riskDistance : riskDistance),
        entryTime: point.time,
        endTime: point.time + defaultBars * timeInterval,
        visible: true,
      };

      return normalizePositionDrawing(raw);
    },
    [coordsToPoint, height, minPriceGap, normalizePositionDrawing, timeInterval]
  );

  const moveDrawing = useCallback(
    (drawing: Drawing, dxTime: number, dyPrice: number): Drawing => {
      if (isPositionDrawing(drawing)) {
        return normalizePositionDrawing({
          ...drawing,
          entryPrice: drawing.entryPrice + dyPrice,
          targetPrice: drawing.targetPrice + dyPrice,
          stopPrice: drawing.stopPrice + dyPrice,
          entryTime: drawing.entryTime + dxTime,
          endTime: drawing.endTime + dxTime,
        });
      }

      if (isTwoPointDrawing(drawing)) {
        if (drawing.type === "date-range") {
          return {
            ...drawing,
            p1: { ...drawing.p1, time: snapTime(drawing.p1.time + dxTime) },
            p2: { ...drawing.p2, time: snapTime(drawing.p2.time + dxTime) },
          };
        }

        return {
          ...drawing,
          p1: {
            time: snapTime(drawing.p1.time + dxTime),
            price: snapPrice(drawing.p1.price + dyPrice),
          },
          p2: {
            time: snapTime(drawing.p2.time + dxTime),
            price: snapPrice(drawing.p2.price + dyPrice),
          },
        };
      }

      if ("point" in drawing) {
        return {
          ...drawing,
          point: {
            time: snapTime(drawing.point.time + dxTime),
            price: snapPrice(drawing.point.price + dyPrice),
          },
        } as Drawing;
      }

      if ("price" in drawing) {
        return { ...drawing, price: snapPrice(drawing.price + dyPrice) } as Drawing;
      }

      return drawing;
    },
    [normalizePositionDrawing, snapPrice, snapTime]
  );

  const resizeTwoPointDrawing = useCallback(
    (drawing: TwoPointDrawing, handleType: InteractionHandleType, point: Point): TwoPointDrawing => {
      const nextPoint = snapPoint(point);

      if (drawing.type === "forecast") {
        if (handleType === "p1") {
          return {
            ...drawing,
            p1: {
              time: Math.min(nextPoint.time, drawing.p2.time - minDuration),
              price: nextPoint.price,
            },
          };
        }

        if (handleType === "p2") {
          return {
            ...drawing,
            p2: {
              time: Math.max(nextPoint.time, drawing.p1.time + minDuration),
              price: nextPoint.price,
            },
          };
        }
      }

      if (drawing.type === "date-range") {
        const leftTime = Math.min(drawing.p1.time, drawing.p2.time);
        const rightTime = Math.max(drawing.p1.time, drawing.p2.time);
        const isP1Left = drawing.p1.time <= drawing.p2.time;

        if (handleType === "left") {
          const nextLeft = Math.min(nextPoint.time, rightTime - minDuration);
          return isP1Left
            ? { ...drawing, p1: { ...drawing.p1, time: nextLeft } }
            : { ...drawing, p2: { ...drawing.p2, time: nextLeft } };
        }

        if (handleType === "right") {
          const nextRight = Math.max(nextPoint.time, leftTime + minDuration);
          return isP1Left
            ? { ...drawing, p2: { ...drawing.p2, time: nextRight } }
            : { ...drawing, p1: { ...drawing.p1, time: nextRight } };
        }
      }

      if (drawing.type === "price-range") {
        const topIsP1 = drawing.p1.price >= drawing.p2.price;
        if (handleType === "top") {
          const nextTopPrice = Math.max(nextPoint.price, Math.min(drawing.p1.price, drawing.p2.price) + minPriceGap);
          return topIsP1
            ? {
                ...drawing,
                p1: {
                  ...drawing.p1,
                  price: nextTopPrice,
                },
              }
            : {
                ...drawing,
                p2: {
                  ...drawing.p2,
                  price: nextTopPrice,
                },
              };
        }

        if (handleType === "bottom") {
          const nextBottomPrice = Math.min(nextPoint.price, Math.max(drawing.p1.price, drawing.p2.price) - minPriceGap);
          return topIsP1
            ? {
                ...drawing,
                p2: {
                  ...drawing.p2,
                  price: nextBottomPrice,
                },
              }
            : {
                ...drawing,
                p1: {
                  ...drawing.p1,
                  price: nextBottomPrice,
                },
              };
        }
      }

      if (drawing.type === "date-price-range") {
        const p1ShouldStayLeft = drawing.p1.time <= drawing.p2.time;
        const p1ShouldStayAbove = drawing.p1.price <= drawing.p2.price;

        if (handleType === "p1") {
          return {
            ...drawing,
            p1: {
              time: p1ShouldStayLeft
                ? Math.min(nextPoint.time, drawing.p2.time - minDuration)
                : Math.max(nextPoint.time, drawing.p2.time + minDuration),
              price: p1ShouldStayAbove
                ? Math.min(nextPoint.price, drawing.p2.price - minPriceGap)
                : Math.max(nextPoint.price, drawing.p2.price + minPriceGap),
            },
          };
        }

        if (handleType === "p2") {
          return {
            ...drawing,
            p2: {
              time: p1ShouldStayLeft
                ? Math.max(nextPoint.time, drawing.p1.time + minDuration)
                : Math.min(nextPoint.time, drawing.p1.time - minDuration),
              price: p1ShouldStayAbove
                ? Math.max(nextPoint.price, drawing.p1.price + minPriceGap)
                : Math.min(nextPoint.price, drawing.p1.price - minPriceGap),
            },
          };
        }
      }

      return drawing;
    },
    [minDuration, minPriceGap, snapPoint]
  );

  const resizeDrawing = useCallback(
    (drawing: Drawing, handleType: InteractionHandleType, point: Point): Drawing => {
      const nextPoint = snapPoint(point);

      if (isPositionDrawing(drawing)) {
        if (handleType === "entry") {
          const nextEntryPrice =
            drawing.type === "long-position"
              ? Math.min(
                  Math.max(nextPoint.price, drawing.stopPrice + minPriceGap),
                  drawing.targetPrice - minPriceGap
                )
              : Math.max(
                  Math.min(nextPoint.price, drawing.stopPrice - minPriceGap),
                  drawing.targetPrice + minPriceGap
                );

          return normalizePositionDrawing({
            ...drawing,
            entryPrice: nextEntryPrice,
          });
        }

        if (handleType === "target") {
          return normalizePositionDrawing({ ...drawing, targetPrice: nextPoint.price });
        }

        if (handleType === "stop") {
          return normalizePositionDrawing({ ...drawing, stopPrice: nextPoint.price });
        }

        if (handleType === "start-time") {
          return normalizePositionDrawing({
            ...drawing,
            entryTime: Math.min(nextPoint.time, drawing.endTime - minDuration),
          });
        }

        if (handleType === "end-time") {
          return normalizePositionDrawing({
            ...drawing,
            endTime: Math.max(nextPoint.time, drawing.entryTime + minDuration),
          });
        }

        return drawing;
      }

      if (isTwoPointDrawing(drawing)) {
        return resizeTwoPointDrawing(drawing, handleType, nextPoint);
      }

      return drawing;
    },
    [minDuration, minPriceGap, normalizePositionDrawing, resizeTwoPointDrawing, snapPoint]
  );

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
          setInteractionCursor(
            explicitHandleType === "start-time" ||
              explicitHandleType === "end-time" ||
              explicitHandleType === "left" ||
              explicitHandleType === "right"
              ? "ew-resize"
              : explicitHandleType === "top" || explicitHandleType === "bottom"
              ? "ns-resize"
              : explicitHandleType === "p1" || explicitHandleType === "p2"
              ? "nwse-resize"
              : "ns-resize"
          );
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

        if (drawing && !isDrawingTool(activeTool)) {
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
          // In "cursor" mode, empty-area clicks should pan the chart (chart-native
          // behavior). Only the explicit "select" tool activates rubber-band
          // box-selection. Returning without calling stopPropagation lets
          // LightweightCharts receive the pointer-down and handle panning.
          if (activeTool === "cursor") {
            if (!(e.ctrlKey || e.metaKey)) setSelectedDrawings([]);
            return;
          }
          // activeTool === "select" — start box-selection
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

      if (SINGLE_CLICK_TOOLS.has(activeTool)) {
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

      if (TEXT_TOOLS.has(activeTool)) {
        openTextPopover(snappedPoint, activeTool);
        return;
      }

      if (POSITION_TOOLS.has(activeTool)) {
        const next = createDefaultPositionDrawing(activeTool as "long-position" | "short-position", snappedPoint, mouseX);
        addDrawing(symbol, next as any);
        useAnalysisStore.getState().setSelectedDrawings([next.id]);
        useAnalysisStore.getState().setActiveTool("cursor");
        setInteractionCursor("grab");
        return;
      }

      if (FREEHAND_TOOLS.has(activeTool)) {
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

      if (THREE_POINT_TOOLS.has(activeTool) || MULTI_POINT_TOOLS.has(activeTool)) {
        const updated = [...localInteraction.collectedPoints, snappedPoint];
        const required = REQUIRED_POINTS[activeTool] ?? 0;

        if (required > 0 && updated.length >= required) {
          if (THREE_POINT_TOOLS.has(activeTool)) {
            addDrawing(
              symbol,
              { type: activeTool as DrawingType, p1: updated[0], p2: updated[1], p3: updated[2], visible: true } as any
            );
          } else {
            const labels = ELLIOTT_LABELS[activeTool] ?? PATTERN_LABELS[activeTool];
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

      if (TWO_POINT_TOOLS.has(activeTool)) {
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
      drawings,
      isEditMode,
      isTextDialogOpen,
      localInteraction.collectedPoints,
      openTextPopover,
      createDefaultPositionDrawing,
      resolveNearestHandleTarget,
      selectedDrawingIds,
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
          setInteractionCursor(
            hoveredHandleType === "start-time" ||
              hoveredHandleType === "end-time" ||
              hoveredHandleType === "left" ||
              hoveredHandleType === "right"
              ? "ew-resize"
              : hoveredHandleType === "top" || hoveredHandleType === "bottom"
              ? "ns-resize"
              : hoveredHandleType === "p1" || hoveredHandleType === "p2"
              ? "nwse-resize"
              : "ns-resize"
          );
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
        setInteractionCursor(
          localInteraction.handleType === "start-time" ||
            localInteraction.handleType === "end-time" ||
            localInteraction.handleType === "left" ||
            localInteraction.handleType === "right"
            ? "ew-resize"
            : localInteraction.handleType === "top" || localInteraction.handleType === "bottom"
            ? "ns-resize"
            : localInteraction.handleType === "p1" || localInteraction.handleType === "p2"
            ? "nwse-resize"
            : "ns-resize"
        );
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
      snapPoint,
      svgRef,
    ]
  );

  const handleMouseLeave = useCallback(() => {
    if (localInteraction.status === "idle") setInteractionCursor(undefined);
  }, [localInteraction.status]);

  const handleMouseUp = useCallback(() => {
    flushPendingDrawings();

    if (localInteraction.status === "drawing" && localInteraction.startPoint && localInteraction.currentPoint) {
      if (TWO_POINT_TOOLS.has(activeTool)) {
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
        addDrawing(
          symbol,
          nextDrawing as any
        );
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
      if (!THREE_POINT_TOOLS.has(activeTool) && !MULTI_POINT_TOOLS.has(activeTool)) {
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
          if (isTwoPointDrawing(drawing)) {
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
  }, [activeTool, addDrawing, drawings, flushPendingDrawings, localInteraction, setSelectedDrawings, symbol]);

  return {
    localInteraction,
    setLocalInteraction,
    handleMouseDown,
    handleMouseMove,
    handleMouseLeave,
    handleMouseUp,
    interactionCursor,
    textDialog: {
      isOpen: isTextDialogOpen,
      point: textDialogPoint,
      type: textDialogType,
      close: closeTextPopover,
    },
  };
}
