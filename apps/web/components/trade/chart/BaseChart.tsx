"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';
import { DrawingManager } from './overlays/DrawingManager';
import { resolveDisplayTime as resolveDisplayTimeUtil } from './utils/timeline';
import { useChartInstance } from './hooks/useChartInstance';
import { useChartController } from './hooks/useChartController';
import { useChartDataUpdates } from './hooks/useChartDataUpdates';
import { useInfiniteScroll } from './hooks/useInfiniteScroll';
import { useChartResize } from './hooks/useChartResize';
import { useIndicators } from './hooks/useIndicators';
import { useChartPresentation } from './hooks/useChartPresentation';
import type { BaseChartProps, BaseChartRef, LastAppliedData } from './types/chart.types';

export const BaseChart = forwardRef<BaseChartRef, BaseChartProps>(({
  data,
  volumeData,
  indicators = [],
  height,
  autoResize = true,
  isMobile,
  symbol,
  instrumentKey,
  range,
  chartStyle = 'CANDLE',
  showVolume = false,
  onHoverCandleChange,
  onChartReady,
  onLoadMore,
}, ref) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const barSeriesRef = useRef<ISeriesApi<'Bar'> | null>(null);
  const lineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const areaSeriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const baselineSeriesRef = useRef<ISeriesApi<'Baseline'> | null>(null);
  const columnSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const indicatorSeriesRefs = useRef<Map<string, ISeriesApi<any>[]>>(new Map());
  const isFetchingRef = useRef(false);
  const previousLogicalRangeRef = useRef<{ from: number; to: number } | null>(null);
  const rawToRenderTimeRef = useRef<Map<number, number>>(new Map());
  const renderToRawTimeRef = useRef<Map<number, number>>(new Map());
  const intervalHintSecRef = useRef<number>(60);
  const lastAppliedDataRef = useRef<LastAppliedData | null>(null);

  const [dimensions, setDimensions] = useState({ width: 0, height: height ?? 400 });
  const isCompact = useMemo(() => {
    if (typeof isMobile === 'boolean') return isMobile;
    return dimensions.width > 0 && dimensions.width <= 420;
  }, [dimensions.width, isMobile]);
  const priceFormat = useMemo(
    () =>
      isCompact
        ? {
            type: 'custom' as const,
            formatter: (value: number) => {
              if (!Number.isFinite(value)) return '--';
              const abs = Math.abs(value);
              if (abs >= 1000) {
                const scaled = abs / 1000;
                const formatted = scaled >= 100 ? scaled.toFixed(1) : scaled.toFixed(2);
                return `${value < 0 ? '-' : ''}${formatted}K`;
              }
              return value.toFixed(2);
            },
          }
        : {
            type: 'price' as const,
            precision: 2,
            minMove: 0.01,
          },
    [isCompact],
  );

  const onLoadMoreRef = useRef(onLoadMore);
  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  const onHoverCandleChangeRef = useRef(onHoverCandleChange);
  useEffect(() => {
    onHoverCandleChangeRef.current = onHoverCandleChange;
  }, [onHoverCandleChange]);

  const resolveDisplayTime = useCallback(
    (time: number) => resolveDisplayTimeUtil(time, renderToRawTimeRef),
    [],
  );

  const { chartInstance } = useChartInstance({
    chartContainerRef,
    chartRef,
    candleSeriesRef,
    barSeriesRef,
    lineSeriesRef,
    areaSeriesRef,
    baselineSeriesRef,
    columnSeriesRef,
    volumeSeriesRef,
    height,
    onChartReady,
    onHoverCandleChangeRef,
    resolveDisplayTime,
    setDimensions,
  });

  useInfiniteScroll({
    chart: chartInstance,
    onLoadMoreRef,
    isFetchingRef,
    previousLogicalRangeRef,
    symbol,
    instrumentKey,
  });

  const controller = useChartController({
    candleSeriesRef,
    symbol,
    instrumentKey,
    rawToRenderTimeRef,
    renderToRawTimeRef,
    intervalHintSecRef,
    lastAppliedDataRef,
  });

  useChartDataUpdates({
    controller,
    data,
    volumeData,
    showVolume,
    chartStyle,
    symbol,
    instrumentKey,
    range,
    rawToRenderTimeRef,
    renderToRawTimeRef,
    intervalHintSecRef,
    lastAppliedDataRef,
    barSeriesRef,
    lineSeriesRef,
    areaSeriesRef,
    baselineSeriesRef,
    columnSeriesRef,
    volumeSeriesRef,
  });

  useChartResize({
    autoResize,
    chart: chartInstance,
    chartContainerRef,
    chartInstance,
    height,
    setDimensions,
  });

  const hasMacd = indicators.some((i) => i.config.type === 'MACD');

  useChartPresentation({
    chart: chartInstance,
    candleSeriesRef,
    barSeriesRef,
    lineSeriesRef,
    areaSeriesRef,
    baselineSeriesRef,
    columnSeriesRef,
    volumeSeriesRef,
    hasMacd,
    showVolume,
    chartStyle,
  });

  useEffect(() => {
    if (!chartInstance) return;
    chartInstance.applyOptions({
      layout: {
        fontSize: isCompact ? 10 : 12,
      },
      rightPriceScale: {
        visible: true,
        autoScale: true,
        minimumWidth: isCompact ? 46 : 60,
      },
    });

    const series = [
      candleSeriesRef.current,
      barSeriesRef.current,
      lineSeriesRef.current,
      areaSeriesRef.current,
      baselineSeriesRef.current,
      columnSeriesRef.current,
    ].filter(Boolean);

    series.forEach((target) => {
      target?.applyOptions({ priceFormat });
    });
  }, [chartInstance, isCompact, priceFormat]);

  useIndicators({
    chart: chartInstance,
    indicators,
    indicatorSeriesRefs,
    rawToRenderTimeRef,
  });

  useImperativeHandle(ref, () => ({
    chart: chartRef.current,
    container: chartContainerRef.current,
  }));

  return (
    <div ref={chartContainerRef} className="w-full h-full rounded-lg relative">
      {chartInstance && candleSeriesRef.current && dimensions.width > 0 && data && data.length > 0 && (
        <DrawingManager
          chart={chartInstance}
          mainSeries={candleSeriesRef.current}
          width={dimensions.width}
          height={dimensions.height}
          data={data}
          symbol={symbol}
          rawToRenderTimeRef={rawToRenderTimeRef}
          renderToRawTimeRef={renderToRawTimeRef}
        />
      )}
    </div>
  );
});

BaseChart.displayName = 'BaseChart';
