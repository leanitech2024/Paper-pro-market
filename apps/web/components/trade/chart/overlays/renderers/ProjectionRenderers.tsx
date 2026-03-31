"use client";
import React from "react";
import type { DrawingRendererProps } from "./types";
import { SEL_COLOR, GREEN_COLOR, RED_COLOR } from "./types";
import type { PositionDrawing, TwoPointDrawing } from "@/stores/trading/analysis.store";

// ─── Long Position ────────────────────────────────────────────────
export function renderLongPosition({ drawing, mainSeries, width, height, pointToCoords, selected }: DrawingRendererProps): React.ReactNode {
  const d = drawing as PositionDrawing;
  const entryY = mainSeries.priceToCoordinate(d.entryPrice) ?? 0;
  const targetY = mainSeries.priceToCoordinate(d.targetPrice) ?? 0;
  const stopY = mainSeries.priceToCoordinate(d.stopPrice) ?? 0;

  // The user explicitly wants no gap on the left side, so we start at exactly 0
  const panelX = 0; 
  // Account for price scale on right (approx 60px)
  const plotWidth = width - 60;
  const panelW = Math.max(10, plotWidth);
  
  const risk = Math.abs(d.entryPrice - d.stopPrice);
  const reward = Math.abs(d.targetPrice - d.entryPrice);
  const rr = risk > 0 ? (reward / risk).toFixed(2) : "∞";
  const pctTarget = ((d.targetPrice - d.entryPrice) / d.entryPrice * 100).toFixed(2);
  const pctStop = ((d.stopPrice - d.entryPrice) / d.entryPrice * 100).toFixed(2);

  // Clip dimensions to avoid time-axis bleed
  const clipHeight = height - 26;

  return (
    <g data-id={d.id} clipPath={`url(#chart-clip)`}>
      {/* Target zone (green) */}
      <rect x={panelX} y={Math.min(Number(targetY), Number(entryY))} width={panelW}
        height={Math.abs(Number(targetY) - Number(entryY))}
        fill="rgba(8,153,129,0.15)" stroke="none" pointerEvents="all" className="cursor-pointer" />
      {/* Stop zone (red) */}
      <rect x={panelX} y={Math.min(Number(entryY), Number(stopY))} width={panelW}
        height={Math.abs(Number(stopY) - Number(entryY))}
        fill="rgba(242,54,69,0.15)" stroke="none" pointerEvents="all" className="cursor-pointer" />

      {/* Target line */}
      <line x1={panelX} y1={targetY} x2={panelX + panelW} y2={targetY}
        stroke={GREEN_COLOR} strokeWidth={2} pointerEvents="all" />
      {/* Entry line */}
      <line x1={panelX} y1={entryY} x2={panelX + panelW} y2={entryY}
        stroke={selected ? SEL_COLOR : "#9CA3AF"} strokeWidth={2} strokeDasharray="6 4" pointerEvents="all" />
      {/* Stop line */}
      <line x1={panelX} y1={stopY} x2={panelX + panelW} y2={stopY}
        stroke={RED_COLOR} strokeWidth={2} pointerEvents="all" />

      {/* Target label */}
      <rect x={panelX + panelW - 160} y={Number(targetY) - 20} width={156} height={18} rx={3}
        fill="rgba(8,153,129,0.9)" pointerEvents="none" />
      <text x={panelX + panelW - 82} y={Number(targetY) - 7} textAnchor="middle" fill="#fff"
        fontSize={10} fontWeight="600" fontFamily="monospace" pointerEvents="none">
        ✓ Target ₹{d.targetPrice.toFixed(2)} (+{pctTarget}%)
      </text>

      {/* Entry label */}
      <rect x={panelX + 10} y={Number(entryY) - 20} width={130} height={18} rx={3}
        fill="rgba(0,0,0,0.85)" pointerEvents="none" />
      <text x={panelX + 75} y={Number(entryY) - 7} textAnchor="middle" fill="#E0E0E0"
        fontSize={10} fontWeight="600" fontFamily="monospace" pointerEvents="none">
        Entry ₹{d.entryPrice.toFixed(2)}
      </text>

      {/* Stop label */}
      <rect x={panelX + panelW - 150} y={Number(stopY) + 4} width={146} height={18} rx={3}
        fill="rgba(242,54,69,0.9)" pointerEvents="none" />
      <text x={panelX + panelW - 77} y={Number(stopY) + 16} textAnchor="middle" fill="#fff"
        fontSize={10} fontWeight="600" fontFamily="monospace" pointerEvents="none">
        ✗ Stop ₹{d.stopPrice.toFixed(2)} ({pctStop}%)
      </text>

      {/* R:R badge */}
      <rect x={panelX + 10} y={Number(entryY) + 4} width={180} height={16} rx={3}
        fill="rgba(0,0,0,0.75)" pointerEvents="none" />
      <text x={panelX + 100} y={Number(entryY) + 15} textAnchor="middle" fill="#AAA"
        fontSize={9} fontFamily="monospace" pointerEvents="none">
        Risk ₹{risk.toFixed(2)} | Reward ₹{reward.toFixed(2)} | R:R 1:{rr}
      </text>
    </g>
  );
}

// ─── Short Position ───────────────────────────────────────────────
export function renderShortPosition({ drawing, mainSeries, width, height, pointToCoords, selected }: DrawingRendererProps): React.ReactNode {
  const d = drawing as PositionDrawing;
  const entryY = mainSeries.priceToCoordinate(d.entryPrice) ?? 0;
  const targetY = mainSeries.priceToCoordinate(d.targetPrice) ?? 0;
  const stopY = mainSeries.priceToCoordinate(d.stopPrice) ?? 0;

  // Start at exactly 0 on the left side
  const panelX = 0;
  // Leave 60px for the right price scale
  const plotWidth = width - 60;
  const panelW = Math.max(10, plotWidth);

  const risk = Math.abs(d.stopPrice - d.entryPrice);
  const reward = Math.abs(d.entryPrice - d.targetPrice);
  const rr = risk > 0 ? (reward / risk).toFixed(2) : "∞";
  const pctTarget = ((d.targetPrice - d.entryPrice) / d.entryPrice * 100).toFixed(2);
  const pctStop = ((d.stopPrice - d.entryPrice) / d.entryPrice * 100).toFixed(2);

  return (
    <g data-id={d.id} clipPath={`url(#chart-clip)`}>
      {/* Stop zone (red — above entry for short) */}
      <rect x={panelX} y={Math.min(Number(stopY), Number(entryY))} width={panelW}
        height={Math.abs(Number(stopY) - Number(entryY))}
        fill="rgba(242,54,69,0.15)" stroke="none" pointerEvents="all" className="cursor-pointer" />
      {/* Target zone (green — below entry for short) */}
      <rect x={panelX} y={Math.min(Number(entryY), Number(targetY))} width={panelW}
        height={Math.abs(Number(targetY) - Number(entryY))}
        fill="rgba(8,153,129,0.15)" stroke="none" pointerEvents="all" className="cursor-pointer" />

      {/* Stop line */}
      <line x1={panelX} y1={stopY} x2={panelX + panelW} y2={stopY}
        stroke={RED_COLOR} strokeWidth={2} pointerEvents="all" />
      {/* Entry line */}
      <line x1={panelX} y1={entryY} x2={panelX + panelW} y2={entryY}
        stroke={selected ? SEL_COLOR : "#9CA3AF"} strokeWidth={2} strokeDasharray="6 4" pointerEvents="all" />
      {/* Target line */}
      <line x1={panelX} y1={targetY} x2={panelX + panelW} y2={targetY}
        stroke={GREEN_COLOR} strokeWidth={2} pointerEvents="all" />

      {/* Stop label */}
      <rect x={panelX + panelW - 150} y={Number(stopY) - 20} width={146} height={18} rx={3}
        fill="rgba(242,54,69,0.9)" pointerEvents="none" />
      <text x={panelX + panelW - 77} y={Number(stopY) - 7} textAnchor="middle" fill="#fff"
        fontSize={10} fontWeight="600" fontFamily="monospace" pointerEvents="none">
        ✗ Stop ₹{d.stopPrice.toFixed(2)} (+{pctStop}%)
      </text>

      {/* Entry label */}
      <rect x={panelX + 10} y={Number(entryY) - 20} width={130} height={18} rx={3}
        fill="rgba(0,0,0,0.85)" pointerEvents="none" />
      <text x={panelX + 75} y={Number(entryY) - 7} textAnchor="middle" fill="#E0E0E0"
        fontSize={10} fontWeight="600" fontFamily="monospace" pointerEvents="none">
        Entry ₹{d.entryPrice.toFixed(2)}
      </text>

      {/* Target label */}
      <rect x={panelX + panelW - 160} y={Number(targetY) + 4} width={156} height={18} rx={3}
        fill="rgba(8,153,129,0.9)" pointerEvents="none" />
      <text x={panelX + panelW - 82} y={Number(targetY) + 16} textAnchor="middle" fill="#fff"
        fontSize={10} fontWeight="600" fontFamily="monospace" pointerEvents="none">
        ✓ Target ₹{d.targetPrice.toFixed(2)} ({pctTarget}%)
      </text>

      {/* R:R badge */}
      <rect x={panelX + 10} y={Number(entryY) + 4} width={180} height={16} rx={3}
        fill="rgba(0,0,0,0.75)" pointerEvents="none" />
      <text x={panelX + 100} y={Number(entryY) + 15} textAnchor="middle" fill="#AAA"
        fontSize={9} fontFamily="monospace" pointerEvents="none">
        Risk ₹{risk.toFixed(2)} | Reward ₹{reward.toFixed(2)} | R:R 1:{rr}
      </text>
    </g>
  );
}

// ─── Forecast ─────────────────────────────────────────────────────
export function renderForecast({ drawing, pointToCoords, selected }: DrawingRendererProps): React.ReactNode {
  const d = drawing as TwoPointDrawing;
  const c1 = pointToCoords(d.p1);
  const c2 = pointToCoords(d.p2);
  if (!c1 || !c2) return null;

  return (
    <g data-id={d.id}>
      <line x1={c1.x} y1={c1.y} x2={c2.x} y2={c2.y}
        stroke={selected ? SEL_COLOR : "#9C27B0"} strokeWidth={2} strokeDasharray="8 4"
        pointerEvents="all" className="cursor-pointer" />
      <circle cx={c2.x} cy={c2.y} r={5} fill={selected ? SEL_COLOR : "#9C27B0"} pointerEvents="none" />
      <text x={c2.x + 8} y={c2.y + 4} fill={selected ? SEL_COLOR : "#9C27B0"}
        fontSize={10} fontFamily="monospace" pointerEvents="none">
        ₹{d.p2.price.toFixed(2)}
      </text>
    </g>
  );
}

// ─── Bars Pattern / Ghost Feed (simplified) ───────────────────────
export function renderBarsPattern({ drawing, pointToCoords, selected }: DrawingRendererProps): React.ReactNode {
  const d = drawing as TwoPointDrawing;
  const c1 = pointToCoords(d.p1);
  const c2 = pointToCoords(d.p2);
  if (!c1 || !c2) return null;

  return (
    <g data-id={d.id}>
      <rect x={Math.min(c1.x, c2.x)} y={Math.min(c1.y, c2.y)}
        width={Math.abs(c2.x - c1.x)} height={Math.abs(c2.y - c1.y)}
        fill={selected ? "rgba(245,158,11,0.1)" : "rgba(156,39,176,0.08)"}
        stroke={selected ? SEL_COLOR : "#9C27B0"} strokeWidth={1} strokeDasharray="6 3"
        pointerEvents="all" className="cursor-pointer" />
      <text x={(c1.x + c2.x) / 2} y={(c1.y + c2.y) / 2} textAnchor="middle"
        fill={selected ? SEL_COLOR : "#9C27B0"} fontSize={10} fontFamily="monospace" opacity={0.7} pointerEvents="none">
        Pattern
      </text>
    </g>
  );
}

export function renderGhostFeed(props: DrawingRendererProps): React.ReactNode {
  return renderBarsPattern(props);
}
