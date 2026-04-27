"use client";
import React from "react";
import type { DrawingRendererProps } from "./types";
import { SEL_COLOR, DRAW_COLOR } from "./types";
import type { TwoPointDrawing } from "@/domains/chart/stores/analysis.store";

// ─── Gann Box ─────────────────────────────────────────────────────
export function renderGannBox({ drawing, pointToCoords, selected }: DrawingRendererProps): React.ReactNode {
  const d = drawing as TwoPointDrawing;
  const c1 = pointToCoords(d.p1);
  const c2 = pointToCoords(d.p2);
  if (!c1 || !c2) return null;

  const x = Math.min(c1.x, c2.x);
  const y = Math.min(c1.y, c2.y);
  const w = Math.abs(c2.x - c1.x);
  const h = Math.abs(c2.y - c1.y);
  const color = selected ? SEL_COLOR : DRAW_COLOR;
  const divisions = [0, 0.25, 0.333, 0.5, 0.667, 0.75, 1];

  return (
    <g data-id={d.id}>
      <rect x={x} y={y} width={w} height={h}
        fill={selected ? "rgba(245,158,11,0.06)" : "rgba(41,98,255,0.04)"}
        stroke={color} strokeWidth={1} pointerEvents="all" className="cursor-pointer" />
      {/* Horizontal divisions */}
      {divisions.slice(1, -1).map((ratio) => (
        <line key={`gh-${ratio}`} x1={x} y1={y + h * ratio} x2={x + w} y2={y + h * ratio}
          stroke={color} strokeWidth={0.5} strokeDasharray="3 3" opacity={0.5} pointerEvents="none" />
      ))}
      {/* Vertical divisions */}
      {divisions.slice(1, -1).map((ratio) => (
        <line key={`gv-${ratio}`} x1={x + w * ratio} y1={y} x2={x + w * ratio} y2={y + h}
          stroke={color} strokeWidth={0.5} strokeDasharray="3 3" opacity={0.5} pointerEvents="none" />
      ))}
      {/* Diagonals */}
      <line x1={x} y1={y} x2={x + w} y2={y + h} stroke={color} strokeWidth={1} opacity={0.6} pointerEvents="none" />
      <line x1={x + w} y1={y} x2={x} y2={y + h} stroke={color} strokeWidth={1} opacity={0.6} pointerEvents="none" />
    </g>
  );
}

// ─── Gann Square (Fixed and Regular share same renderer) ──────────
export function renderGannSquare({ drawing, pointToCoords, selected }: DrawingRendererProps): React.ReactNode {
  const d = drawing as TwoPointDrawing;
  const c1 = pointToCoords(d.p1);
  const c2 = pointToCoords(d.p2);
  if (!c1 || !c2) return null;

  const size = Math.max(Math.abs(c2.x - c1.x), Math.abs(c2.y - c1.y));
  const color = selected ? SEL_COLOR : DRAW_COLOR;

  return (
    <g data-id={d.id}>
      <rect x={c1.x} y={c1.y} width={size} height={size}
        fill={selected ? "rgba(245,158,11,0.06)" : "rgba(41,98,255,0.04)"}
        stroke={color} strokeWidth={1} pointerEvents="all" className="cursor-pointer" />
      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map((r) => (
        <React.Fragment key={`gs-${r}`}>
          <line x1={c1.x} y1={c1.y + size * r} x2={c1.x + size} y2={c1.y + size * r}
            stroke={color} strokeWidth={0.5} opacity={0.4} pointerEvents="none" />
          <line x1={c1.x + size * r} y1={c1.y} x2={c1.x + size * r} y2={c1.y + size}
            stroke={color} strokeWidth={0.5} opacity={0.4} pointerEvents="none" />
        </React.Fragment>
      ))}
      {/* Diagonals */}
      <line x1={c1.x} y1={c1.y} x2={c1.x + size} y2={c1.y + size} stroke={color} strokeWidth={1} opacity={0.5} pointerEvents="none" />
      <line x1={c1.x + size} y1={c1.y} x2={c1.x} y2={c1.y + size} stroke={color} strokeWidth={1} opacity={0.5} pointerEvents="none" />
    </g>
  );
}

export function renderGannSquareFixed(props: DrawingRendererProps): React.ReactNode {
  return renderGannSquare(props);
}

// ─── Gann Fan ─────────────────────────────────────────────────────
export function renderGannFan({ drawing, pointToCoords, width, height, selected }: DrawingRendererProps): React.ReactNode {
  const d = drawing as TwoPointDrawing;
  const c1 = pointToCoords(d.p1);
  const c2 = pointToCoords(d.p2);
  if (!c1 || !c2) return null;

  const color = selected ? SEL_COLOR : DRAW_COLOR;
  // Gann angles: 1x1, 1x2, 2x1, 1x3, 3x1, 1x4, 4x1, 1x8, 8x1
  const angles = [
    { label: "1×1", ratio: 1 },
    { label: "1×2", ratio: 0.5 },
    { label: "2×1", ratio: 2 },
    { label: "1×3", ratio: 0.333 },
    { label: "3×1", ratio: 3 },
    { label: "1×4", ratio: 0.25 },
    { label: "4×1", ratio: 4 },
  ];

  const dx = c2.x - c1.x;
  const dy = c2.y - c1.y;
  const baseAngle = Math.abs(dx) > 0 ? dy / dx : 1;

  return (
    <g data-id={d.id}>
      {angles.map(({ label, ratio }) => {
        const endX = width;
        const endY = c1.y + baseAngle * ratio * (endX - c1.x);
        const clampedY = Math.max(0, Math.min(height, endY));
        return (
          <g key={label}>
            <line x1={c1.x} y1={c1.y} x2={endX} y2={clampedY}
              stroke={color} strokeWidth={ratio === 1 ? 2 : 1}
              opacity={ratio === 1 ? 1 : 0.5}
              strokeDasharray={ratio === 1 ? undefined : "4 4"} pointerEvents="all" />
            <text x={endX - 30} y={clampedY - 4} fill={color}
              fontSize={8} fontFamily="monospace" opacity={0.7} pointerEvents="none">
              {label}
            </text>
          </g>
        );
      })}
      <circle cx={c1.x} cy={c1.y} r={4} fill={color} pointerEvents="none" />
    </g>
  );
}
