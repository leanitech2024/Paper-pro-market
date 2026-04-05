"use client";

import React from "react";
import type { DrawingRendererProps } from "./types";
import { SEL_COLOR } from "./types";
import type { TwoPointDrawing } from "@/stores/trading/analysis.store";

const handleHitRadius = 12;
const visibleHandleRadius = 5;
const edgePadding = 8;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function formatVolume(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return `${value.toFixed(0)}`;
}

function renderRangeHandle({
  drawingId,
  handleType,
  x,
  y,
}: {
  drawingId: string;
  handleType: string;
  x: number;
  y: number;
}) {
  return (
    <g data-id={drawingId} data-handle={handleType}>
      <circle
        cx={x}
        cy={y}
        r={handleHitRadius}
        fill="transparent"
        pointerEvents="all"
        className={
          handleType === "left" || handleType === "right"
            ? "cursor-ew-resize"
            : handleType === "top" || handleType === "bottom"
            ? "cursor-ns-resize"
            : "cursor-nwse-resize"
        }
      />
      <circle
        cx={x}
        cy={y}
        r={visibleHandleRadius}
        fill={SEL_COLOR}
        stroke="#fff"
        strokeWidth={1.5}
        pointerEvents="none"
      />
    </g>
  );
}

export function renderPriceRange({
  drawing,
  pointToCoords,
  selected,
  isDraft,
}: DrawingRendererProps): React.ReactNode {
  const d = drawing as TwoPointDrawing;
  const c1 = pointToCoords(d.p1);
  const c2 = pointToCoords(d.p2);
  if (!c1 || !c2) return null;

  const priceDiff = d.p2.price - d.p1.price;
  const pctChange = d.p1.price !== 0 ? ((priceDiff / d.p1.price) * 100).toFixed(2) : "0.00";
  const color = priceDiff >= 0 ? "#089981" : "#F23645";
  const midY = (c1.y + c2.y) / 2;
  const topCoord = c1.y <= c2.y ? c1 : c2;
  const bottomCoord = c1.y <= c2.y ? c2 : c1;

  return (
    <g data-id={d.id}>
      <line
        x1={topCoord.x}
        y1={topCoord.y}
        x2={bottomCoord.x}
        y2={bottomCoord.y}
        stroke="transparent"
        strokeWidth={18}
        pointerEvents="all"
        className="cursor-grab"
        data-drag-role="body"
      />
      <line
        x1={topCoord.x}
        y1={topCoord.y}
        x2={bottomCoord.x}
        y2={bottomCoord.y}
        stroke={color}
        strokeWidth={2}
        pointerEvents="all"
        className="cursor-grab"
        data-drag-role="body"
      />
      <line x1={topCoord.x - 6} y1={topCoord.y} x2={topCoord.x + 6} y2={topCoord.y} stroke={color} strokeWidth={2} pointerEvents="none" />
      <line x1={bottomCoord.x - 6} y1={bottomCoord.y} x2={bottomCoord.x + 6} y2={bottomCoord.y} stroke={color} strokeWidth={2} pointerEvents="none" />
      {!isDraft && (
        <>
          <rect x={topCoord.x + 10} y={midY - 14} width={148} height={26} rx={6} fill="rgba(15,23,42,0.92)" pointerEvents="none" />
          <text
            x={topCoord.x + 84}
            y={midY + 3}
            textAnchor="middle"
            fill={color}
            fontSize={11}
            fontWeight={600}
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            pointerEvents="none"
          >
            {`${priceDiff >= 0 ? "+" : ""}${priceDiff.toFixed(2)} (${pctChange}%)`}
          </text>
        </>
      )}

      {selected && (
        <g>
          {renderRangeHandle({ drawingId: d.id, handleType: "top", x: topCoord.x, y: topCoord.y })}
          {renderRangeHandle({ drawingId: d.id, handleType: "bottom", x: bottomCoord.x, y: bottomCoord.y })}
        </g>
      )}
    </g>
  );
}

export function renderDateRange({
  drawing,
  pointToCoords,
  data,
  height,
  selected,
  isDraft,
}: DrawingRendererProps): React.ReactNode {
  const d = drawing as TwoPointDrawing;
  const c1 = pointToCoords(d.p1);
  const c2 = pointToCoords(d.p2);
  if (!c1 || !c2) return null;

  const leftX = Math.min(c1.x, c2.x);
  const rightX = Math.max(c1.x, c2.x);
  const centerX = (leftX + rightX) / 2;
  const color = selected ? SEL_COLOR : "#64748B";
  const t1 = Math.min(d.p1.time, d.p2.time);
  const t2 = Math.max(d.p1.time, d.p2.time);
  const barsInRange = data.filter((candle) => Number(candle.time) >= t1 && Number(candle.time) <= t2).length;
  const dayCount = Math.max(1, Math.round((t2 - t1) / 86400));
  const statsX = clamp(centerX - 68, edgePadding, Number.MAX_SAFE_INTEGER);
  const statsY = Math.max(edgePadding, height - 34);
  const bandY = isDraft ? Math.max(edgePadding, height - 52) : 0;
  const bandHeight = isDraft ? 36 : height;

  return (
    <g data-id={d.id}>
      <rect
        x={leftX}
        y={bandY}
        width={Math.max(10, rightX - leftX)}
        height={bandHeight}
        fill={selected ? "rgba(245,158,11,0.08)" : "rgba(100,116,139,0.08)"}
        stroke="none"
        data-id={d.id}
        data-drag-role="body"
        pointerEvents="all"
        className="cursor-grab"
      />
      <line x1={leftX} y1={bandY} x2={leftX} y2={bandY + bandHeight} stroke={color} strokeWidth={1.2} strokeDasharray="5 4" pointerEvents="none" />
      <line x1={rightX} y1={bandY} x2={rightX} y2={bandY + bandHeight} stroke={color} strokeWidth={1.2} strokeDasharray="5 4" pointerEvents="none" />

      {!isDraft && (
        <>
          <rect x={statsX} y={statsY} width={136} height={24} rx={6} fill="rgba(15,23,42,0.92)" pointerEvents="none" />
          <text
            x={statsX + 68}
            y={statsY + 15}
            textAnchor="middle"
            fill="#CBD5E1"
            fontSize={10}
            fontWeight={600}
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            pointerEvents="none"
          >
            {`${barsInRange} bars | ${dayCount}d`}
          </text>
        </>
      )}

      {selected && (
        <g>
          {renderRangeHandle({ drawingId: d.id, handleType: "left", x: leftX, y: height / 2 })}
          {renderRangeHandle({ drawingId: d.id, handleType: "right", x: rightX, y: height / 2 })}
        </g>
      )}
    </g>
  );
}

export function renderDatePriceRange({
  drawing,
  pointToCoords,
  data,
  width,
  height,
  selected,
  isDraft,
}: DrawingRendererProps): React.ReactNode {
  const d = drawing as TwoPointDrawing;
  const c1 = pointToCoords(d.p1);
  const c2 = pointToCoords(d.p2);
  if (!c1 || !c2) return null;

  const leftX = Math.min(c1.x, c2.x);
  const rightX = Math.max(c1.x, c2.x);
  const topY = Math.min(c1.y, c2.y);
  const bottomY = Math.max(c1.y, c2.y);
  const priceDiff = d.p2.price - d.p1.price;
  const pctChange = d.p1.price !== 0 ? ((priceDiff / d.p1.price) * 100).toFixed(2) : "0.00";
  const t1 = Math.min(d.p1.time, d.p2.time);
  const t2 = Math.max(d.p1.time, d.p2.time);
  const barsInRange = data.filter((candle) => Number(candle.time) >= t1 && Number(candle.time) <= t2).length;
  const dayCount = Math.max(1, Math.round((t2 - t1) / 86400));
  const volume = data
    .filter((candle) => Number(candle.time) >= t1 && Number(candle.time) <= t2)
    .reduce((sum, candle) => sum + (Number((candle as any).volume) || 0), 0);
  const color = priceDiff >= 0 ? "#089981" : "#F23645";
  const statsX = clamp(rightX + 8, edgePadding, width - 176);
  const statsY = clamp(topY, edgePadding, height - 52);

  return (
    <g data-id={d.id}>
      <rect
        x={leftX}
        y={topY}
        width={Math.max(10, rightX - leftX)}
        height={Math.max(10, bottomY - topY)}
        fill={priceDiff >= 0 ? "rgba(8,153,129,0.10)" : "rgba(242,54,69,0.10)"}
        stroke={selected ? SEL_COLOR : color}
        strokeWidth={selected ? 1.8 : 1.2}
        strokeDasharray="5 4"
        data-id={d.id}
        data-drag-role="body"
        pointerEvents="all"
        className="cursor-grab"
      />

      {!isDraft && (
        <>
          <rect x={statsX} y={statsY} width={168} height={50} rx={8} fill="rgba(15,23,42,0.94)" pointerEvents="none" />
          <text
            x={statsX + 10}
            y={statsY + 15}
            fill={color}
            fontSize={11}
            fontWeight={700}
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            pointerEvents="none"
          >
            {`${priceDiff >= 0 ? "+" : ""}${priceDiff.toFixed(2)} (${pctChange}%)`}
          </text>
          <text
            x={statsX + 10}
            y={statsY + 30}
            fill="#CBD5E1"
            fontSize={10}
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            pointerEvents="none"
          >
            {`${barsInRange} bars | ${dayCount}d`}
          </text>
          <text
            x={statsX + 10}
            y={statsY + 43}
            fill="#94A3B8"
            fontSize={9}
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            pointerEvents="none"
          >
            {`Vol ${formatVolume(volume)}`}
          </text>
        </>
      )}

      {selected && (
        <g>
          {renderRangeHandle({ drawingId: d.id, handleType: "p1", x: c1.x, y: c1.y })}
          {renderRangeHandle({ drawingId: d.id, handleType: "p2", x: c2.x, y: c2.y })}
        </g>
      )}
    </g>
  );
}
