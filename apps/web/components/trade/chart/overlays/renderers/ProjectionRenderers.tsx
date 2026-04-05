"use client";

import React from "react";
import type { DrawingRendererProps } from "./types";
import { SEL_COLOR, GREEN_COLOR, RED_COLOR } from "./types";
import type { PositionDrawing, TwoPointDrawing } from "@/stores/trading/analysis.store";

const plotPadding = 8;
const labelHeight = 22;
const handleRadius = 5;
const handleHitRadius = 12;
const chipWidth = 164;
const dateChipWidth = 108;

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "2-digit",
  timeZone: "Asia/Kolkata",
});

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function formatCurrency(value: number) {
  return `Rs ${value.toFixed(2)}`;
}

function formatPercent(value: number) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}%`;
}

function formatDateLabel(time: number) {
  return dateFormatter.format(new Date(time * 1000));
}

function renderCircleHandle({
  drawingId,
  handleType,
  cx,
  cy,
  fill,
  cursor,
}: {
  drawingId: string;
  handleType: string;
  cx: number;
  cy: number;
  fill: string;
  cursor: string;
}) {
  return (
    <g data-id={drawingId} data-handle={handleType}>
      <circle
        cx={cx}
        cy={cy}
        r={handleHitRadius}
        fill="transparent"
        pointerEvents="all"
        className={cursor}
      />
      <circle
        cx={cx}
        cy={cy}
        r={handleRadius}
        fill={fill}
        stroke="#fff"
        strokeWidth={1.5}
        opacity={0.92}
        pointerEvents="none"
      />
    </g>
  );
}

function renderTimeHandle({
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
      <rect
        x={x - 12}
        y={y - 18}
        width={24}
        height={36}
        rx={8}
        fill="transparent"
        pointerEvents="all"
        className="cursor-ew-resize"
      />
      <rect
        x={x - 3}
        y={y - 12}
        width={6}
        height={24}
        rx={3}
        fill="rgba(255,255,255,0.72)"
        pointerEvents="none"
      />
    </g>
  );
}

function renderChip({
  x,
  y,
  width,
  fill,
  text,
  textFill,
  align = "middle",
  drawingId,
  handleType,
  dragRole,
  cursorClass,
  pointerEvents = "none",
}: {
  x: number;
  y: number;
  width: number;
  fill: string;
  text: string;
  textFill: string;
  align?: "middle" | "start";
  drawingId?: string;
  handleType?: string;
  dragRole?: "body";
  cursorClass?: string;
  pointerEvents?: "none" | "all";
}) {
  return (
    <>
      <rect
        x={x}
        y={y}
        width={width}
        height={labelHeight}
        rx={6}
        fill={fill}
        pointerEvents={pointerEvents}
        data-id={drawingId}
        data-handle={handleType}
        data-drag-role={dragRole}
        className={cursorClass}
      />
      <text
        x={align === "middle" ? x + width / 2 : x + 10}
        y={y + 14}
        textAnchor={align}
        fill={textFill}
        fontSize={10}
        fontWeight={600}
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        pointerEvents="none"
      >
        {text}
      </text>
    </>
  );
}

function getBarCount(data: DrawingRendererProps["data"], fromTime: number, toTime: number) {
  const minTime = Math.min(fromTime, toTime);
  const maxTime = Math.max(fromTime, toTime);
  return data.filter((candle) => Number(candle.time) >= minTime && Number(candle.time) <= maxTime).length;
}

function renderPosition({
  drawing,
  pointToCoords,
  width,
  height,
  selected,
  data,
}: DrawingRendererProps) {
  const d = drawing as PositionDrawing;
  const start = pointToCoords({ time: d.entryTime, price: d.entryPrice });
  const end = pointToCoords({ time: d.endTime, price: d.entryPrice });
  const target = pointToCoords({ time: d.endTime, price: d.targetPrice });
  const stop = pointToCoords({ time: d.endTime, price: d.stopPrice });
  const entry = pointToCoords({ time: d.endTime, price: d.entryPrice });

  if (!start || !end || !target || !stop || !entry) return null;

  const plotWidth = width - 60;
  const plotHeight = Math.max(0, height - 26);
  const leftX = clamp(Math.min(start.x, end.x), 0, plotWidth);
  const rightX = clamp(Math.max(start.x, end.x), 0, plotWidth);
  const topY = clamp(Math.min(target.y, stop.y), 0, plotHeight);
  const bottomY = clamp(Math.max(target.y, stop.y), 0, plotHeight);
  const entryY = clamp(entry.y, 0, plotHeight);
  const targetY = clamp(target.y, 0, plotHeight);
  const stopY = clamp(stop.y, 0, plotHeight);
  const boxWidth = Math.max(12, rightX - leftX);
  const centerX = leftX + boxWidth / 2;
  const middleY = (topY + bottomY) / 2;
  const bars = getBarCount(data, d.entryTime, d.endTime);

  const isLong = d.type === "long-position";
  const reward = Math.abs(d.targetPrice - d.entryPrice);
  const risk = Math.abs(d.entryPrice - d.stopPrice);
  const rr = risk > 0 ? (reward / risk).toFixed(2) : "inf";
  const targetPct = ((d.targetPrice - d.entryPrice) / d.entryPrice) * 100;
  const stopPct = ((d.stopPrice - d.entryPrice) / d.entryPrice) * 100;

  const sideLabelX = clamp(centerX - chipWidth / 2, plotPadding, plotWidth - chipWidth - plotPadding);
  const entryLabelX = clamp(centerX - chipWidth / 2, plotPadding, plotWidth - chipWidth - plotPadding);
  const statsX = clamp(centerX - 110, plotPadding, plotWidth - 220 - plotPadding);
  const statsY = clamp(middleY - 18, plotPadding, plotHeight - 42);
  const dateGap = 8;
  const totalDateWidth = dateChipWidth * 2 + dateGap;
  const startChipX = clamp(centerX - totalDateWidth / 2, plotPadding, plotWidth - totalDateWidth - plotPadding);
  const endChipX = startChipX + dateChipWidth + dateGap;
  const chipY = clamp(Math.max(bottomY + 10, statsY + 44), plotPadding, plotHeight - 24);
  const labelBottomLimit = chipY - labelHeight - 10;
  const topTargetY = isLong
    ? clamp(targetY - 26, plotPadding, plotHeight - labelHeight)
    : clamp(targetY + 6, plotPadding, labelBottomLimit);
  const topStopY = isLong
    ? clamp(stopY + 6, plotPadding, labelBottomLimit)
    : clamp(stopY - 26, plotPadding, plotHeight - labelHeight);

  return (
    <g data-id={d.id} clipPath="url(#chart-clip)">
      <rect
        x={leftX}
        y={topY}
        width={boxWidth}
        height={bottomY - topY}
        fill="transparent"
        data-id={d.id}
        data-drag-role="body"
        pointerEvents="all"
        className="cursor-grab"
      />

      <rect
        x={leftX}
        y={Math.min(entryY, targetY)}
        width={boxWidth}
        height={Math.abs(targetY - entryY)}
        fill="rgba(8,153,129,0.18)"
        stroke="none"
        data-id={d.id}
        data-drag-role="body"
        pointerEvents="all"
        className="cursor-grab"
      />
      <rect
        x={leftX}
        y={Math.min(entryY, stopY)}
        width={boxWidth}
        height={Math.abs(stopY - entryY)}
        fill="rgba(242,54,69,0.18)"
        stroke="none"
        data-id={d.id}
        data-drag-role="body"
        pointerEvents="all"
        className="cursor-grab"
      />

      <rect
        x={leftX}
        y={topY}
        width={boxWidth}
        height={bottomY - topY}
        fill="none"
        stroke={selected ? SEL_COLOR : "rgba(255,255,255,0.18)"}
        strokeWidth={selected ? 1.6 : 1}
        strokeDasharray="5 4"
        pointerEvents="none"
      />

      <line x1={leftX} y1={targetY} x2={rightX} y2={targetY} stroke={GREEN_COLOR} strokeWidth={2.2} pointerEvents="none" />
      <line
        x1={leftX}
        y1={entryY}
        x2={rightX}
        y2={entryY}
        stroke={selected ? SEL_COLOR : "#A8B0C4"}
        strokeWidth={2}
        strokeDasharray="6 4"
        pointerEvents="none"
      />
      <line x1={leftX} y1={stopY} x2={rightX} y2={stopY} stroke={RED_COLOR} strokeWidth={2.2} pointerEvents="none" />

      <line x1={leftX} y1={topY} x2={leftX} y2={bottomY} stroke="rgba(255,255,255,0.22)" strokeWidth={1} pointerEvents="none" />
      <line x1={rightX} y1={topY} x2={rightX} y2={bottomY} stroke="rgba(255,255,255,0.22)" strokeWidth={1} pointerEvents="none" />

      {renderChip({
        x: sideLabelX,
        y: topTargetY,
        width: chipWidth,
        fill: "rgba(8,153,129,0.94)",
        text: `Target ${formatCurrency(d.targetPrice)} ${formatPercent(targetPct)}`,
        textFill: "#fff",
        drawingId: d.id,
        handleType: selected ? "target" : undefined,
        cursorClass: selected ? "cursor-ns-resize" : undefined,
        pointerEvents: selected ? "all" : "none",
      })}
      {renderChip({
        x: entryLabelX,
        y: clamp(entryY - 26, plotPadding, plotHeight - labelHeight),
        width: chipWidth,
        fill: "rgba(15,23,42,0.92)",
        text: `Entry ${formatCurrency(d.entryPrice)}`,
        textFill: "#E2E8F0",
        align: "start",
        drawingId: d.id,
        handleType: selected ? "entry" : undefined,
        cursorClass: selected ? "cursor-ns-resize" : undefined,
        pointerEvents: selected ? "all" : "none",
      })}
      {renderChip({
        x: sideLabelX,
        y: topStopY,
        width: chipWidth,
        fill: "rgba(242,54,69,0.94)",
        text: `Stop ${formatCurrency(d.stopPrice)} ${formatPercent(stopPct)}`,
        textFill: "#fff",
        drawingId: d.id,
        handleType: selected ? "stop" : undefined,
        cursorClass: selected ? "cursor-ns-resize" : undefined,
        pointerEvents: selected ? "all" : "none",
      })}

      <rect
        x={statsX}
        y={statsY}
        width={220}
        height={36}
        rx={8}
        fill="rgba(15,23,42,0.92)"
        pointerEvents="all"
        data-id={d.id}
        data-drag-role="body"
        className="cursor-grab"
      />
      <text
        x={statsX + 110}
        y={statsY + 15}
        textAnchor="middle"
        fill="#E2E8F0"
        fontSize={10}
        fontWeight={600}
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        pointerEvents="none"
      >
        {`Reward ${reward.toFixed(2)} | Risk ${risk.toFixed(2)} | RR 1:${rr}`}
      </text>
      <text
        x={statsX + 110}
        y={statsY + 28}
        textAnchor="middle"
        fill="#94A3B8"
        fontSize={9}
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        pointerEvents="none"
      >
        {`${bars} bars${d.quantity ? ` | Qty ${d.quantity}` : ""}`}
      </text>

      {renderChip({
        x: startChipX,
        y: chipY,
        width: dateChipWidth,
        fill: "rgba(37,99,235,0.92)",
        text: formatDateLabel(d.entryTime),
        textFill: "#EFF6FF",
        drawingId: d.id,
        handleType: selected ? "start-time" : undefined,
        cursorClass: selected ? "cursor-ew-resize" : undefined,
        pointerEvents: selected ? "all" : "none",
      })}
      {renderChip({
        x: endChipX,
        y: chipY,
        width: dateChipWidth,
        fill: "rgba(37,99,235,0.92)",
        text: formatDateLabel(d.endTime),
        textFill: "#EFF6FF",
        drawingId: d.id,
        handleType: selected ? "end-time" : undefined,
        cursorClass: selected ? "cursor-ew-resize" : undefined,
        pointerEvents: selected ? "all" : "none",
      })}

      {selected && (
        <g>
          {renderCircleHandle({ drawingId: d.id, handleType: "target", cx: rightX, cy: targetY, fill: GREEN_COLOR, cursor: "cursor-ns-resize" })}
          {renderCircleHandle({ drawingId: d.id, handleType: "entry", cx: rightX, cy: entryY, fill: SEL_COLOR, cursor: "cursor-ns-resize" })}
          {renderCircleHandle({ drawingId: d.id, handleType: "stop", cx: rightX, cy: stopY, fill: RED_COLOR, cursor: "cursor-ns-resize" })}
          {renderTimeHandle({ drawingId: d.id, handleType: "start-time", x: leftX, y: middleY })}
          {renderTimeHandle({ drawingId: d.id, handleType: "end-time", x: rightX, y: middleY })}
        </g>
      )}
    </g>
  );
}

export function renderLongPosition(props: DrawingRendererProps): React.ReactNode {
  return renderPosition(props);
}

export function renderShortPosition(props: DrawingRendererProps): React.ReactNode {
  return renderPosition(props);
}

export function renderForecast({ drawing, pointToCoords, selected, width }: DrawingRendererProps): React.ReactNode {
  const d = drawing as TwoPointDrawing;
  const c1 = pointToCoords(d.p1);
  const c2 = pointToCoords(d.p2);
  if (!c1 || !c2) return null;

  const labelX = clamp(c2.x + 10, plotPadding, width - 142);
  const labelY = clamp(c2.y - 22, plotPadding, 99999);
  const delta = d.p2.price - d.p1.price;
  const pct = d.p1.price !== 0 ? (delta / d.p1.price) * 100 : 0;

  return (
    <g data-id={d.id}>
      <line
        x1={c1.x}
        y1={c1.y}
        x2={c2.x}
        y2={c2.y}
        stroke="transparent"
        strokeWidth={14}
        data-id={d.id}
        data-drag-role="body"
        pointerEvents="all"
        className="cursor-grab"
      />
      <line
        x1={c1.x}
        y1={c1.y}
        x2={c2.x}
        y2={c2.y}
        stroke={selected ? SEL_COLOR : "#7C3AED"}
        strokeWidth={2.5}
        strokeDasharray="8 5"
        pointerEvents="none"
      />

      <rect x={labelX} y={labelY} width={132} height={22} rx={6} fill="rgba(15,23,42,0.92)" pointerEvents="none" />
      <rect
        x={labelX}
        y={labelY}
        width={132}
        height={22}
        rx={6}
        fill="transparent"
        pointerEvents="all"
        data-id={d.id}
        data-drag-role="body"
        className="cursor-grab"
      />
      <text
        x={labelX + 66}
        y={labelY + 14}
        textAnchor="middle"
        fill={selected ? "#FDE68A" : "#DDD6FE"}
        fontSize={10}
        fontWeight={600}
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        pointerEvents="none"
      >
        {`${formatCurrency(d.p2.price)} ${formatPercent(pct)}`}
      </text>

      {selected && (
        <g>
          {renderCircleHandle({ drawingId: d.id, handleType: "p1", cx: c1.x, cy: c1.y, fill: "#7C3AED", cursor: "cursor-nwse-resize" })}
          {renderCircleHandle({ drawingId: d.id, handleType: "p2", cx: c2.x, cy: c2.y, fill: "#7C3AED", cursor: "cursor-nwse-resize" })}
        </g>
      )}
    </g>
  );
}

export function renderBarsPattern({ drawing, pointToCoords, selected }: DrawingRendererProps): React.ReactNode {
  const d = drawing as TwoPointDrawing;
  const c1 = pointToCoords(d.p1);
  const c2 = pointToCoords(d.p2);
  if (!c1 || !c2) return null;

  return (
    <g data-id={d.id}>
      <rect
        x={Math.min(c1.x, c2.x)}
        y={Math.min(c1.y, c2.y)}
        width={Math.abs(c2.x - c1.x)}
        height={Math.abs(c2.y - c1.y)}
        fill={selected ? "rgba(245,158,11,0.1)" : "rgba(156,39,176,0.08)"}
        stroke={selected ? SEL_COLOR : "#9C27B0"}
        strokeWidth={1}
        strokeDasharray="6 3"
        pointerEvents="all"
        className="cursor-grab"
        data-drag-role="body"
      />
      <text
        x={(c1.x + c2.x) / 2}
        y={(c1.y + c2.y) / 2}
        textAnchor="middle"
        fill={selected ? SEL_COLOR : "#9C27B0"}
        fontSize={10}
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        opacity={0.7}
        pointerEvents="none"
      >
        Pattern
      </text>
    </g>
  );
}

export function renderGhostFeed(props: DrawingRendererProps): React.ReactNode {
  return renderBarsPattern(props);
}
