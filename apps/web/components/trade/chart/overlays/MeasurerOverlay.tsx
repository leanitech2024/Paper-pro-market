"use client";

import { useMemo } from "react";
import type { CandlestickData } from "lightweight-charts";
import type { Point } from "@/stores/trading/analysis.store";

type MeasurerMode = "price" | "date" | "date-price";

interface MeasurerOverlayProps {
  p1: Point;
  p2: Point;
  data: CandlestickData[];
  anchor: { x: number; y: number };
  width: number;
  height: number;
  mode: MeasurerMode;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const formatVol = (v: number): string => {
  if (v >= 1e9) return `${(v / 1e9).toFixed(3)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(3)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return String(Math.round(v));
};

export function MeasurerOverlay({
  p1,
  p2,
  data,
  anchor,
  width,
  height,
  mode,
}: MeasurerOverlayProps) {
  const stats = useMemo(() => {
    const t1 = Math.min(p1.time, p2.time);
    const t2 = Math.max(p1.time, p2.time);
    const priceDiff = p2.price - p1.price;
    const pctChange = p1.price !== 0 ? (priceDiff / p1.price) * 100 : 0;

    let bars = 0;
    let volumeSum = 0;
    if (mode !== "price") {
      for (const candle of data) {
        const t = Number(candle.time);
        if (t < t1 || t > t2) continue;
        bars += 1;
        volumeSum += Number((candle as any).volume) || 0;
      }
    }
    const dayCount = mode === "price" ? 0 : Math.round((t2 - t1) / 86400);

    return { priceDiff, pctChange, bars, dayCount, volumeSum };
  }, [p1, p2, data, mode]);

  const lines: Array<{ text: string; tone: "strong" | "muted"; color?: string }> = [];
  const priceColor = stats.priceDiff >= 0 ? "#22C55E" : "#F43F5E";

  if (mode !== "date") {
    lines.push({
      text: `${stats.priceDiff >= 0 ? "+" : ""}${stats.priceDiff.toFixed(2)} (${stats.pctChange.toFixed(2)}%)`,
      tone: "strong",
      color: priceColor,
    });
  }
  if (mode !== "price") {
    lines.push({
      text: `${stats.bars} bars, ${stats.dayCount}d`,
      tone: "muted",
    });
  }
  if (mode === "date-price") {
    lines.push({
      text: `vol ${formatVol(stats.volumeSum)}`,
      tone: "muted",
    });
  }

  const panelWidth = mode === "date-price" ? 190 : 160;
  const panelHeight = 12 + lines.length * 16;
  const left = clamp(anchor.x + 14, 8, Math.max(8, width - panelWidth - 8));
  const top = clamp(anchor.y - panelHeight - 10, 8, Math.max(8, height - panelHeight - 8));

  return (
    <div
      className="absolute z-50 pointer-events-none"
      style={{ left, top }}
    >
      <div className="rounded-md border border-white/10 bg-slate-950/90 px-3 py-2 shadow-xl">
        {lines.map((line, index) => (
          <div
            key={`${line.text}-${index}`}
            className={`text-[11px] font-mono ${line.tone === "strong" ? "font-semibold" : "text-slate-300"}`}
            style={line.color ? { color: line.color } : undefined}
          >
            {line.text}
          </div>
        ))}
      </div>
    </div>
  );
}
