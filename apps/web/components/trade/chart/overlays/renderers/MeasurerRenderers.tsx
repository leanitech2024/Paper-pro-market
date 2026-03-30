"use client";
import React from "react";
import type { DrawingRendererProps } from "./types";
import { SEL_COLOR, DRAW_COLOR } from "./types";
import type { TwoPointDrawing } from "@/stores/trading/analysis.store";

// ─── Price Range Measurer ─────────────────────────────────────────
export function renderPriceRange({ drawing, pointToCoords, mainSeries, selected, isDraft }: DrawingRendererProps): React.ReactNode {
  const d = drawing as TwoPointDrawing;
  const c1 = pointToCoords(d.p1);
  const c2 = pointToCoords(d.p2);
  if (!c1 || !c2) return null;

  const priceDiff = d.p2.price - d.p1.price;
  const pctChange = d.p1.price !== 0 ? ((priceDiff / d.p1.price) * 100).toFixed(2) : "0";
  const color = priceDiff >= 0 ? "#089981" : "#F23645";
  const midX = (c1.x + c2.x) / 2;
  const midY = (c1.y + c2.y) / 2;

  return (
    <g data-id={d.id}>
      {/* Vertical bracket line */}
      <line x1={c1.x} y1={c1.y} x2={c1.x} y2={c2.y}
        stroke={color} strokeWidth={2} pointerEvents="all" className="cursor-pointer" />
      {/* Top/bottom ticks */}
      <line x1={c1.x - 6} y1={c1.y} x2={c1.x + 6} y2={c1.y} stroke={color} strokeWidth={2} />
      <line x1={c1.x - 6} y1={c2.y} x2={c1.x + 6} y2={c2.y} stroke={color} strokeWidth={2} />
      {/* Stats panel */}
      {!isDraft && (
        <>
          <rect x={c1.x + 10} y={midY - 14} width={140} height={26} rx={4}
            fill="rgba(0,0,0,0.9)" pointerEvents="none" />
          <text x={c1.x + 80} y={midY + 3} textAnchor="middle" fill={color}
            fontSize={11} fontWeight="600" fontFamily="monospace" pointerEvents="none">
            {priceDiff >= 0 ? "+" : ""}{priceDiff.toFixed(2)} ({pctChange}%)
          </text>
        </>
      )}
    </g>
  );
}

// ─── Date Range Measurer ──────────────────────────────────────────
export function renderDateRange({ drawing, pointToCoords, data, height, selected, isDraft }: DrawingRendererProps): React.ReactNode {
  const d = drawing as TwoPointDrawing;
  const c1 = pointToCoords(d.p1);
  const c2 = pointToCoords(d.p2);
  if (!c1 || !c2) return null;

  const leftX = Math.min(c1.x, c2.x);
  const rightX = Math.max(c1.x, c2.x);
  const color = selected ? SEL_COLOR : "#64748B";

  // Compute bar count and day count
  const t1 = Math.min(d.p1.time, d.p2.time);
  const t2 = Math.max(d.p1.time, d.p2.time);
  const barsInRange = data.filter((c) => Number(c.time) >= t1 && Number(c.time) <= t2).length;
  const dayCount = Math.round((t2 - t1) / 86400);

  return (
    <g data-id={d.id}>
      <rect x={leftX} y={0} width={rightX - leftX} height={height}
        fill={selected ? "rgba(245,158,11,0.06)" : "rgba(100,116,139,0.06)"}
        pointerEvents="all" className="cursor-pointer" />
      <line x1={leftX} y1={0} x2={leftX} y2={height} stroke={color} strokeWidth={1} strokeDasharray="4 4" />
      <line x1={rightX} y1={0} x2={rightX} y2={height} stroke={color} strokeWidth={1} strokeDasharray="4 4" />
      {/* Stats panel */}
      {!isDraft && (
        <>
          <rect x={(leftX + rightX) / 2 - 60} y={height - 30} width={120} height={22} rx={4}
            fill="rgba(0,0,0,0.9)" pointerEvents="none" />
          <text x={(leftX + rightX) / 2} y={height - 14} textAnchor="middle" fill="#CCC"
            fontSize={10} fontFamily="monospace" pointerEvents="none">
            {barsInRange} bars, {dayCount}d
          </text>
        </>
      )}
    </g>
  );
}

// ─── Date and Price Range Measurer ────────────────────────────────
export function renderDatePriceRange({ drawing, pointToCoords, data, mainSeries, width, height, selected, isDraft }: DrawingRendererProps): React.ReactNode {
  const d = drawing as TwoPointDrawing;
  const c1 = pointToCoords(d.p1);
  const c2 = pointToCoords(d.p2);
  if (!c1 || !c2) return null;

  const leftX = Math.min(c1.x, c2.x);
  const rightX = Math.max(c1.x, c2.x);
  const topY = Math.min(c1.y, c2.y);
  const bottomY = Math.max(c1.y, c2.y);

  const priceDiff = d.p2.price - d.p1.price;
  const pctChange = d.p1.price !== 0 ? ((priceDiff / d.p1.price) * 100).toFixed(2) : "0";
  const t1 = Math.min(d.p1.time, d.p2.time);
  const t2 = Math.max(d.p1.time, d.p2.time);
  const barsInRange = data.filter((c) => Number(c.time) >= t1 && Number(c.time) <= t2).length;
  const dayCount = Math.round((t2 - t1) / 86400);
  const volSum = data
    .filter((c) => Number(c.time) >= t1 && Number(c.time) <= t2)
    .reduce((sum, c) => sum + (Number((c as any).volume) || 0), 0);
  const color = priceDiff >= 0 ? "#089981" : "#F23645";

  const formatVol = (v: number): string => {
    if (v >= 1e9) return `${(v / 1e9).toFixed(3)}B`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(3)}M`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
    return String(v);
  };

  return (
    <g data-id={d.id}>
      {/* Selection rectangle */}
      <rect x={leftX} y={topY} width={rightX - leftX} height={bottomY - topY}
        fill={priceDiff >= 0 ? "rgba(8,153,129,0.08)" : "rgba(242,54,69,0.08)"}
        stroke={color} strokeWidth={1} strokeDasharray="4 4"
        pointerEvents="all" className="cursor-pointer" />

      {/* Stats panel */}
      {!isDraft && (
        <>
          <rect x={rightX + 6} y={topY} width={165} height={48} rx={5}
            fill="rgba(0,0,0,0.92)" pointerEvents="none" />
          <text x={rightX + 14} y={topY + 15} fill={color}
            fontSize={11} fontWeight="700" fontFamily="monospace" pointerEvents="none">
            {priceDiff >= 0 ? "+" : ""}{priceDiff.toFixed(2)} ({pctChange}%)
          </text>
          <text x={rightX + 14} y={topY + 30} fill="#AAA"
            fontSize={10} fontFamily="monospace" pointerEvents="none">
            {barsInRange} bars, {dayCount}d
          </text>
          <text x={rightX + 14} y={topY + 43} fill="#888"
            fontSize={9} fontFamily="monospace" pointerEvents="none">
            vol {formatVol(volSum)}
          </text>
        </>
      )}
    </g>
  );
}
