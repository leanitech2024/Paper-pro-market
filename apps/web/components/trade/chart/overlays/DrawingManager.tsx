"use client";
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { IChartApi, ISeriesApi, CandlestickData } from 'lightweight-charts';
import { useAnalysisStore } from '@/stores/trading/analysis.store';

import { useChartCoordinates } from './useChartCoordinates';
import { useDrawingInteraction } from './useDrawingInteraction';
import { useDrawingRenderer } from './DrawingRenderer';
import { ChartInteractionLayer } from './ChartInteractionLayer';
import { DrawingPreviewLayer } from './DrawingPreviewLayer';
import { TextPopover } from './TextPopover';
import { MeasurerOverlay } from './MeasurerOverlay';

interface DrawingManagerProps {
  chart: IChartApi;
  mainSeries: ISeriesApi<'Candlestick'>;
  width: number;
  height: number;
  data: CandlestickData[];
  symbol: string;
}

export function DrawingManager({ chart, mainSeries, width, height, data, symbol }: DrawingManagerProps) {
  const { activeTool, selectedDrawingIds, globalHideState, hotkeysEnabled, deleteSelectedDrawings } = useAnalysisStore();
  
  const symbolDrawings = useAnalysisStore((s) => s.symbolState[symbol]?.drawings);
  const drawings = symbolDrawings || [];

  const [_, setForceRender] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const textPopoverRef = useRef<HTMLDivElement>(null);

  const { pointToCoords, coordsToPoint } = useChartCoordinates(chart, mainSeries, data);
  
  const { localInteraction, setLocalInteraction, handleMouseDown, handleMouseMove, handleMouseUp, textDialog } = 
    useDrawingInteraction({ symbol, drawings, coordsToPoint, svgRef });
    
  const { renderDrawing } = useDrawingRenderer({ width, height, mainSeries, data, pointToCoords, coordsToPoint });

  useEffect(() => {
    if (!textDialog.isOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (textPopoverRef.current?.contains(target)) return;
      if (svgRef.current?.contains(target)) return;
      textDialog.close();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        textDialog.close();
      }
    };
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [textDialog]);

  useEffect(() => {
    if (!chart) return;
    const handleTimeChange = () => setForceRender((n) => n + 1);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        const state = useAnalysisStore.getState();
        if (state.interactionState.status === "drawing") state.cancelDrawing();
        else if (localInteraction.status !== "idle") {
          setLocalInteraction({ status: "idle", startPoint: null, currentPoint: null, activeDrawingIds: [], originalDrawings: {}, collectedPoints: [] });
        }
        else if (state.selectedDrawingId) state.setSelectedDrawing(null);
        else if (state.activeTool !== "cursor") state.setActiveTool("cursor");
        return;
      }
      if (e.defaultPrevented || !hotkeysEnabled) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        const state = useAnalysisStore.getState();
        if (state.selectedDrawingIds.length > 0) deleteSelectedDrawings(symbol);
        else if (state.selectedDrawingId) state.deleteDrawing(symbol, state.selectedDrawingId);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) useAnalysisStore.getState().redoDrawing(symbol);
        else useAnalysisStore.getState().undoDrawing(symbol);
      }
    };

    chart.timeScale().subscribeVisibleTimeRangeChange(handleTimeChange);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      chart.timeScale().unsubscribeVisibleTimeRangeChange(handleTimeChange);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [chart, symbol, deleteSelectedDrawings, localInteraction.status, setLocalInteraction, hotkeysEnabled]);

  const isMeasurerTool = activeTool === "price-range" || activeTool === "date-range" || activeTool === "date-price-range";
  const measurerMode = activeTool === "price-range" ? "price" : activeTool === "date-range" ? "date" : activeTool === "date-price-range" ? "date-price" : null;
  const measurerAnchor = localInteraction.status !== "idle" && localInteraction.currentPoint ? pointToCoords(localInteraction.currentPoint) : null;

  return (
    <>
      <ChartInteractionLayer
        width={width}
        height={height}
        svgRef={svgRef}
        onMouseDown={(e: React.MouseEvent) => {
          const isTargetInPopover = textPopoverRef.current?.contains(e.target as Node) ?? false;
          handleMouseDown(e, isTargetInPopover);
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Committed drawings */}
        {drawings.map((d) => {
          if (!d.visible) return null;
          const isPosition = d.type === "long-position" || d.type === "short-position";
          if (globalHideState.drawings && !isPosition) return null;
          if (globalHideState.positions && isPosition) return null;
          const isSelected = selectedDrawingIds.includes(d.id);
          return <g key={d.id}>{renderDrawing(d, isSelected)}</g>;
        })}

        {/* Draft drawings overlay */}
        <DrawingPreviewLayer
          localInteraction={localInteraction}
          activeTool={activeTool}
          pointToCoords={pointToCoords}
          renderDrawing={renderDrawing}
        />
      </ChartInteractionLayer>

      <TextPopover
        dialogState={textDialog}
        symbol={symbol}
        pointToCoords={pointToCoords}
        width={width}
        height={height}
        popoverRef={textPopoverRef}
      />

      {isMeasurerTool && measurerMode && localInteraction.status === "drawing" && 
       localInteraction.startPoint && localInteraction.currentPoint && measurerAnchor && (
        <MeasurerOverlay
          p1={localInteraction.startPoint}
          p2={localInteraction.currentPoint}
          data={data}
          anchor={measurerAnchor}
          width={width}
          height={height}
          mode={measurerMode}
        />
      )}
    </>
  );
}
