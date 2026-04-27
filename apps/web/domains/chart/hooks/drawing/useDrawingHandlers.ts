import { useCallback } from "react";

import {
  useAnalysisStore,
  type Point,
  type Drawing,
  type TwoPointDrawing,
  type PositionDrawing,
} from "@/domains/chart/stores/analysis.store";

import type { InteractionHandleType } from "./useDrawingState";

type InteractionTarget = {
  kind: "handle";
  drawingId: string;
  handleType: InteractionHandleType;
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

export const createDrawingId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const isElement = (value: EventTarget | null): value is Element =>
  value instanceof Element;

const isPositionDrawing = (drawing: Drawing): drawing is PositionDrawing =>
  "entryPrice" in drawing;

const isTwoPointDrawing = (drawing: Drawing): drawing is TwoPointDrawing =>
  "p1" in drawing && "p2" in drawing;

export function getTargetElement(target: EventTarget | null): Element | null {
  if (!isElement(target)) return null;
  return target.closest("[data-id]");
}

export function getBodyTarget(target: EventTarget | null): Element | null {
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

export function useDrawingHandlers({
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
}: {
  drawings: Drawing[];
  pointToCoords: (point: Point) => { x: number; y: number } | null;
  coordsToPoint: (x: number, y: number) => Point | null;
  snapTime: (time: number) => number;
  snapPrice: (price: number) => number;
  height: number;
  timeInterval: number;
  minDuration: number;
  minPriceGap: number;
  snapPoint: (point: Point) => Point;
  selectedDrawingIds: string[];
  isEditMode: boolean;
}) {
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

  return {
    resolveNearestHandleTarget,
    createDefaultPositionDrawing,
    moveDrawing,
    resizeDrawing,
  };
}

export type { InteractionTarget };
