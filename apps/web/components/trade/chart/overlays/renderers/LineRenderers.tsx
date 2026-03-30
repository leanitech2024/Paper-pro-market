"use client";
import React from "react";
import type { DrawingRendererProps } from "./types";
import { drawingStroke, SEL_COLOR, DRAW_COLOR } from "./types";
import type {
  TwoPointDrawing,
  HorizontalLineDrawing,
  SinglePointLineDrawing,
  Point,
} from "@/stores/trading/analysis.store";

// ─── Trendline ────────────────────────────────────────────────────
export function renderTrendline({ drawing, pointToCoords, selected }: DrawingRendererProps): React.ReactNode {
  const d = drawing as TwoPointDrawing;
  const c1 = pointToCoords(d.p1);
  const c2 = pointToCoords(d.p2);
  if (!c1 || !c2) return null;
  const s = drawingStroke(selected);
  return (
    <line data-id={d.id} x1={c1.x} y1={c1.y} x2={c2.x} y2={c2.y}
      {...s} pointerEvents="all" className="cursor-pointer hover:stroke-orange-400 transition-colors" />
  );
}

// ─── Ray ──────────────────────────────────────────────────────────
export function renderRay({ drawing, pointToCoords, width, height, selected }: DrawingRendererProps): React.ReactNode {
  const d = drawing as TwoPointDrawing;
  const c1 = pointToCoords(d.p1);
  const c2 = pointToCoords(d.p2);
  if (!c1 || !c2) return null;
  const s = drawingStroke(selected);

  const dx = c2.x - c1.x;
  const dy = c2.y - c1.y;
  let x2: number = c2.x;
  let y2: number = c2.y;

  if (Math.abs(dx) < 0.1) {
    x2 = c1.x;
    y2 = dy > 0 ? height : 0;
  } else {
    const m = dy / dx;
    const targetX = dx > 0 ? width : 0;
    x2 = targetX;
    y2 = c1.y + m * (targetX - c1.x);
  }

  if (!Number.isFinite(x2) || !Number.isFinite(y2)) return null;

  return (
    <line data-id={d.id} x1={c1.x} y1={c1.y} x2={x2} y2={y2}
      {...s} pointerEvents="all" className="cursor-pointer hover:stroke-orange-400 transition-colors" />
  );
}

// ─── Extended Line ────────────────────────────────────────────────
export function renderExtendedLine({ drawing, pointToCoords, width, height, selected }: DrawingRendererProps): React.ReactNode {
  const d = drawing as TwoPointDrawing;
  const c1 = pointToCoords(d.p1);
  const c2 = pointToCoords(d.p2);
  if (!c1 || !c2) return null;
  const s = drawingStroke(selected);

  const dx = c2.x - c1.x;
  const dy = c2.y - c1.y;

  if (Math.abs(dx) < 0.1) {
    return <line data-id={d.id} x1={c1.x} y1={0} x2={c1.x} y2={height} {...s}
      pointerEvents="all" className="cursor-pointer hover:stroke-orange-400 transition-colors" />;
  }

  const m = dy / dx;
  const yAt0 = c1.y - m * c1.x;
  const yAtW = c1.y + m * (width - c1.x);

  return (
    <line data-id={d.id} x1={0} y1={yAt0} x2={width} y2={yAtW}
      {...s} pointerEvents="all" className="cursor-pointer hover:stroke-orange-400 transition-colors" />
  );
}

// ─── Info Line ────────────────────────────────────────────────────
export function renderInfoLine({ drawing, pointToCoords, selected }: DrawingRendererProps): React.ReactNode {
  const d = drawing as TwoPointDrawing;
  const c1 = pointToCoords(d.p1);
  const c2 = pointToCoords(d.p2);
  if (!c1 || !c2) return null;
  const s = drawingStroke(selected);

  const priceDiff = d.p2.price - d.p1.price;
  const pct = d.p1.price !== 0 ? ((priceDiff / d.p1.price) * 100).toFixed(2) : "0";
  const midX = (c1.x + c2.x) / 2;
  const midY = (c1.y + c2.y) / 2;

  return (
    <g>
      <line data-id={d.id} x1={c1.x} y1={c1.y} x2={c2.x} y2={c2.y}
        {...s} pointerEvents="all" className="cursor-pointer hover:stroke-orange-400 transition-colors" />
      <rect x={midX - 50} y={midY - 24} width={100} height={20} rx={4}
        fill="rgba(0,0,0,0.8)" pointerEvents="none" />
      <text x={midX} y={midY - 10} textAnchor="middle" fill="#E0E0E0"
        fontSize={10} fontFamily="monospace" pointerEvents="none">
        {priceDiff >= 0 ? "+" : ""}{priceDiff.toFixed(2)} ({pct}%)
      </text>
    </g>
  );
}

// ─── Trend Angle ──────────────────────────────────────────────────
export function renderTrendAngle({ drawing, pointToCoords, selected }: DrawingRendererProps): React.ReactNode {
  const d = drawing as TwoPointDrawing;
  const c1 = pointToCoords(d.p1);
  const c2 = pointToCoords(d.p2);
  if (!c1 || !c2) return null;
  const s = drawingStroke(selected);

  const dx = c2.x - c1.x;
  const dy = c2.y - c1.y;
  const angle = Math.atan2(-dy, dx) * (180 / Math.PI);
  const labelX = c1.x + 30;
  const labelY = c1.y - 5;

  return (
    <g>
      <line data-id={d.id} x1={c1.x} y1={c1.y} x2={c2.x} y2={c2.y}
        {...s} pointerEvents="all" className="cursor-pointer hover:stroke-orange-400 transition-colors" />
      <line x1={c1.x} y1={c1.y} x2={c1.x + 40} y2={c1.y}
        stroke={selected ? SEL_COLOR : "#555"} strokeWidth={1} strokeDasharray="3 3" pointerEvents="none" />
      <text x={labelX} y={labelY} fill={selected ? SEL_COLOR : DRAW_COLOR}
        fontSize={10} fontFamily="monospace" pointerEvents="none">
        {angle.toFixed(1)}°
      </text>
    </g>
  );
}

// ─── Horizontal Line ──────────────────────────────────────────────
export function renderHorizontalLine({ drawing, mainSeries, width, selected }: DrawingRendererProps): React.ReactNode {
  const d = drawing as HorizontalLineDrawing;
  const y = mainSeries.priceToCoordinate(d.price);
  if (y === null) return null;
  return (
    <g>
      <line data-id={d.id} x1={0} y1={y} x2={width} y2={y}
        stroke={selected ? SEL_COLOR : "#A855F7"} strokeWidth={selected ? 2 : 1}
        pointerEvents="all" className="cursor-pointer hover:stroke-orange-400 transition-colors" />
      <rect x={width - 64} y={Number(y) - 10} width={62} height={18} rx={3}
        fill="rgba(168,85,247,0.85)" pointerEvents="none" />
      <text x={width - 33} y={Number(y) + 3} textAnchor="middle" fill="#fff"
        fontSize={10} fontFamily="monospace" pointerEvents="none">
        ₹{d.price.toFixed(2)}
      </text>
    </g>
  );
}

// ─── Horizontal Ray ───────────────────────────────────────────────
export function renderHorizontalRay({ drawing, pointToCoords, mainSeries, width, selected }: DrawingRendererProps): React.ReactNode {
  const d = drawing as SinglePointLineDrawing;
  const c = pointToCoords(d.point);
  if (!c) return null;
  const y = mainSeries.priceToCoordinate(d.point.price);
  if (y === null) return null;

  return (
    <line data-id={d.id} x1={c.x} y1={y} x2={width} y2={y}
      stroke={selected ? SEL_COLOR : "#A855F7"} strokeWidth={selected ? 2 : 1}
      pointerEvents="all" className="cursor-pointer hover:stroke-orange-400 transition-colors" />
  );
}

// ─── Vertical Line ────────────────────────────────────────────────
export function renderVerticalLine({ drawing, pointToCoords, height, selected }: DrawingRendererProps): React.ReactNode {
  const d = drawing as SinglePointLineDrawing;
  const c = pointToCoords(d.point);
  if (!c) return null;

  return (
    <line data-id={d.id} x1={c.x} y1={0} x2={c.x} y2={height}
      stroke={selected ? SEL_COLOR : "#64748B"} strokeWidth={selected ? 2 : 1}
      strokeDasharray="4 4" pointerEvents="all"
      className="cursor-pointer hover:stroke-orange-400 transition-colors" />
  );
}

// ─── Cross Line ───────────────────────────────────────────────────
export function renderCrossLine({ drawing, pointToCoords, mainSeries, width, height, selected }: DrawingRendererProps): React.ReactNode {
  const d = drawing as SinglePointLineDrawing;
  const c = pointToCoords(d.point);
  if (!c) return null;
  const y = mainSeries.priceToCoordinate(d.point.price);
  if (y === null) return null;

  return (
    <g data-id={d.id}>
      <line x1={0} y1={y} x2={width} y2={y}
        stroke={selected ? SEL_COLOR : "#64748B"} strokeWidth={1} strokeDasharray="4 4" pointerEvents="all" />
      <line x1={c.x} y1={0} x2={c.x} y2={height}
        stroke={selected ? SEL_COLOR : "#64748B"} strokeWidth={1} strokeDasharray="4 4" pointerEvents="all" />
    </g>
  );
}
