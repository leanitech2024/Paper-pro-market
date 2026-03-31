// components/trade/chart/overlays/DrawingManager.tsx
"use client";
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { IChartApi, ISeriesApi, Time, Coordinate, Logical, CandlestickData } from 'lightweight-charts';
import {
  useAnalysisStore,
  type Point,
  type TwoPointDrawing,
  type Drawing,
  type DrawingType,
  type ToolType,
  type SinglePointLineDrawing,
  type ThreePointDrawing,
  type MultiPointDrawing,
  type PositionDrawing,
  type BrushDrawing,
  type ArrowDrawing,
  type TextDrawing as TextDrawingType,
} from '@/stores/trading/analysis.store';


// Import all renderers
import * as LineR from './renderers/LineRenderers';
import * as ChannelR from './renderers/ChannelRenderers';
import * as PitchforkR from './renderers/PitchforkRenderers';
import * as FibR from './renderers/FibRenderers';
import * as GannR from './renderers/GannRenderers';
import * as PatternR from './renderers/PatternRenderers';
import * as ElliottR from './renderers/ElliottRenderers';
import * as ProjectionR from './renderers/ProjectionRenderers';
import * as MeasurerR from './renderers/MeasurerRenderers';
import * as ShapeR from './renderers/ShapeRenderers';
import * as AnnotationR from './renderers/AnnotationRenderers';
import * as BrushR from './renderers/BrushRenderers';
import type { DrawingRendererProps } from './renderers/types';
import { REQUIRED_POINTS, ELLIOTT_LABELS, PATTERN_LABELS } from './renderers/types';
import { MeasurerOverlay } from './MeasurerOverlay';

// ─── Renderer Dispatch Map ─────────────────────────────────────
type RenderFn = (props: DrawingRendererProps) => React.ReactNode;

const RENDERER_MAP: Record<string, RenderFn> = {
  // Lines
  trendline: LineR.renderTrendline,
  ray: LineR.renderRay,
  "extended-line": LineR.renderExtendedLine,
  "info-line": LineR.renderInfoLine,
  "trend-angle": LineR.renderTrendAngle,
  "horizontal-line": LineR.renderHorizontalLine,
  "horizontal-ray": LineR.renderHorizontalRay,
  "vertical-line": LineR.renderVerticalLine,
  "cross-line": LineR.renderCrossLine,
  // Channels
  "parallel-channel": ChannelR.renderParallelChannel,
  "regression-trend": ChannelR.renderRegressionTrend,
  "flat-top-bottom": ChannelR.renderFlatTopBottom,
  "disjoint-channel": ChannelR.renderDisjointChannel,
  // Pitchforks
  pitchfork: PitchforkR.renderPitchfork,
  "schiff-pitchfork": PitchforkR.renderSchiffPitchfork,
  "modified-schiff-pitchfork": PitchforkR.renderModifiedSchiffPitchfork,
  "inside-pitchfork": PitchforkR.renderInsidePitchfork,
  // Fibonacci
  "fib-retracement": FibR.renderFibRetracement,
  "fib-extension": FibR.renderFibExtension,
  "fib-channel": FibR.renderFibChannel,
  "fib-time-zone": FibR.renderFibTimeZone,
  "fib-speed-fan": FibR.renderFibSpeedFan,
  "fib-time-extension": FibR.renderFibTimeExtension,
  "fib-circles": FibR.renderFibCircles,
  "fib-spiral": FibR.renderFibSpiral,
  "fib-speed-arcs": FibR.renderFibSpeedArcs,
  "fib-wedge": FibR.renderFibWedge,
  pitchfan: FibR.renderPitchfan,
  // Gann
  "gann-box": GannR.renderGannBox,
  "gann-square-fixed": GannR.renderGannSquareFixed,
  "gann-square": GannR.renderGannSquare,
  "gann-fan": GannR.renderGannFan,
  // Patterns
  "xabcd-pattern": PatternR.renderXabcdPattern,
  "cypher-pattern": PatternR.renderCypherPattern,
  "head-shoulders": PatternR.renderHeadShoulders,
  "abcd-pattern": PatternR.renderAbcdPattern,
  "triangle-pattern": PatternR.renderTrianglePattern,
  "three-drives-pattern": PatternR.renderThreeDrivesPattern,
  // Elliott
  "elliott-impulse": ElliottR.renderElliottImpulse,
  "elliott-correction": ElliottR.renderElliottCorrection,
  "elliott-triangle": ElliottR.renderElliottTriangle,
  "elliott-double-combo": ElliottR.renderElliottDoubleCombo,
  "elliott-triple-combo": ElliottR.renderElliottTripleCombo,
  // Projection
  "long-position": ProjectionR.renderLongPosition,
  "short-position": ProjectionR.renderShortPosition,
  forecast: ProjectionR.renderForecast,
  "bars-pattern": ProjectionR.renderBarsPattern,
  "ghost-feed": ProjectionR.renderGhostFeed,
  // Measurer
  "price-range": MeasurerR.renderPriceRange,
  "date-range": MeasurerR.renderDateRange,
  "date-price-range": MeasurerR.renderDatePriceRange,
  // Shapes
  rectangle: ShapeR.renderRectangle,
  "rotated-rectangle": ShapeR.renderRotatedRectangle,
  circle: ShapeR.renderCircle,
  ellipse: ShapeR.renderEllipse,
  polyline: ShapeR.renderPolyline,
  path: ShapeR.renderPath,
  "triangle-shape": ShapeR.renderTriangleShape,
  curve: ShapeR.renderCurve,
  "double-curve": ShapeR.renderDoubleCurve,
  // Annotations
  text: AnnotationR.renderText,
  "anchored-text": AnnotationR.renderAnchoredText,
  note: AnnotationR.renderNote,
  "anchored-note": AnnotationR.renderAnchoredNote,
  callout: AnnotationR.renderCallout,
  comment: AnnotationR.renderComment,
  "price-label": AnnotationR.renderPriceLabel,
  signpost: AnnotationR.renderSignpost,
  "flag-mark": AnnotationR.renderFlagMark,
  "arrow-marker": AnnotationR.renderArrowMarker,
  "arrow-up": AnnotationR.renderArrowUp,
  "arrow-down": AnnotationR.renderArrowDown,
  "arrow-left": AnnotationR.renderArrowLeft,
  "arrow-right": AnnotationR.renderArrowRight,
  // Brushes / Cycles
  brush: BrushR.renderBrush,
  highlighter: BrushR.renderHighlighter,
  "cyclic-lines": BrushR.renderCyclicLines,
  "time-cycles": BrushR.renderTimeCycles,
};

// ─── Tool Category Helpers ─────────────────────────────────────
const SINGLE_CLICK_TOOLS = new Set<string>([
  "horizontal-line", "vertical-line", "cross-line", "horizontal-ray",
  "arrow-marker", "arrow-up", "arrow-down", "arrow-left", "arrow-right",
  "flag-mark", "signpost", "price-label", "comment",
]);

const TEXT_TOOLS = new Set<string>([
  "text", "anchored-text", "note", "anchored-note", "callout",
]);

const POSITION_TOOLS = new Set<string>(["long-position", "short-position"]);

const THREE_POINT_TOOLS = new Set<string>([
  "pitchfork", "schiff-pitchfork", "modified-schiff-pitchfork", "inside-pitchfork",
  "parallel-channel", "triangle-shape",
]);

const MULTI_POINT_TOOLS = new Set<string>([
  "xabcd-pattern", "cypher-pattern", "head-shoulders", "abcd-pattern",
  "triangle-pattern", "three-drives-pattern",
  "elliott-impulse", "elliott-correction", "elliott-triangle",
  "elliott-double-combo", "elliott-triple-combo",
  "polyline", "path",
]);

const FREEHAND_TOOLS = new Set<string>(["brush", "highlighter"]);

const TWO_POINT_TOOLS = new Set<string>([
  "trendline", "ray", "rectangle", "extended-line", "info-line", "trend-angle",
  "fib-retracement", "fib-extension", "fib-channel", "fib-time-zone",
  "fib-speed-fan", "fib-time-extension", "fib-circles", "fib-spiral",
  "fib-speed-arcs", "fib-wedge", "pitchfan",
  "gann-box", "gann-square-fixed", "gann-square", "gann-fan",
  "regression-trend", "flat-top-bottom", "disjoint-channel",
  "rotated-rectangle", "ellipse", "circle", "curve", "double-curve",
  "price-range", "date-range", "date-price-range",
  "cyclic-lines", "time-cycles",
  "forecast", "bars-pattern", "ghost-feed",
]);

const isDrawingTool = (tool: ToolType): boolean =>
  tool !== "cursor" && tool !== "crosshair" && tool !== "select" && tool !== "eraser";

// ─── Component ──────────────────────────────────────────────────
interface DrawingManagerProps {
  chart: IChartApi;
  mainSeries: ISeriesApi<'Candlestick'>;
  width: number;
  height: number;
  data: CandlestickData[];
  symbol: string;
}

export function DrawingManager({ chart, mainSeries, width, height, data, symbol }: DrawingManagerProps) {
  const { activeTool, addDrawing } = useAnalysisStore();
  const selectedDrawingIds = useAnalysisStore((s) => s.selectedDrawingIds);
  const setSelectedDrawings = useAnalysisStore((s) => s.setSelectedDrawings);
  const toggleDrawingSelection = useAnalysisStore((s) => s.toggleDrawingSelection);
  const deleteSelectedDrawings = useAnalysisStore((s) => s.deleteSelectedDrawings);
  const globalHideState = useAnalysisStore((s) => s.globalHideState);
  const hotkeysEnabled = useAnalysisStore((s) => s.hotkeysEnabled);
  const analysisV2Enabled = process.env.NEXT_PUBLIC_ANALYSIS_V2 === "true";

  const symbolDrawings = useAnalysisStore((s) => s.symbolState[symbol]?.drawings);
  const drawings = symbolDrawings || [];

  const [_, setForceRender] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);

  // Text tool dialog
  const [isTextDialogOpen, setIsTextDialogOpen] = useState(false);
  const [textDialogPoint, setTextDialogPoint] = useState<Point | null>(null);
  const [textDialogType, setTextDialogType] = useState<string>("text");
  const [textValue, setTextValue] = useState("");
  const textPopoverRef = useRef<HTMLDivElement>(null);

  const closeTextPopover = useCallback(() => {
    setIsTextDialogOpen(false);
    setTextValue("");
    setTextDialogPoint(null);
  }, []);

  const handleTextSubmit = useCallback(() => {
    if (textValue && textDialogPoint) {
      addDrawing(symbol, {
        type: textDialogType as DrawingType,
        point: textDialogPoint,
        text: textValue,
        visible: true,
      } as Omit<TextDrawingType, "id">);
    }
    closeTextPopover();
  }, [addDrawing, closeTextPopover, symbol, textDialogPoint, textDialogType, textValue]);

  useEffect(() => {
    if (!isTextDialogOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (textPopoverRef.current?.contains(target)) return;
      if (svgRef.current?.contains(target)) return;
      closeTextPopover();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        closeTextPopover();
      }
    };
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [closeTextPopover, isTextDialogOpen]);

  // ─── Coordinate Helpers ─────────────────────────────────────
  const pointToCoords = useCallback((p: Point) => {
    if (!chart || !mainSeries) return null;
    const timeScale = chart.timeScale();
    const y = mainSeries.priceToCoordinate(p.price);
    const x = timeScale.timeToCoordinate(p.time as Time);

    if (x !== null && y !== null) return { x, y };

    if (y !== null && data && data.length > 0) {
      const lastIndex = data.length - 1;
      const lastCandle = data[lastIndex];
      const firstCandle = data[0];
      const interval = data.length > 1
        ? (data[1].time as number) - (data[0].time as number) : 300;

      let logical: number | null = null;
      if ((p.time as number) > (lastCandle.time as number)) {
        logical = lastIndex + ((p.time as number) - (lastCandle.time as number)) / interval;
      } else if ((p.time as number) < (firstCandle.time as number)) {
        logical = ((p.time as number) - (firstCandle.time as number)) / interval;
      }

      if (logical !== null) {
        const projectedX = timeScale.logicalToCoordinate(logical as Logical);
        if (projectedX !== null) return { x: projectedX, y };
      }
    }
    return null;
  }, [chart, mainSeries, data]);

  const coordsToPoint = useCallback((x: number, y: number): Point | null => {
    if (!chart || !mainSeries) return null;
    const timeScale = chart.timeScale();
    const price = mainSeries.coordinateToPrice(y);
    if (price === null) return null;

    const time = timeScale.coordinateToTime(x);
    if (time !== null) return { time: time as number, price };

    const logical = timeScale.coordinateToLogical(x);
    if (logical === null || !data || data.length === 0) return null;

    const lastIndex = data.length - 1;
    if (logical >= 0 && logical <= lastIndex) {
      const idx = Math.round(logical);
      const pt = data[idx];
      if (pt) return { time: pt.time as number, price };
    }

    const interval = data.length > 1
      ? (data[1].time as number) - (data[0].time as number) : 300;

    if (logical > lastIndex) {
      return { time: (data[lastIndex].time as number) + Math.round(logical - lastIndex) * interval, price };
    }
    if (logical < 0) {
      return { time: (data[0].time as number) + Math.round(logical) * interval, price };
    }
    return null;
  }, [chart, mainSeries, data]);

  // ─── Zoom/Key subscriptions ─────────────────────────────────
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
  }, [chart, symbol, deleteSelectedDrawings]);

  // ─── Local Interaction State ────────────────────────────────
  const [localInteraction, setLocalInteraction] = useState<{
    status: "idle" | "drawing" | "dragging" | "box-selecting" | "freehand";
    startPoint: Point | null;
    currentPoint: Point | null;
    activeDrawingIds: string[];
    originalDrawings: Record<string, Drawing>;
    collectedPoints: Point[];
  }>({
    status: "idle", startPoint: null, currentPoint: null,
    activeDrawingIds: [], originalDrawings: {}, collectedPoints: [],
  });

  // ─── Mouse Handlers ─────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent) => {
    const targetNode = e.target as Node;
    if (isTextDialogOpen && textPopoverRef.current?.contains(targetNode)) {
      e.stopPropagation();
      return;
    }
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const point = coordsToPoint(x, y);
    if (!point) return;

    const target = e.target as SVGElement;
    const drawingId = target.getAttribute("data-id");

    // ─── Eraser click ─────
    if (activeTool === "eraser" && drawingId) {
      useAnalysisStore.getState().deleteDrawing(symbol, drawingId);
      return;
    }

    // ─── Dragging / Select tool ─────
    if (drawingId && !isDrawingTool(activeTool)) {
      e.preventDefault();
      e.stopPropagation();
      const drawing = drawings.find((d) => d.id === drawingId);
      const additive = e.ctrlKey || e.metaKey;

      if (drawing && activeTool === "select") {
        if (additive) toggleDrawingSelection(drawingId, true);
        else if (!selectedDrawingIds.includes(drawingId)) setSelectedDrawings([drawingId]);
      }

      if (drawing && !drawing.locked && activeTool === "select") {
        const targetIds = (selectedDrawingIds.includes(drawingId) && selectedDrawingIds.length > 0)
          ? selectedDrawingIds : [drawingId];
        const draggableIds = targetIds.filter((id) => {
          const item = drawings.find((d) => d.id === id);
          return item && !item.locked;
        });
        if (draggableIds.length === 0) return;

        const originals: Record<string, Drawing> = {};
        draggableIds.forEach((id) => {
          const item = drawings.find((d) => d.id === id);
          if (item) originals[id] = item;
        });

        setLocalInteraction({
          status: "dragging", startPoint: point, currentPoint: point,
          activeDrawingIds: draggableIds, originalDrawings: originals, collectedPoints: [],
        });
        setSelectedDrawings(draggableIds);
        return;
      }
    }

    // Background click with select tool
    if (activeTool === "select" && !drawingId) {
      if (!(e.ctrlKey || e.metaKey)) setSelectedDrawings([]);
      setLocalInteraction({
        status: "box-selecting", startPoint: point, currentPoint: point,
        activeDrawingIds: [], originalDrawings: {}, collectedPoints: [],
      });
      return;
    }

    // ─── Single-click tools (instant commit) ─────
    if (SINGLE_CLICK_TOOLS.has(activeTool)) {
      if (activeTool === "horizontal-line") {
        addDrawing(symbol, { type: "horizontal-line", price: point.price, visible: true } as any);
      } else if (activeTool === "vertical-line" || activeTool === "cross-line" || activeTool === "horizontal-ray") {
        addDrawing(symbol, { type: activeTool as DrawingType, point, visible: true } as any);
      } else {
        // Arrow and annotation single-click tools
        addDrawing(symbol, { type: activeTool as DrawingType, point, visible: true, text: "" } as any);
      }
      return;
    }

    // ─── Text tools (open dialog) ─────
    if (TEXT_TOOLS.has(activeTool)) {
      setTextDialogPoint(point);
      setTextDialogType(activeTool);
      setTextValue("Note");
      setIsTextDialogOpen(true);
      return;
    }

    // ─── Position tools (instant with defaults) ─────
    if (POSITION_TOOLS.has(activeTool)) {
      const isLong = activeTool === "long-position";
      const pct = 0.03;
      addDrawing(symbol, {
        type: activeTool as DrawingType,
        entryPrice: point.price,
        targetPrice: isLong ? point.price * (1 + pct) : point.price * (1 - pct),
        stopPrice: isLong ? point.price * (1 - pct * 0.67) : point.price * (1 + pct * 0.67),
        entryTime: point.time,
        visible: true,
      } as any);
      return;
    }

    // ─── Freehand tools ─────
    if (FREEHAND_TOOLS.has(activeTool)) {
      setLocalInteraction({
        status: "freehand", startPoint: point, currentPoint: point,
        activeDrawingIds: [], originalDrawings: {}, collectedPoints: [point],
      });
      return;
    }

    // ─── Multi-point tools (3-point and multi-click) ─────
    if (THREE_POINT_TOOLS.has(activeTool) || MULTI_POINT_TOOLS.has(activeTool)) {
      const prev = localInteraction.collectedPoints;
      const updated = [...prev, point];
      const required = REQUIRED_POINTS[activeTool] ?? 0;

      // Tool finished?
      if (required > 0 && updated.length >= required) {
        // Commit
        if (THREE_POINT_TOOLS.has(activeTool)) {
          addDrawing(symbol, {
            type: activeTool as DrawingType,
            p1: updated[0], p2: updated[1], p3: updated[2],
            visible: true,
          } as any);
        } else {
          const labels = ELLIOTT_LABELS[activeTool] ?? PATTERN_LABELS[activeTool];
          addDrawing(symbol, {
            type: activeTool as DrawingType,
            points: updated,
            labels,
            visible: true,
          } as any);
        }
        setLocalInteraction({ status: "idle", startPoint: null, currentPoint: null, activeDrawingIds: [], originalDrawings: {}, collectedPoints: [] });
      } else {
        // Collect more points
        setLocalInteraction({
          ...localInteraction,
          status: "drawing",
          startPoint: localInteraction.startPoint ?? point,
          currentPoint: point,
          collectedPoints: updated,
        });
      }
      return;
    }

    // ─── Two-point tools (start drawing) ─────
    if (TWO_POINT_TOOLS.has(activeTool)) {
      setLocalInteraction({
        status: "drawing", startPoint: point, currentPoint: point,
        activeDrawingIds: [], originalDrawings: {}, collectedPoints: [],
      });
      return;
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (localInteraction.status === "idle") return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const point = coordsToPoint(e.clientX - rect.left, e.clientY - rect.top);
    if (!point) return;

    if (localInteraction.status === "freehand") {
      setLocalInteraction((prev) => ({
        ...prev, currentPoint: point,
        collectedPoints: [...prev.collectedPoints, point],
      }));
      return;
    }

    setLocalInteraction((prev) => ({ ...prev, currentPoint: point }));

    // Drag update
    if (localInteraction.status === "dragging" && localInteraction.activeDrawingIds.length > 0) {
      const start = localInteraction.startPoint;
      if (!start) return;
      const dxTime = (point.time as number) - (start.time as number);
      const dyPrice = point.price - start.price;

      localInteraction.activeDrawingIds.forEach((id) => {
        const original = localInteraction.originalDrawings[id];
        if (!original) return;
        let newDrawing = { ...original };
        if ("p1" in original && "p2" in original) {
          const tp = original as TwoPointDrawing;
          newDrawing = {
            ...newDrawing,
            p1: { time: tp.p1.time + dxTime, price: tp.p1.price + dyPrice },
            p2: { time: tp.p2.time + dxTime, price: tp.p2.price + dyPrice },
          } as any;
        } else if ("point" in original) {
          const sp = original as any;
          newDrawing = { ...sp, point: { time: sp.point.time + dxTime, price: sp.point.price + dyPrice } };
        } else if ("price" in original) {
          const hp = original as any;
          newDrawing = { ...hp, price: hp.price + dyPrice };
        } else if ("entryPrice" in original) {
          const pos = original as PositionDrawing;
          newDrawing = {
            ...pos,
            entryPrice: pos.entryPrice + dyPrice,
            targetPrice: pos.targetPrice + dyPrice,
            stopPrice: pos.stopPrice + dyPrice,
            entryTime: pos.entryTime + dxTime,
          } as any;
        }
        useAnalysisStore.getState().updateDrawing(symbol, newDrawing as Drawing);
      });
    }
  };

  const handleMouseUp = () => {
    if (localInteraction.status === "drawing" && localInteraction.startPoint && localInteraction.currentPoint) {
      if (TWO_POINT_TOOLS.has(activeTool)) {
        addDrawing(symbol, {
          type: activeTool as DrawingType,
          visible: true,
          p1: localInteraction.startPoint,
          p2: localInteraction.currentPoint,
        } as any);
      }
      // Multi-point drawing-in-progress doesn't commit on mouseUp (they commit on click count)
      if (!THREE_POINT_TOOLS.has(activeTool) && !MULTI_POINT_TOOLS.has(activeTool)) {
        setLocalInteraction({ status: "idle", startPoint: null, currentPoint: null, activeDrawingIds: [], originalDrawings: {}, collectedPoints: [] });
      }
    } else if (localInteraction.status === "freehand" && localInteraction.collectedPoints.length >= 2) {
      addDrawing(symbol, {
        type: activeTool as DrawingType,
        points: localInteraction.collectedPoints,
        strokeWidth: activeTool === "highlighter" ? 12 : 2,
        opacity: activeTool === "highlighter" ? 0.3 : 1,
        visible: true,
      } as any);
      setLocalInteraction({ status: "idle", startPoint: null, currentPoint: null, activeDrawingIds: [], originalDrawings: {}, collectedPoints: [] });
    } else if (localInteraction.status === "box-selecting" && localInteraction.startPoint && localInteraction.currentPoint) {
      const p1 = localInteraction.startPoint;
      const p2 = localInteraction.currentPoint;
      const tMin = Math.min(p1.time, p2.time);
      const tMax = Math.max(p1.time, p2.time);
      const priceMin = Math.min(p1.price, p2.price);
      const priceMax = Math.max(p1.price, p2.price);

      const selectedIds: string[] = [];
      drawings.forEach((d) => {
        let inside = false;
        if ("p1" in d && "p2" in d) {
          const tp = d as TwoPointDrawing;
          const overlapTime = Math.min(tp.p1.time, tp.p2.time) <= tMax && Math.max(tp.p1.time, tp.p2.time) >= tMin;
          const overlapPrice = Math.min(tp.p1.price, tp.p2.price) <= priceMax && Math.max(tp.p1.price, tp.p2.price) >= priceMin;
          inside = overlapTime && overlapPrice;
        } else if ("point" in d) {
          const sp = d as any;
          inside = sp.point.time >= tMin && sp.point.time <= tMax && sp.point.price >= priceMin && sp.point.price <= priceMax;
        } else if ("price" in d) {
          inside = (d as any).price >= priceMin && (d as any).price <= priceMax;
        }
        if (inside) selectedIds.push(d.id);
      });
      setSelectedDrawings(selectedIds);
      setLocalInteraction({ status: "idle", startPoint: null, currentPoint: null, activeDrawingIds: [], originalDrawings: {}, collectedPoints: [] });
    } else if (localInteraction.status === "dragging") {
      setLocalInteraction({ status: "idle", startPoint: null, currentPoint: null, activeDrawingIds: [], originalDrawings: {}, collectedPoints: [] });
    }
  };

  // ─── Render helpers ─────────────────────────────────────────
  const rendererProps = useCallback(
    (drawing: Drawing, selected: boolean, isDraft = false): DrawingRendererProps => ({
      drawing,
      pointToCoords,
      coordsToPoint,
      width,
      height,
      selected,
      mainSeries,
      data,
      isDraft,
    }),
    [pointToCoords, coordsToPoint, width, height, mainSeries, data],
  );

  const renderDrawing = useCallback(
    (drawing: Drawing, selected: boolean, isDraft = false): React.ReactNode => {
      const renderer = RENDERER_MAP[drawing.type];
      if (!renderer) return null;
      return renderer(rendererProps(drawing, selected, isDraft));
    },
    [rendererProps],
  );

  const isActive = isDrawingTool(activeTool) || activeTool === "select" || activeTool === "eraser";
  const isMeasurerTool =
    activeTool === "price-range" || activeTool === "date-range" || activeTool === "date-price-range";
  const measurerMode =
    activeTool === "price-range"
      ? "price"
      : activeTool === "date-range"
      ? "date"
      : activeTool === "date-price-range"
      ? "date-price"
      : null;
  const measurerAnchor =
    localInteraction.status !== "idle" && localInteraction.currentPoint
      ? pointToCoords(localInteraction.currentPoint)
      : null;
  const textPopoverAnchor = textDialogPoint ? pointToCoords(textDialogPoint) : null;
  const textPopoverStyle = useMemo(() => {
    if (!textPopoverAnchor) return null;
    const popoverWidth = 210;
    const popoverHeight = 34;
    const pad = 6;
    let left = textPopoverAnchor.x + 8;
    let top = textPopoverAnchor.y + 8;
    if (left + popoverWidth > width - pad) left = width - popoverWidth - pad;
    if (left < pad) left = pad;
    if (top + popoverHeight > height - pad) top = height - popoverHeight - pad;
    if (top < pad) top = pad;
    return { left, top };
  }, [height, textPopoverAnchor, width]);

  return (
    <>
      <div
        className={`absolute inset-0 z-50 ${isActive ? "pointer-events-auto" : "pointer-events-none"}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{
          cursor: isDrawingTool(activeTool) ? "crosshair" : activeTool === "eraser" ? "not-allowed" : activeTool === "select" ? "default" : "auto",
        }}
      >
        <svg ref={svgRef} width={width} height={height} className="absolute inset-0">
          {/* Committed drawings (skip hidden) */}
          {drawings.map((d) => {
            if (!d.visible) return null;
            const isPosition = d.type === "long-position" || d.type === "short-position";
            if (globalHideState.drawings && !isPosition) return null;
            if (globalHideState.positions && isPosition) return null;
            const isSelected = selectedDrawingIds.includes(d.id);
            return <g key={d.id}>{renderDrawing(d, isSelected)}</g>;
          })}

          {/* Box selection preview */}
          {localInteraction.status === "box-selecting" && localInteraction.startPoint && localInteraction.currentPoint && (() => {
            const sc = pointToCoords(localInteraction.startPoint);
            const ec = pointToCoords(localInteraction.currentPoint);
            if (!sc || !ec) return null;
            return (
              <rect
                x={Math.min(sc.x, ec.x)} y={Math.min(sc.y, ec.y)}
                width={Math.abs(ec.x - sc.x)} height={Math.abs(ec.y - sc.y)}
                fill="rgba(33,150,243,0.1)" stroke="#2196F3" strokeWidth={1} strokeDasharray="4 4"
              />
            );
          })()}

          {/* Draft preview for two-point tools */}
          {localInteraction.status === "drawing" && localInteraction.startPoint && localInteraction.currentPoint
            && TWO_POINT_TOOLS.has(activeTool) && (() => {
              const draftDrawing: TwoPointDrawing = {
                id: "__draft__",
                type: activeTool as any,
                visible: true,
                p1: localInteraction.startPoint!,
                p2: localInteraction.currentPoint!,
              };
              return renderDrawing(draftDrawing, false, true);
            })()}

          {/* Draft preview for multi-point tools (shows collected points + current cursor) */}
          {localInteraction.status === "drawing" && localInteraction.collectedPoints.length > 0
            && (THREE_POINT_TOOLS.has(activeTool) || MULTI_POINT_TOOLS.has(activeTool)) && (() => {
              const allPts = [...localInteraction.collectedPoints];
              if (localInteraction.currentPoint) allPts.push(localInteraction.currentPoint);
              // Preview as connected lines
              const coords = allPts
                .map(pointToCoords)
                .filter((c): c is { x: Coordinate; y: Coordinate } => Boolean(c));
              if (coords.length < 2) return null;
              return (
                <polyline
                  points={coords.map((c) => `${c.x},${c.y}`).join(" ")}
                  fill="none" stroke="#3B82F6" strokeWidth={2} strokeDasharray="4 4"
                />
              );
            })()}

          {/* Freehand preview */}
          {localInteraction.status === "freehand" && localInteraction.collectedPoints.length >= 2 && (() => {
            const coords = localInteraction.collectedPoints
              .map(pointToCoords)
              .filter((c): c is { x: Coordinate; y: Coordinate } => Boolean(c));
            if (coords.length < 2) return null;
            return (
              <polyline
                points={coords.map((c) => `${c.x},${c.y}`).join(" ")}
                fill="none"
                stroke={activeTool === "highlighter" ? "rgba(255,235,59,0.4)" : "#3B82F6"}
                strokeWidth={activeTool === "highlighter" ? 12 : 2}
                strokeLinecap="round" strokeLinejoin="round"
              />
            );
          })()}
        </svg>

        {isTextDialogOpen && textPopoverAnchor && textPopoverStyle && (
          <div
            ref={textPopoverRef}
            className="absolute z-[60]"
            style={{ left: textPopoverStyle.left, top: textPopoverStyle.top }}
          >
            <div className="rounded-md border border-slate-200/80 bg-white/95 px-1.5 py-1 shadow-lg backdrop-blur-md dark:border-white/[0.08] dark:bg-[#0c1322]/95">
              <div className="flex items-center gap-1.5">
                <input
                  id="text-annotation"
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                  placeholder="Enter text..."
                  onKeyDown={(e) => { if (e.key === "Enter") handleTextSubmit(); }}
                  autoFocus
                  className="h-7 w-32 rounded border border-slate-200/80 bg-transparent px-2 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-300 dark:border-white/[0.08] dark:text-slate-100 dark:placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={handleTextSubmit}
                  className="h-7 w-7 rounded text-[12px] font-semibold text-white"
                  style={{ backgroundColor: "#14338a" }}
                  title="Add"
                >
                  ✓
                </button>
                <button
                  type="button"
                  onClick={closeTextPopover}
                  className="h-7 w-7 rounded border border-slate-200/80 text-[12px] text-slate-500 hover:text-slate-900 dark:border-white/[0.08] dark:text-slate-400 dark:hover:text-slate-100"
                  title="Cancel"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Measurer overlay stats while drawing */}
        {isMeasurerTool &&
          measurerMode &&
          localInteraction.status === "drawing" &&
          localInteraction.startPoint &&
          localInteraction.currentPoint &&
          measurerAnchor && (
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
      </div>

    </>
  );
}
