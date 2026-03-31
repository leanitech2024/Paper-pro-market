import React, { useCallback } from 'react';
import type { ISeriesApi, CandlestickData, Coordinate } from 'lightweight-charts';
import type { Drawing, Point } from '@/stores/trading/analysis.store';
import type { DrawingRendererProps } from './renderers/types';

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

type RenderFn = (props: DrawingRendererProps) => React.ReactNode;

export const RENDERER_MAP: Record<string, RenderFn> = {
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

export function useDrawingRenderer({
  width,
  height,
  mainSeries,
  data,
  pointToCoords,
  coordsToPoint,
}: {
  width: number;
  height: number;
  mainSeries: ISeriesApi<"Candlestick">;
  data: CandlestickData[];
  pointToCoords: (p: Point) => { x: Coordinate; y: Coordinate } | null;
  coordsToPoint: (x: number, y: number) => Point | null;
}) {
  const getRendererProps = useCallback(
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
    [pointToCoords, coordsToPoint, width, height, mainSeries, data]
  );

  const renderDrawing = useCallback(
    (drawing: Drawing, selected: boolean, isDraft = false): React.ReactNode => {
      const renderer = RENDERER_MAP[drawing.type];
      if (!renderer) return null;
      return renderer(getRendererProps(drawing, selected, isDraft));
    },
    [getRendererProps]
  );

  return { renderDrawing };
}
