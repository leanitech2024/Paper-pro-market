"use client";
import React from "react";
import type { DrawingRendererProps, PointCoords } from "./types";
import { SEL_COLOR, DRAW_COLOR, PATTERN_LABELS } from "./types";
import type { MultiPointDrawing } from "@/stores/trading/analysis.store";

/** Shared renderer for labelled multi-point patterns (connected lines + labels at each point) */
function renderLabelledPattern(
  props: DrawingRendererProps,
  defaultLabels: string[],
  closePath = false,
): React.ReactNode {
  const d = props.drawing as MultiPointDrawing;
  const coords = d.points.map(props.pointToCoords).filter((c): c is PointCoords => Boolean(c));
  if (coords.length < 2) return null;

  const { selected } = props;
  const color = selected ? SEL_COLOR : DRAW_COLOR;
  const labels = d.labels ?? defaultLabels;

  const pathData = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ") + (closePath ? " Z" : "");

  return (
    <g data-id={d.id}>
      <path d={pathData} fill={closePath ? (selected ? "rgba(245,158,11,0.08)" : "rgba(41,98,255,0.06)") : "none"}
        stroke={color} strokeWidth={selected ? 3 : 2}
        pointerEvents="all" className="cursor-pointer hover:stroke-orange-400 transition-colors" />
      {/* Labels at each point */}
      {coords.map((c, i) => {
        const label = labels[i];
        if (!label) return null;
        return (
          <g key={`lbl-${i}`}>
            <circle cx={c.x} cy={c.y} r={12} fill="rgba(0,0,0,0.85)" stroke={color} strokeWidth={1.5} pointerEvents="none" />
            <text x={c.x} y={c.y + 4} textAnchor="middle" fill="#fff"
              fontSize={10} fontWeight="bold" fontFamily="Inter, sans-serif" pointerEvents="none">
              {label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

// ─── XABCD Pattern ────────────────────────────────────────────────
export function renderXabcdPattern(props: DrawingRendererProps): React.ReactNode {
  return renderLabelledPattern(props, PATTERN_LABELS["xabcd-pattern"]);
}

// ─── Cypher Pattern ───────────────────────────────────────────────
export function renderCypherPattern(props: DrawingRendererProps): React.ReactNode {
  return renderLabelledPattern(props, PATTERN_LABELS["cypher-pattern"]);
}

// ─── Head and Shoulders ───────────────────────────────────────────
export function renderHeadShoulders(props: DrawingRendererProps): React.ReactNode {
  return renderLabelledPattern(props, PATTERN_LABELS["head-shoulders"]);
}

// ─── ABCD Pattern ─────────────────────────────────────────────────
export function renderAbcdPattern(props: DrawingRendererProps): React.ReactNode {
  return renderLabelledPattern(props, PATTERN_LABELS["abcd-pattern"]);
}

// ─── Triangle Pattern ─────────────────────────────────────────────
export function renderTrianglePattern(props: DrawingRendererProps): React.ReactNode {
  return renderLabelledPattern(props, PATTERN_LABELS["triangle-pattern"], true);
}

// ─── Three Drives Pattern ─────────────────────────────────────────
export function renderThreeDrivesPattern(props: DrawingRendererProps): React.ReactNode {
  return renderLabelledPattern(props, PATTERN_LABELS["three-drives-pattern"]);
}
