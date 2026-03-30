"use client";
import React from "react";
import type { DrawingRendererProps, PointCoords } from "./types";
import { SEL_COLOR, DRAW_COLOR, ELLIOTT_LABELS } from "./types";
import type { MultiPointDrawing } from "@/stores/trading/analysis.store";

/** Shared Elliott wave renderer — connected lines with labeled circles at each point (TradingView style) */
function renderElliottWave(
  props: DrawingRendererProps,
  defaultLabels: string[],
  waveColor: string,
): React.ReactNode {
  const d = props.drawing as MultiPointDrawing;
  const coords = d.points.map(props.pointToCoords).filter((c): c is PointCoords => Boolean(c));
  if (coords.length < 2) return null;

  const { selected } = props;
  const color = selected ? SEL_COLOR : waveColor;
  const labels = d.labels ?? defaultLabels;

  return (
    <g data-id={d.id}>
      {/* Connecting lines */}
      {coords.map((c, i) => {
        if (i === 0) return null;
        const prev = coords[i - 1];
        return (
          <line key={`ew-${i}`} x1={prev.x} y1={prev.y} x2={c.x} y2={c.y}
            stroke={color} strokeWidth={selected ? 3 : 2}
            pointerEvents="all" className="cursor-pointer hover:stroke-orange-400 transition-colors" />
        );
      })}
      {/* Labels tied to points */}
      {coords.map((c, i) => {
        const label = labels[i];
        if (!label) return null;
        // Alternate label position above/below based on index
        const isAbove = i % 2 === 0;
        const labelY = isAbove ? c.y - 18 : c.y + 18;
        return (
          <g key={`ewl-${i}`}>
            {/* Small dot at point */}
            <circle cx={c.x} cy={c.y} r={3} fill={color} pointerEvents="none" />
            {/* Label circle */}
            <circle cx={c.x} cy={labelY} r={11} fill="rgba(0,0,0,0.9)" stroke={color}
              strokeWidth={1.5} pointerEvents="none" />
            <text x={c.x} y={labelY + 4} textAnchor="middle" fill="#fff"
              fontSize={11} fontWeight="700" fontFamily="Inter, sans-serif" pointerEvents="none">
              {label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

// ─── Elliott Impulse Wave (12345) ─────────────────────────────────
export function renderElliottImpulse(props: DrawingRendererProps): React.ReactNode {
  return renderElliottWave(props, ELLIOTT_LABELS["elliott-impulse"], "#2962FF");
}

// ─── Elliott Correction Wave (ABC) ────────────────────────────────
export function renderElliottCorrection(props: DrawingRendererProps): React.ReactNode {
  return renderElliottWave(props, ELLIOTT_LABELS["elliott-correction"], "#FF6D00");
}

// ─── Elliott Triangle Wave (ABCDE) ────────────────────────────────
export function renderElliottTriangle(props: DrawingRendererProps): React.ReactNode {
  return renderElliottWave(props, ELLIOTT_LABELS["elliott-triangle"], "#8B5CF6");
}

// ─── Elliott Double Combo Wave (WXY) ──────────────────────────────
export function renderElliottDoubleCombo(props: DrawingRendererProps): React.ReactNode {
  return renderElliottWave(props, ELLIOTT_LABELS["elliott-double-combo"], "#00BCD4");
}

// ─── Elliott Triple Combo Wave (WXYXZ) ────────────────────────────
export function renderElliottTripleCombo(props: DrawingRendererProps): React.ReactNode {
  return renderElliottWave(props, ELLIOTT_LABELS["elliott-triple-combo"], "#E91E63");
}
