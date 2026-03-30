"use client";
import React from "react";
import type { DrawingRendererProps, PointCoords } from "./types";
import { drawingStroke, SEL_COLOR, DRAW_COLOR } from "./types";
import type { TwoPointDrawing, ThreePointDrawing, MultiPointDrawing } from "@/stores/trading/analysis.store";

// ─── Rectangle ────────────────────────────────────────────────────
export function renderRectangle({ drawing, pointToCoords, selected }: DrawingRendererProps): React.ReactNode {
  const d = drawing as TwoPointDrawing;
  const c1 = pointToCoords(d.p1);
  const c2 = pointToCoords(d.p2);
  if (!c1 || !c2) return null;

  const x = Math.min(c1.x, c2.x);
  const y = Math.min(c1.y, c2.y);
  const w = Math.abs(c2.x - c1.x);
  const h = Math.abs(c2.y - c1.y);

  return (
    <rect data-id={d.id} x={x} y={y} width={w} height={h}
      fill={selected ? "rgba(245,158,11,0.2)" : "rgba(41,98,255,0.1)"}
      stroke={selected ? SEL_COLOR : DRAW_COLOR} strokeWidth={selected ? 2 : 1}
      pointerEvents="all" className="cursor-pointer hover:stroke-orange-400 transition-colors" />
  );
}

// ─── Rotated Rectangle ────────────────────────────────────────────
export function renderRotatedRectangle({ drawing, pointToCoords, selected }: DrawingRendererProps): React.ReactNode {
  const d = drawing as TwoPointDrawing;
  const c1 = pointToCoords(d.p1);
  const c2 = pointToCoords(d.p2);
  if (!c1 || !c2) return null;

  const dx = c2.x - c1.x;
  const dy = c2.y - c1.y;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  const w = Math.sqrt(dx * dx + dy * dy);
  const h = w * 0.3;

  return (
    <rect data-id={d.id} x={0} y={-h / 2} width={w} height={h}
      transform={`translate(${c1.x},${c1.y}) rotate(${angle})`}
      fill={selected ? "rgba(245,158,11,0.15)" : "rgba(41,98,255,0.08)"}
      stroke={selected ? SEL_COLOR : DRAW_COLOR} strokeWidth={1}
      pointerEvents="all" className="cursor-pointer" />
  );
}

// ─── Circle ───────────────────────────────────────────────────────
export function renderCircle({ drawing, pointToCoords, selected }: DrawingRendererProps): React.ReactNode {
  const d = drawing as TwoPointDrawing;
  const c1 = pointToCoords(d.p1);
  const c2 = pointToCoords(d.p2);
  if (!c1 || !c2) return null;

  const r = Math.sqrt((c2.x - c1.x) ** 2 + (c2.y - c1.y) ** 2);

  return (
    <circle data-id={d.id} cx={c1.x} cy={c1.y} r={r}
      fill={selected ? "rgba(245,158,11,0.1)" : "rgba(41,98,255,0.06)"}
      stroke={selected ? SEL_COLOR : DRAW_COLOR} strokeWidth={selected ? 2 : 1}
      pointerEvents="all" className="cursor-pointer hover:stroke-orange-400 transition-colors" />
  );
}

// ─── Ellipse ──────────────────────────────────────────────────────
export function renderEllipse({ drawing, pointToCoords, selected }: DrawingRendererProps): React.ReactNode {
  const d = drawing as TwoPointDrawing;
  const c1 = pointToCoords(d.p1);
  const c2 = pointToCoords(d.p2);
  if (!c1 || !c2) return null;

  const cx = (c1.x + c2.x) / 2;
  const cy = (c1.y + c2.y) / 2;
  const rx = Math.abs(c2.x - c1.x) / 2;
  const ry = Math.abs(c2.y - c1.y) / 2;

  return (
    <ellipse data-id={d.id} cx={cx} cy={cy} rx={rx} ry={ry}
      fill={selected ? "rgba(245,158,11,0.1)" : "rgba(41,98,255,0.06)"}
      stroke={selected ? SEL_COLOR : DRAW_COLOR} strokeWidth={selected ? 2 : 1}
      pointerEvents="all" className="cursor-pointer hover:stroke-orange-400 transition-colors" />
  );
}

// ─── Polyline ─────────────────────────────────────────────────────
export function renderPolyline({ drawing, pointToCoords, selected }: DrawingRendererProps): React.ReactNode {
  const d = drawing as MultiPointDrawing;
  const coords = d.points.map(pointToCoords).filter((c): c is PointCoords => Boolean(c));
  if (coords.length < 2) return null;

  const pts = coords.map((c) => `${c.x},${c.y}`).join(" ");

  return (
    <polyline data-id={d.id} points={pts} fill="none"
      stroke={selected ? SEL_COLOR : DRAW_COLOR} strokeWidth={selected ? 3 : 2}
      pointerEvents="all" className="cursor-pointer hover:stroke-orange-400 transition-colors" />
  );
}

// ─── Path (same as polyline) ──────────────────────────────────────
export function renderPath(props: DrawingRendererProps): React.ReactNode {
  return renderPolyline(props);
}

// ─── Triangle Shape ───────────────────────────────────────────────
export function renderTriangleShape({ drawing, pointToCoords, selected }: DrawingRendererProps): React.ReactNode {
  const d = drawing as ThreePointDrawing;
  const c1 = pointToCoords(d.p1);
  const c2 = pointToCoords(d.p2);
  const c3 = pointToCoords(d.p3);
  if (!c1 || !c2 || !c3) return null;

  return (
    <polygon data-id={d.id} points={`${c1.x},${c1.y} ${c2.x},${c2.y} ${c3.x},${c3.y}`}
      fill={selected ? "rgba(245,158,11,0.12)" : "rgba(41,98,255,0.08)"}
      stroke={selected ? SEL_COLOR : DRAW_COLOR} strokeWidth={selected ? 2 : 1.5}
      pointerEvents="all" className="cursor-pointer hover:stroke-orange-400 transition-colors" />
  );
}

// ─── Curve (quadratic bezier) ─────────────────────────────────────
export function renderCurve({ drawing, pointToCoords, selected }: DrawingRendererProps): React.ReactNode {
  const d = drawing as TwoPointDrawing;
  const c1 = pointToCoords(d.p1);
  const c2 = pointToCoords(d.p2);
  if (!c1 || !c2) return null;

  const cpX = (c1.x + c2.x) / 2;
  const cpY = Math.min(c1.y, c2.y) - Math.abs(c2.y - c1.y) * 0.5;

  return (
    <path data-id={d.id} d={`M ${c1.x} ${c1.y} Q ${cpX} ${cpY} ${c2.x} ${c2.y}`}
      fill="none" stroke={selected ? SEL_COLOR : DRAW_COLOR} strokeWidth={selected ? 3 : 2}
      pointerEvents="all" className="cursor-pointer hover:stroke-orange-400 transition-colors" />
  );
}

// ─── Double Curve (S-curve) ───────────────────────────────────────
export function renderDoubleCurve({ drawing, pointToCoords, selected }: DrawingRendererProps): React.ReactNode {
  const d = drawing as TwoPointDrawing;
  const c1 = pointToCoords(d.p1);
  const c2 = pointToCoords(d.p2);
  if (!c1 || !c2) return null;

  const thirdX = c1.x + (c2.x - c1.x) / 3;
  const twoThirdX = c1.x + 2 * (c2.x - c1.x) / 3;
  const amplitude = Math.abs(c2.y - c1.y) * 0.4;

  return (
    <path data-id={d.id}
      d={`M ${c1.x} ${c1.y} C ${thirdX} ${c1.y - amplitude} ${twoThirdX} ${c2.y + amplitude} ${c2.x} ${c2.y}`}
      fill="none" stroke={selected ? SEL_COLOR : DRAW_COLOR} strokeWidth={selected ? 3 : 2}
      pointerEvents="all" className="cursor-pointer hover:stroke-orange-400 transition-colors" />
  );
}
