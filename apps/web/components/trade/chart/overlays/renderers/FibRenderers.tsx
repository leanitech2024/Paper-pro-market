"use client";
import React from "react";
import type { DrawingRendererProps } from "./types";
import { FIB_LEVELS, FIB_COLORS, SEL_COLOR, DRAW_COLOR } from "./types";
import type { TwoPointDrawing } from "@/stores/trading/analysis.store";

// ─── Fibonacci Retracement ────────────────────────────────────────
export function renderFibRetracement({ drawing, pointToCoords, mainSeries, width, selected }: DrawingRendererProps): React.ReactNode {
  const d = drawing as TwoPointDrawing;
  const c1 = pointToCoords(d.p1);
  const c2 = pointToCoords(d.p2);
  if (!c1 || !c2) return null;

  const levels = d.fibLevels ?? FIB_LEVELS;
  const highPrice = Math.max(d.p1.price, d.p2.price);
  const lowPrice = Math.min(d.p1.price, d.p2.price);
  const priceRange = highPrice - lowPrice;
  const leftX = Math.min(c1.x, c2.x);
  const rightX = Math.max(c1.x, c2.x);
  const zoneWidth = Math.max(rightX - leftX, width * 0.6);

  return (
    <g data-id={d.id}>
      {levels.map((level, i) => {
        const price = highPrice - priceRange * level;
        const y = mainSeries.priceToCoordinate(price);
        if (y === null) return null;
        const pct = (level * 100).toFixed(1);
        const nextLevel = levels[i + 1];
        const nextPrice = nextLevel !== undefined ? highPrice - priceRange * nextLevel : null;
        const nextY = nextPrice !== null ? mainSeries.priceToCoordinate(nextPrice) : null;

        return (
          <React.Fragment key={`fib-${level}`}>
            {/* Zone fill between current and next level */}
            {nextY !== null && (
              <rect
                x={leftX} y={Math.min(Number(y), Number(nextY))}
                width={zoneWidth}
                height={Math.abs(Number(nextY) - Number(y))}
                fill={FIB_COLORS[i % FIB_COLORS.length]}
                pointerEvents="all" className="cursor-pointer"
              />
            )}
            {/* Level line */}
            <line
              x1={leftX} y1={y} x2={leftX + zoneWidth} y2={y}
              stroke={selected ? SEL_COLOR : DRAW_COLOR}
              strokeWidth={level === 0 || level === 1 ? 2 : 1}
              strokeDasharray={level === 0.5 ? "4 4" : undefined}
              pointerEvents="all"
            />
            {/* Label */}
            <text x={leftX + 4} y={Number(y) - 4} fill={selected ? SEL_COLOR : "#CCC"}
              fontSize={10} fontFamily="monospace" pointerEvents="none">
              {pct}% — ₹{price.toFixed(2)}
            </text>
          </React.Fragment>
        );
      })}
    </g>
  );
}

// ─── Trend-Based Fib Extension ────────────────────────────────────
export function renderFibExtension({ drawing, pointToCoords, mainSeries, width, selected }: DrawingRendererProps): React.ReactNode {
  const d = drawing as TwoPointDrawing;
  const c1 = pointToCoords(d.p1);
  const c2 = pointToCoords(d.p2);
  if (!c1 || !c2) return null;

  const extensionLevels = [0, 0.236, 0.382, 0.5, 0.618, 1, 1.272, 1.618, 2, 2.618];
  const priceRange = d.p2.price - d.p1.price;
  const leftX = Math.min(c1.x, c2.x);
  const zoneWidth = Math.max(Math.abs(c2.x - c1.x), width * 0.5);

  return (
    <g data-id={d.id}>
      {extensionLevels.map((level) => {
        const price = d.p1.price + priceRange * level;
        const y = mainSeries.priceToCoordinate(price);
        if (y === null) return null;

        return (
          <g key={`fibe-${level}`}>
            <line x1={leftX} y1={y} x2={leftX + zoneWidth} y2={y}
              stroke={selected ? SEL_COLOR : level > 1 ? "#FF9800" : DRAW_COLOR}
              strokeWidth={level === 1 ? 2 : 1}
              strokeDasharray={level > 1 ? "6 3" : undefined}
              pointerEvents="all" />
            <text x={leftX + 4} y={Number(y) - 4} fill={selected ? SEL_COLOR : "#AAA"}
              fontSize={9} fontFamily="monospace" pointerEvents="none">
              {(level * 100).toFixed(1)}%
            </text>
          </g>
        );
      })}
    </g>
  );
}

// ─── Fib Channel ──────────────────────────────────────────────────
export function renderFibChannel(props: DrawingRendererProps): React.ReactNode {
  // Treat as retracement rotated along the trendline — simplified as angled fib bands
  return renderFibRetracement(props);
}

// ─── Fib Time Zone ────────────────────────────────────────────────
export function renderFibTimeZone({ drawing, pointToCoords, height, selected }: DrawingRendererProps): React.ReactNode {
  const d = drawing as TwoPointDrawing;
  const c1 = pointToCoords(d.p1);
  const c2 = pointToCoords(d.p2);
  if (!c1 || !c2) return null;

  const baseWidth = Math.abs(c2.x - c1.x);
  const fibNums = [1, 1, 2, 3, 5, 8, 13, 21, 34];
  const startX = Math.min(c1.x, c2.x);

  return (
    <g data-id={d.id}>
      {fibNums.map((n, i) => {
        const x = startX + baseWidth * n;
        if (x > 3000) return null; // Don't render too far
        return (
          <g key={`fibt-${i}`}>
            <line x1={x} y1={0} x2={x} y2={height}
              stroke={selected ? SEL_COLOR : "rgba(41,98,255,0.5)"}
              strokeWidth={1} strokeDasharray="4 4" pointerEvents="all" />
            <text x={x + 3} y={14} fill={selected ? SEL_COLOR : "#888"}
              fontSize={9} fontFamily="monospace" pointerEvents="none">
              {n}
            </text>
          </g>
        );
      })}
    </g>
  );
}

// ─── Fib Speed Resistance Fan ─────────────────────────────────────
export function renderFibSpeedFan({ drawing, pointToCoords, width, selected }: DrawingRendererProps): React.ReactNode {
  const d = drawing as TwoPointDrawing;
  const c1 = pointToCoords(d.p1);
  const c2 = pointToCoords(d.p2);
  if (!c1 || !c2) return null;

  const fanLevels = [0.236, 0.382, 0.5, 0.618, 0.786];

  return (
    <g data-id={d.id}>
      {fanLevels.map((level) => {
        const endY = c1.y + (c2.y - c1.y) * level;
        return (
          <line key={`fan-${level}`}
            x1={c1.x} y1={c1.y} x2={width} y2={endY + (endY - c1.y) * ((width - c1.x) / (c2.x - c1.x || 1))}
            stroke={selected ? SEL_COLOR : `rgba(41,98,255,${0.3 + level * 0.5})`}
            strokeWidth={1} pointerEvents="all" />
        );
      })}
      <circle cx={c1.x} cy={c1.y} r={3} fill={selected ? SEL_COLOR : DRAW_COLOR} pointerEvents="none" />
    </g>
  );
}

// Simplified versions for remaining fib tools
export function renderFibTimeExtension(props: DrawingRendererProps): React.ReactNode { return renderFibTimeZone(props); }
export function renderFibCircles({ drawing, pointToCoords, selected }: DrawingRendererProps): React.ReactNode {
  const d = drawing as TwoPointDrawing;
  const c1 = pointToCoords(d.p1);
  const c2 = pointToCoords(d.p2);
  if (!c1 || !c2) return null;
  const baseR = Math.sqrt((c2.x - c1.x) ** 2 + (c2.y - c1.y) ** 2);
  const ratios = [0.382, 0.5, 0.618, 1, 1.618];
  return (
    <g data-id={d.id}>
      {ratios.map((r) => (
        <circle key={`fc-${r}`} cx={c1.x} cy={c1.y} r={baseR * r}
          fill="none" stroke={selected ? SEL_COLOR : `rgba(41,98,255,${0.3 + r * 0.15})`}
          strokeWidth={1} pointerEvents="all" className="cursor-pointer" />
      ))}
    </g>
  );
}
export function renderFibSpiral(props: DrawingRendererProps): React.ReactNode { return renderFibCircles(props); }
export function renderFibSpeedArcs(props: DrawingRendererProps): React.ReactNode { return renderFibCircles(props); }
export function renderFibWedge(props: DrawingRendererProps): React.ReactNode { return renderFibSpeedFan(props); }
export function renderPitchfan(props: DrawingRendererProps): React.ReactNode { return renderFibSpeedFan(props); }
