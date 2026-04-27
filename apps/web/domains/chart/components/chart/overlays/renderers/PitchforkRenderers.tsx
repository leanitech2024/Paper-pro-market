"use client";
import React from "react";
import type { DrawingRendererProps } from "./types";
import { SEL_COLOR, DRAW_COLOR } from "./types";
import type { ThreePointDrawing } from "@/domains/chart/stores/analysis.store";

/** Compute pitchfork median + tines from 3 points */
function pitchforkGeometry(
  c1: { x: number; y: number },
  c2: { x: number; y: number },
  c3: { x: number; y: number },
  variant: "standard" | "schiff" | "modified-schiff" | "inside",
  canvasWidth: number,
) {
  // Median anchor depends on variant
  let anchor: { x: number; y: number };
  switch (variant) {
    case "schiff":
      anchor = { x: c1.x, y: (c1.y + c2.y) / 2 };
      break;
    case "modified-schiff":
      anchor = { x: (c1.x + c2.x) / 2, y: (c1.y + c2.y) / 2 };
      break;
    case "inside":
      anchor = {
        x: (c2.x + c3.x) / 2,
        y: (c2.y + c3.y) / 2,
      };
      break;
    default: // standard
      anchor = c1;
  }

  // Midpoint of p2-p3
  const mid23 = { x: (c2.x + c3.x) / 2, y: (c2.y + c3.y) / 2 };

  // Extend median line
  const medDx = mid23.x - anchor.x;
  const medDy = mid23.y - anchor.y;
  const ext = medDx !== 0 ? (canvasWidth - anchor.x) / medDx : 30;
  const medEnd = { x: anchor.x + medDx * ext, y: anchor.y + medDy * ext };

  // Tines: lines from p2 and p3, parallel to median
  const tine2End = { x: c2.x + medDx * ext, y: c2.y + medDy * ext };
  const tine3End = { x: c3.x + medDx * ext, y: c3.y + medDy * ext };

  return { anchor, medEnd, tine2End, tine3End };
}

function renderPitchforkVariant(
  variant: "standard" | "schiff" | "modified-schiff" | "inside",
  props: DrawingRendererProps,
): React.ReactNode {
  const d = props.drawing as ThreePointDrawing;
  const c1 = props.pointToCoords(d.p1);
  const c2 = props.pointToCoords(d.p2);
  const c3 = props.pointToCoords(d.p3);
  if (!c1 || !c2 || !c3) return null;

  const { selected, width } = props;
  const color = selected ? SEL_COLOR : DRAW_COLOR;
  const { anchor, medEnd, tine2End, tine3End } = pitchforkGeometry(c1, c2, c3, variant, width);

  return (
    <g data-id={d.id}>
      {/* Fill between tines */}
      <polygon
        points={`${c2.x},${c2.y} ${tine2End.x},${tine2End.y} ${tine3End.x},${tine3End.y} ${c3.x},${c3.y}`}
        fill={selected ? "rgba(245,158,11,0.06)" : "rgba(41,98,255,0.04)"}
        pointerEvents="all" className="cursor-pointer" />
      {/* Median */}
      <line x1={anchor.x} y1={anchor.y} x2={medEnd.x} y2={medEnd.y}
        stroke={color} strokeWidth={selected ? 3 : 2} pointerEvents="all" />
      {/* Upper tine */}
      <line x1={c2.x} y1={c2.y} x2={tine2End.x} y2={tine2End.y}
        stroke={color} strokeWidth={1} strokeDasharray="4 4" pointerEvents="all" />
      {/* Lower tine */}
      <line x1={c3.x} y1={c3.y} x2={tine3End.x} y2={tine3End.y}
        stroke={color} strokeWidth={1} strokeDasharray="4 4" pointerEvents="all" />
      {/* Control points */}
      <circle cx={c1.x} cy={c1.y} r={4} fill={color} pointerEvents="none" />
      <circle cx={c2.x} cy={c2.y} r={3} fill={color} pointerEvents="none" />
      <circle cx={c3.x} cy={c3.y} r={3} fill={color} pointerEvents="none" />
    </g>
  );
}

export function renderPitchfork(props: DrawingRendererProps): React.ReactNode {
  return renderPitchforkVariant("standard", props);
}

export function renderSchiffPitchfork(props: DrawingRendererProps): React.ReactNode {
  return renderPitchforkVariant("schiff", props);
}

export function renderModifiedSchiffPitchfork(props: DrawingRendererProps): React.ReactNode {
  return renderPitchforkVariant("modified-schiff", props);
}

export function renderInsidePitchfork(props: DrawingRendererProps): React.ReactNode {
  return renderPitchforkVariant("inside", props);
}
