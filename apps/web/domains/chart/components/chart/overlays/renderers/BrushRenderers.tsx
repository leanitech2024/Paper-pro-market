"use client";
import React from "react";
import type { DrawingRendererProps, PointCoords } from "./types";
import { SEL_COLOR, DRAW_COLOR } from "./types";
import type { BrushDrawing } from "@/domains/chart/stores/analysis.store";

// ─── Brush ────────────────────────────────────────────────────────
export function renderBrush({ drawing, pointToCoords, selected }: DrawingRendererProps): React.ReactNode {
  const d = drawing as BrushDrawing;
  const coords = d.points.map(pointToCoords).filter((c): c is PointCoords => Boolean(c));
  if (coords.length < 2) return null;

  const pathData = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");

  return (
    <path data-id={d.id} d={pathData} fill="none"
      stroke={selected ? SEL_COLOR : DRAW_COLOR}
      strokeWidth={d.strokeWidth || 2}
      strokeLinecap="round" strokeLinejoin="round"
      opacity={d.opacity ?? 1}
      pointerEvents="all" className="cursor-pointer hover:stroke-orange-400 transition-colors" />
  );
}

// ─── Highlighter ──────────────────────────────────────────────────
export function renderHighlighter({ drawing, pointToCoords, selected }: DrawingRendererProps): React.ReactNode {
  const d = drawing as BrushDrawing;
  const coords = d.points.map(pointToCoords).filter((c): c is PointCoords => Boolean(c));
  if (coords.length < 2) return null;

  const pathData = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");

  return (
    <path data-id={d.id} d={pathData} fill="none"
      stroke={selected ? "rgba(245,158,11,0.4)" : "rgba(255,235,59,0.35)"}
      strokeWidth={d.strokeWidth || 12}
      strokeLinecap="round" strokeLinejoin="round"
      opacity={d.opacity ?? 0.3}
      pointerEvents="all" className="cursor-pointer" />
  );
}

// ─── Cyclic Lines ─────────────────────────────────────────────────
export function renderCyclicLines({ drawing, pointToCoords, height, selected }: DrawingRendererProps): React.ReactNode {
  const d = drawing as any; // TwoPointDrawing
  const c1 = pointToCoords(d.p1);
  const c2 = pointToCoords(d.p2);
  if (!c1 || !c2) return null;

  const interval = Math.abs(c2.x - c1.x);
  if (interval < 10) return null;
  const color = selected ? SEL_COLOR : "rgba(41,98,255,0.4)";
  const lines: React.ReactNode[] = [];
  const startX = Math.min(c1.x, c2.x);

  for (let i = 0; i < 20; i++) {
    const x = startX + interval * i;
    if (x > 5000) break;
    lines.push(
      <line key={`cyc-${i}`} x1={x} y1={0} x2={x} y2={height}
        stroke={color} strokeWidth={1} strokeDasharray="6 4" pointerEvents="all" />
    );
  }

  return <g data-id={d.id}>{lines}</g>;
}

// ─── Time Cycles ──────────────────────────────────────────────────
export function renderTimeCycles({ drawing, pointToCoords, height, selected }: DrawingRendererProps): React.ReactNode {
  return renderCyclicLines({ drawing, pointToCoords, height, selected } as DrawingRendererProps);
}
