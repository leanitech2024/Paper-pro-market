"use client";
import React from "react";
import type { DrawingRendererProps } from "./types";
import { drawingStroke, SEL_COLOR, DRAW_COLOR } from "./types";
import type { ThreePointDrawing, TwoPointDrawing } from "@/stores/trading/analysis.store";

// ─── Parallel Channel ─────────────────────────────────────────────
export function renderParallelChannel({ drawing, pointToCoords, width, selected }: DrawingRendererProps): React.ReactNode {
  const d = drawing as ThreePointDrawing;
  const c1 = pointToCoords(d.p1);
  const c2 = pointToCoords(d.p2);
  const c3 = pointToCoords(d.p3);
  if (!c1 || !c2 || !c3) return null;
  const s = drawingStroke(selected);

  // Channel: p1→p2 is baseline, p3 defines offset (parallel line)
  const offsetX = c3.x - c1.x;
  const offsetY = c3.y - c1.y;

  const p3x = c1.x + offsetX;
  const p3y = c1.y + offsetY;
  const p4x = c2.x + offsetX;
  const p4y = c2.y + offsetY;

  const fillColor = selected ? "rgba(245,158,11,0.08)" : "rgba(41,98,255,0.06)";

  return (
    <g data-id={d.id}>
      <polygon points={`${c1.x},${c1.y} ${c2.x},${c2.y} ${p4x},${p4y} ${p3x},${p3y}`}
        fill={fillColor} pointerEvents="all" className="cursor-pointer" />
      <line x1={c1.x} y1={c1.y} x2={c2.x} y2={c2.y} {...s} pointerEvents="all" />
      <line x1={p3x} y1={p3y} x2={p4x} y2={p4y} {...s} pointerEvents="all" />
      {/* Midline */}
      <line x1={(c1.x + p3x) / 2} y1={(c1.y + p3y) / 2}
        x2={(c2.x + p4x) / 2} y2={(c2.y + p4y) / 2}
        stroke={selected ? SEL_COLOR : "#555"} strokeWidth={1} strokeDasharray="4 4" pointerEvents="none" />
    </g>
  );
}

// ─── Regression Trend ─────────────────────────────────────────────
export function renderRegressionTrend({ drawing, pointToCoords, data, selected }: DrawingRendererProps): React.ReactNode {
  const d = drawing as TwoPointDrawing;
  const c1 = pointToCoords(d.p1);
  const c2 = pointToCoords(d.p2);
  if (!c1 || !c2) return null;
  const s = drawingStroke(selected);

  // Simple linear regression line between two points + ±1 stddev channels
  const channelHeight = Math.abs(c2.y - c1.y) * 0.15;
  const fillColor = selected ? "rgba(245,158,11,0.1)" : "rgba(41,98,255,0.08)";

  return (
    <g data-id={d.id}>
      <polygon
        points={`${c1.x},${c1.y - channelHeight} ${c2.x},${c2.y - channelHeight} ${c2.x},${c2.y + channelHeight} ${c1.x},${c1.y + channelHeight}`}
        fill={fillColor} pointerEvents="all" className="cursor-pointer" />
      <line x1={c1.x} y1={c1.y} x2={c2.x} y2={c2.y} {...s} pointerEvents="all" />
      <line x1={c1.x} y1={c1.y - channelHeight} x2={c2.x} y2={c2.y - channelHeight}
        stroke={selected ? SEL_COLOR : "#555"} strokeWidth={1} strokeDasharray="3 3" pointerEvents="none" />
      <line x1={c1.x} y1={c1.y + channelHeight} x2={c2.x} y2={c2.y + channelHeight}
        stroke={selected ? SEL_COLOR : "#555"} strokeWidth={1} strokeDasharray="3 3" pointerEvents="none" />
    </g>
  );
}

// ─── Flat Top/Bottom ──────────────────────────────────────────────
export function renderFlatTopBottom({ drawing, pointToCoords, width, selected }: DrawingRendererProps): React.ReactNode {
  const d = drawing as TwoPointDrawing;
  const c1 = pointToCoords(d.p1);
  const c2 = pointToCoords(d.p2);
  if (!c1 || !c2) return null;

  const topY = Math.min(c1.y, c2.y);
  const bottomY = Math.max(c1.y, c2.y);
  const leftX = Math.min(c1.x, c2.x);
  const rightX = Math.max(c1.x, c2.x);
  const fillColor = selected ? "rgba(245,158,11,0.1)" : "rgba(41,98,255,0.06)";

  return (
    <g data-id={d.id}>
      <rect x={leftX} y={topY} width={rightX - leftX} height={bottomY - topY}
        fill={fillColor} pointerEvents="all" className="cursor-pointer" />
      <line x1={leftX} y1={topY} x2={rightX} y2={topY}
        stroke={selected ? SEL_COLOR : DRAW_COLOR} strokeWidth={2} pointerEvents="all" />
      <line x1={leftX} y1={bottomY} x2={rightX} y2={bottomY}
        stroke={selected ? SEL_COLOR : DRAW_COLOR} strokeWidth={2} pointerEvents="all" />
    </g>
  );
}

// ─── Disjoint Channel ─────────────────────────────────────────────
export function renderDisjointChannel({ drawing, pointToCoords, selected }: DrawingRendererProps): React.ReactNode {
  const d = drawing as TwoPointDrawing;
  const c1 = pointToCoords(d.p1);
  const c2 = pointToCoords(d.p2);
  if (!c1 || !c2) return null;
  const s = drawingStroke(selected);

  const midY = (c1.y + c2.y) / 2;
  const gap = 4;

  return (
    <g data-id={d.id}>
      <line x1={c1.x} y1={c1.y} x2={c2.x} y2={c2.y - gap} {...s} pointerEvents="all" />
      <line x1={c1.x} y1={c1.y + gap * 2} x2={c2.x} y2={c2.y + gap}
        stroke={selected ? SEL_COLOR : "#888"} strokeWidth={selected ? 2 : 1} strokeDasharray="4 4" pointerEvents="all" />
    </g>
  );
}
