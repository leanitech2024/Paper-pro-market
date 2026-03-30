"use client";
import React from "react";
import type { DrawingRendererProps } from "./types";
import { SEL_COLOR, DRAW_COLOR } from "./types";
import type { TextDrawing, ArrowDrawing } from "@/stores/trading/analysis.store";

// ─── Text ─────────────────────────────────────────────────────────
export function renderText({ drawing, pointToCoords, selected }: DrawingRendererProps): React.ReactNode {
  const d = drawing as TextDrawing;
  const c = pointToCoords(d.point);
  if (!c) return null;
  const displayText = d.text || "Text";

  return (
    <g data-id={d.id}>
      <rect x={c.x - 2} y={c.y - 14} width={displayText.length * 7 + 8} height={18} rx={3}
        fill={selected ? "rgba(245,158,11,0.15)" : "transparent"}
        pointerEvents="all" className="cursor-pointer" />
      <text x={c.x + 2} y={c.y} fill={selected ? SEL_COLOR : "#E0E0E0"}
        fontSize={12} fontFamily="Inter, sans-serif" pointerEvents="none">
        {displayText}
      </text>
    </g>
  );
}

// ─── Anchored Text ────────────────────────────────────────────────
export function renderAnchoredText(props: DrawingRendererProps): React.ReactNode {
  return renderText(props);
}

// ─── Note ─────────────────────────────────────────────────────────
export function renderNote({ drawing, pointToCoords, selected }: DrawingRendererProps): React.ReactNode {
  const d = drawing as TextDrawing;
  const c = pointToCoords(d.point);
  if (!c) return null;
  const displayText = d.text || "Note";

  return (
    <g data-id={d.id}>
      <rect x={c.x} y={c.y - 28} width={Math.max(80, displayText.length * 7 + 16)} height={32} rx={4}
        fill="rgba(0,0,0,0.85)" stroke={selected ? SEL_COLOR : "#555"} strokeWidth={1}
        pointerEvents="all" className="cursor-pointer" />
      <text x={c.x + 8} y={c.y - 8} fill="#E0E0E0"
        fontSize={11} fontFamily="Inter, sans-serif" pointerEvents="none">
        {displayText}
      </text>
    </g>
  );
}

// ─── Anchored Note ────────────────────────────────────────────────
export function renderAnchoredNote(props: DrawingRendererProps): React.ReactNode {
  return renderNote(props);
}

// ─── Callout ──────────────────────────────────────────────────────
export function renderCallout({ drawing, pointToCoords, selected }: DrawingRendererProps): React.ReactNode {
  const d = drawing as TextDrawing;
  const c = pointToCoords(d.point);
  if (!c) return null;
  const displayText = d.text || "Callout";
  const w = Math.max(90, displayText.length * 7 + 20);

  return (
    <g data-id={d.id}>
      {/* Callout bubble */}
      <rect x={c.x} y={c.y - 36} width={w} height={28} rx={6}
        fill={selected ? "rgba(245,158,11,0.9)" : "rgba(41,98,255,0.85)"}
        pointerEvents="all" className="cursor-pointer" />
      {/* Arrow tip */}
      <polygon points={`${c.x + 10},${c.y - 8} ${c.x + 18},${c.y - 8} ${c.x + 14},${c.y}`}
        fill={selected ? "rgba(245,158,11,0.9)" : "rgba(41,98,255,0.85)"} pointerEvents="none" />
      <text x={c.x + w / 2} y={c.y - 18} textAnchor="middle" fill="#fff"
        fontSize={11} fontWeight="600" fontFamily="Inter, sans-serif" pointerEvents="none">
        {displayText}
      </text>
    </g>
  );
}

// ─── Comment ──────────────────────────────────────────────────────
export function renderComment({ drawing, pointToCoords, selected }: DrawingRendererProps): React.ReactNode {
  const d = drawing as TextDrawing;
  const c = pointToCoords(d.point);
  if (!c) return null;

  return (
    <g data-id={d.id}>
      <circle cx={c.x} cy={c.y} r={10}
        fill={selected ? "rgba(245,158,11,0.8)" : "rgba(41,98,255,0.7)"}
        stroke={selected ? SEL_COLOR : DRAW_COLOR} strokeWidth={1.5}
        pointerEvents="all" className="cursor-pointer" />
      <text x={c.x} y={c.y + 4} textAnchor="middle" fill="#fff"
        fontSize={11} fontWeight="bold" fontFamily="Inter, sans-serif" pointerEvents="none">
        💬
      </text>
    </g>
  );
}

// ─── Price Label ──────────────────────────────────────────────────
export function renderPriceLabel({ drawing, pointToCoords, selected }: DrawingRendererProps): React.ReactNode {
  const d = drawing as TextDrawing;
  const c = pointToCoords(d.point);
  if (!c) return null;

  const priceText = d.text || `₹${d.point.price.toFixed(2)}`;

  return (
    <g data-id={d.id}>
      <rect x={c.x - 4} y={c.y - 10} width={priceText.length * 7 + 12} height={20} rx={3}
        fill={selected ? "rgba(245,158,11,0.85)" : "rgba(168,85,247,0.85)"}
        pointerEvents="all" className="cursor-pointer" />
      <text x={c.x + 2} y={c.y + 4} fill="#fff"
        fontSize={10} fontWeight="600" fontFamily="monospace" pointerEvents="none">
        {priceText}
      </text>
    </g>
  );
}

// ─── Signpost ─────────────────────────────────────────────────────
export function renderSignpost({ drawing, pointToCoords, selected }: DrawingRendererProps): React.ReactNode {
  const d = drawing as TextDrawing;
  const c = pointToCoords(d.point);
  if (!c) return null;
  const displayText = d.text || "📌";

  return (
    <g data-id={d.id}>
      <line x1={c.x} y1={c.y} x2={c.x} y2={c.y - 30}
        stroke={selected ? SEL_COLOR : "#888"} strokeWidth={1.5} pointerEvents="none" />
      <rect x={c.x - 4} y={c.y - 46} width={Math.max(24, displayText.length * 7 + 10)} height={18} rx={3}
        fill={selected ? "rgba(245,158,11,0.85)" : "rgba(0,0,0,0.85)"}
        stroke={selected ? SEL_COLOR : "#555"} strokeWidth={1}
        pointerEvents="all" className="cursor-pointer" />
      <text x={c.x + 2} y={c.y - 33} fill="#E0E0E0"
        fontSize={10} fontFamily="Inter, sans-serif" pointerEvents="none">
        {displayText}
      </text>
    </g>
  );
}

// ─── Flag Mark ────────────────────────────────────────────────────
export function renderFlagMark({ drawing, pointToCoords, selected }: DrawingRendererProps): React.ReactNode {
  const d = drawing as TextDrawing;
  const c = pointToCoords(d.point);
  if (!c) return null;
  const color = selected ? SEL_COLOR : "#F44336";

  return (
    <g data-id={d.id}>
      <line x1={c.x} y1={c.y} x2={c.x} y2={c.y - 24} stroke={color} strokeWidth={1.5} pointerEvents="none" />
      <polygon points={`${c.x},${c.y - 24} ${c.x + 16},${c.y - 18} ${c.x},${c.y - 12}`}
        fill={color} pointerEvents="all" className="cursor-pointer" />
    </g>
  );
}

// ─── Arrow Marker ─────────────────────────────────────────────────
export function renderArrowMarker({ drawing, pointToCoords, selected }: DrawingRendererProps): React.ReactNode {
  const d = drawing as ArrowDrawing;
  const c = pointToCoords(d.point);
  if (!c) return null;
  const color = selected ? SEL_COLOR : DRAW_COLOR;
  const size = 10;

  const arrowPaths: Record<string, string> = {
    "arrow-marker": `M ${c.x} ${c.y - size} L ${c.x + size} ${c.y + size} L ${c.x - size} ${c.y + size} Z`,
    "arrow-up": `M ${c.x} ${c.y - size} L ${c.x + size} ${c.y + size / 2} L ${c.x - size} ${c.y + size / 2} Z`,
    "arrow-down": `M ${c.x - size} ${c.y - size / 2} L ${c.x + size} ${c.y - size / 2} L ${c.x} ${c.y + size} Z`,
    "arrow-left": `M ${c.x - size} ${c.y} L ${c.x + size / 2} ${c.y - size} L ${c.x + size / 2} ${c.y + size} Z`,
    "arrow-right": `M ${c.x + size} ${c.y} L ${c.x - size / 2} ${c.y - size} L ${c.x - size / 2} ${c.y + size} Z`,
  };

  const pathD = arrowPaths[d.type] ?? arrowPaths["arrow-marker"];

  return (
    <path data-id={d.id} d={pathD} fill={color}
      pointerEvents="all" className="cursor-pointer hover:fill-orange-400 transition-colors" />
  );
}

// Export all arrow variants using the same renderer
export const renderArrowUp = renderArrowMarker;
export const renderArrowDown = renderArrowMarker;
export const renderArrowLeft = renderArrowMarker;
export const renderArrowRight = renderArrowMarker;
