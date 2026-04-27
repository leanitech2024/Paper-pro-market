import { useState, useCallback, useEffect, useRef } from "react";

import { useAnalysisStore, type Drawing, type Point } from "@/domains/chart/stores/analysis.store";

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

const MIN_DURATION_BARS = 2;
const MIN_PRICE_STEPS = 2;

export interface LocalInteractionState {
  status: "idle" | "drawing" | "dragging" | "box-selecting" | "freehand" | "resizing";
  startPoint: Point | null;
  currentPoint: Point | null;
  activeDrawingIds: string[];
  originalDrawings: Record<string, Drawing>;
  collectedPoints: Point[];
  handleType?: InteractionHandleType;
}

export const resetLocalInteraction = (): LocalInteractionState => ({
  status: "idle",
  startPoint: null,
  currentPoint: null,
  activeDrawingIds: [],
  originalDrawings: {},
  collectedPoints: [],
});

export function useDrawingState({
  symbol,
  timeInterval,
  snapTime,
  snapPrice,
}: {
  symbol: string;
  timeInterval: number;
  snapTime: (time: number) => number;
  snapPrice: (price: number) => number;
}) {
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

  return {
    localInteraction,
    setLocalInteraction,
    interactionCursor,
    setInteractionCursor,
    textDialog: {
      isOpen: isTextDialogOpen,
      point: textDialogPoint,
      type: textDialogType,
      close: closeTextPopover,
    },
    openTextPopover,
    snapPoint,
    minDuration,
    minPriceGap,
    flushPendingDrawings,
    queueDrawingUpdates,
  };
}

export type { InteractionHandleType };
