import React, { ReactNode, useEffect, useState } from "react";
import { useAnalysisStore } from "@/domains/chart/stores/analysis.store";
import { isDrawingTool } from "./drawingConstants";

interface ChartInteractionLayerProps {
  width: number;
  height: number;
  svgRef: React.RefObject<SVGSVGElement | null>;
  onPointerDown: (e: React.PointerEvent<SVGSVGElement>) => void;
  onPointerMove: (e: React.PointerEvent<SVGSVGElement>) => void;
  onPointerLeave?: () => void;
  onPointerUp: (e: React.PointerEvent<SVGSVGElement>) => void;
  cursor?: string;
  children: ReactNode;
}

export function ChartInteractionLayer({
  width,
  height,
  svgRef,
  onPointerDown,
  onPointerMove,
  onPointerLeave,
  onPointerUp,
  cursor,
  children,
}: ChartInteractionLayerProps) {
  const { activeTool } = useAnalysisStore();
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);
  const isEditTool = activeTool === "select" || activeTool === "cursor" || activeTool === "crosshair";
  const isActive = isDrawingTool(activeTool) || isEditTool || activeTool === "eraser";
  const allowPanThrough = isCoarsePointer && (isEditTool || activeTool === "eraser");
  const captureSurface = isActive && !allowPanThrough;

  // --- pointer-events strategy ---
  //
  // cursor mode: SVG gets pointer-events:none.
  //   - Empty-space clicks/drags pass through the transparent SVG directly to
  //     the LightweightCharts canvas so native chart panning works.
  //   - Child drawing elements (paths/shapes with visible fill or stroke) can
  //     STILL be the target of pointer events because the W3C spec guarantees:
  //     "pointer events may target descendant elements if those descendants
  //     have pointer-events set to a value that allows it" (visiblePainted is
  //     the SVG default for painted shapes). Those events then bubble up through
  //     the SVG to its React handlers for drawing selection / drag.
  //
  // select / drawing / eraser: SVG gets pointer-events:auto + full capture rect.
  //   - The capture rect with pointer-events:all intercepts the entire surface
  //     so box-select and free-draw work on every pixel of the chart.
  //
  // mobile (coarse pointer) in edit/eraser mode: allowPanThrough=true →
  //   captureSurface=false → pointer-events:none → native pan survives.

  const svgPointerEvents: "none" | "auto" =
    activeTool === "cursor" ? "none" : captureSurface ? "auto" : "none";

  // Full capture rect is only needed when we must intercept ALL clicks on the
  // chart surface (select box, drawing placement). Never in cursor mode.
  const needsFullCaptureRect = captureSurface && activeTool !== "cursor";

  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia("(pointer: coarse)");
    const update = () => {
      setIsCoarsePointer(media.matches || window.navigator.maxTouchPoints > 0);
    };

    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  // Forward wheel events to the LightweightCharts container so zoom works
  // even when the SVG capture rect is active (select / drawing tool modes).
  //
  // DOM hierarchy:
  //   div.chartContainerRef          ← LightweightCharts listens here
  //     canvas / LC internals
  //     div.absolute.z-50.ptr-none   ← svg.parentElement  (wrapper)
  //       svg                        ← svg itself
  //
  // The wheel event must be dispatched on the chartContainerRef (grandparent),
  // NOT on the wrapper div (parent), which has pointer-events:none and no LC
  // listeners. We use bubbles:false to avoid an infinite loop.
  //
  // In cursor mode this handler is registered but fires only if the mouse is
  // over a child drawing element. Empty-space wheel events bypass the SVG
  // entirely (pointer-events:none) and reach the canvas directly — no
  // forwarding needed for that case. So there is no double-dispatch risk.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const onWheel = (e: WheelEvent) => {
      // Grandparent = chartContainerRef div where LightweightCharts is mounted.
      const chartContainer = svg.parentElement?.parentElement;
      if (!chartContainer) return;

      chartContainer.dispatchEvent(
        new WheelEvent("wheel", {
          bubbles: false,     // no re-capture loop
          cancelable: true,
          deltaX: e.deltaX,
          deltaY: e.deltaY,
          deltaZ: e.deltaZ,
          deltaMode: e.deltaMode,
          clientX: e.clientX,
          clientY: e.clientY,
          ctrlKey: e.ctrlKey,
          shiftKey: e.shiftKey,
          altKey: e.altKey,
          metaKey: e.metaKey,
        }),
      );
    };

    svg.addEventListener("wheel", onWheel, { passive: true });
    return () => svg.removeEventListener("wheel", onWheel);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svgRef]);

  return (
    <div className="absolute inset-0 z-50 pointer-events-none">
      <svg
        ref={svgRef as any}
        width={width}
        height={height}
        className="absolute inset-0"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          pointerEvents: svgPointerEvents,
          // Suppress native browser pan/pinch only during active drawing placement.
          // In cursor/select/crosshair mode the chart handles its own touch gestures.
          touchAction: isDrawingTool(activeTool) ? "none" : "auto",
          cursor:
            cursor ??
            (isDrawingTool(activeTool)
              ? "crosshair"
              : activeTool === "eraser"
              ? "not-allowed"
              : activeTool === "crosshair"
              ? "crosshair"
              : isEditTool
              ? "default"
              : "auto"),
        }}
      >
        {needsFullCaptureRect ? (
          <rect
            x={0}
            y={0}
            width={width}
            height={height}
            fill="transparent"
            pointerEvents="all"
            data-interaction-surface="true"
          />
        ) : null}
        <defs>
          <clipPath id="chart-clip">
            <rect x={0} y={0} width={Math.max(0, width - 60)} height={Math.max(0, height - 26)} />
          </clipPath>
        </defs>
        {children}
      </svg>
    </div>
  );
}
