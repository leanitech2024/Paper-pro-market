import { useEffect, type MutableRefObject } from 'react';
import type { CandlestickData, HistogramData, ISeriesApi } from 'lightweight-charts';
import type { ChartStyle } from '@/domains/chart/stores/analysis.store';
import { trackAnalysisEvent } from '@/domains/chart/lib/telemetry';
import { toInstrumentKey } from '@paper-market/core';
import { rebuildRenderTimeline } from '../utils/timeline';
import { toHeikinAshiData } from '../utils/heikinAshi';
import type { IntervalHintRef, LastAppliedDataRef, TimeMapRef } from '../types/chart.types';
import type { ChartController } from '@/domains/chart/lib/chart-controller';

type UseChartDataUpdatesArgs = {
  controller: ChartController | null;
  data: CandlestickData[];
  volumeData?: HistogramData[];
  showVolume: boolean;
  chartStyle: ChartStyle;
  symbol: string;
  instrumentKey?: string;
  range?: string;
  rawToRenderTimeRef: TimeMapRef;
  renderToRawTimeRef: TimeMapRef;
  intervalHintSecRef: IntervalHintRef;
  lastAppliedDataRef: LastAppliedDataRef;
  barSeriesRef: MutableRefObject<ISeriesApi<'Bar'> | null>;
  lineSeriesRef: MutableRefObject<ISeriesApi<'Line'> | null>;
  areaSeriesRef: MutableRefObject<ISeriesApi<'Area'> | null>;
  baselineSeriesRef: MutableRefObject<ISeriesApi<'Baseline'> | null>;
  columnSeriesRef: MutableRefObject<ISeriesApi<'Histogram'> | null>;
  volumeSeriesRef: MutableRefObject<ISeriesApi<'Histogram'> | null>;
};

const UP_COLOR = '#089981';
const DOWN_COLOR = '#F23645';

const toLineData = (rows: CandlestickData[], source: 'close' | 'hlc3' = 'close') =>
  rows.map((row: any) => ({
    time: row.time,
    value:
      source === 'hlc3'
        ? (Number(row.high) + Number(row.low) + Number(row.close)) / 3
        : Number(row.close),
  }));

const toMappedVolumeData = (volumeData: HistogramData[] | undefined, rawToRenderTimeRef: TimeMapRef) =>
  (volumeData || [])
    .filter((row: any) => {
      const rawTime = Number(row?.time);
      const rawValue = Number(row?.value);
      return Number.isFinite(rawTime) && Number.isFinite(rawValue) && rawToRenderTimeRef.current.has(rawTime);
    })
    .map((row: any) => {
      const rawTime = Number(row?.time);
      const mappedTime = rawToRenderTimeRef.current.get(rawTime);
      if (!Number.isFinite(mappedTime as number)) {
        return null;
      }
      return {
        ...row,
        time: Number(mappedTime) as any,
      };
    })
    .filter(Boolean) as HistogramData[];

const toHollowCandleData = (rows: CandlestickData[]) =>
  rows.map((row: any) => {
    const isUp = Number(row.close) >= Number(row.open);
    return {
      ...row,
      color: isUp ? 'rgba(0, 0, 0, 0)' : DOWN_COLOR,
      borderColor: isUp ? UP_COLOR : DOWN_COLOR,
      wickColor: isUp ? UP_COLOR : DOWN_COLOR,
    };
  });

const toVolumeCandleData = (rows: CandlestickData[], mappedVolumeData: HistogramData[]) => {
  const volumeByTime = new Map<number, number>();
  let totalVolume = 0;

  for (const row of mappedVolumeData as any[]) {
    const time = Number(row?.time);
    const value = Number(row?.value);
    if (!Number.isFinite(time) || !Number.isFinite(value)) continue;
    volumeByTime.set(time, value);
    totalVolume += value;
  }

  const averageVolume = mappedVolumeData.length > 0 ? totalVolume / mappedVolumeData.length : 1;

  return rows.map((row: any) => {
    const time = Number(row.time);
    const volume = volumeByTime.get(time) ?? averageVolume;
    const relativeStrength = Math.max(0.35, Math.min(1, averageVolume > 0 ? volume / averageVolume : 1));
    const isUp = Number(row.close) >= Number(row.open);
    const alpha = Math.min(0.25 + relativeStrength * 0.45, 0.92);
    const fill = isUp
      ? `rgba(8, 153, 129, ${alpha})`
      : `rgba(242, 54, 69, ${alpha})`;

    return {
      ...row,
      color: fill,
      borderColor: isUp ? UP_COLOR : DOWN_COLOR,
      wickColor: isUp ? UP_COLOR : DOWN_COLOR,
    };
  });
};

const toColumnData = (rows: CandlestickData[]) =>
  rows.map((row: any) => ({
    time: row.time,
    value: Number(row.close),
    color: Number(row.close) >= Number(row.open) ? UP_COLOR : DOWN_COLOR,
  }));

const isFiniteCandle = (row: CandlestickData | undefined | null): row is CandlestickData => {
  if (!row) return false;

  const time = Number((row as any).time);
  const open = Number((row as any).open);
  const high = Number((row as any).high);
  const low = Number((row as any).low);
  const close = Number((row as any).close);

  return (
    Number.isFinite(time) &&
    Number.isFinite(open) &&
    Number.isFinite(high) &&
    Number.isFinite(low) &&
    Number.isFinite(close)
  );
};

export const useChartDataUpdates = ({
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
}: UseChartDataUpdatesArgs) => {
  useEffect(() => {
    const sanitizedData = (data || []).filter(isFiniteCandle);

    if (!controller || sanitizedData.length === 0) {
      return;
    }

    const stats = controller.getStats();
    if (!stats.hasSeries) {
      console.warn(`Skipping data update - controller series not ready for ${symbol}`);
      return;
    }

    const symbolKey = toInstrumentKey(instrumentKey || symbol);
    const rangeKey = String(range || '').toUpperCase();
    const firstTime = Number(sanitizedData[0]?.time);
    const lastCandle = sanitizedData[sanitizedData.length - 1] as CandlestickData;
    const lastTime = Number(lastCandle?.time);
    const lastOpen = Number((lastCandle as any)?.open);
    const lastHigh = Number((lastCandle as any)?.high);
    const lastLow = Number((lastCandle as any)?.low);
    const lastClose = Number((lastCandle as any)?.close);

    const prev = lastAppliedDataRef.current;
    const symbolOrRangeChanged = !prev || prev.symbolKey !== symbolKey || prev.rangeKey !== rangeKey;
    const sameLeadingEdge = !!prev && firstTime === prev.firstTime;
    const appendedNewestOnly =
      !!prev &&
      !symbolOrRangeChanged &&
      sameLeadingEdge &&
      sanitizedData.length === prev.length + 1 &&
      lastTime > prev.lastTime;
    const patchedNewestOnly =
      !!prev &&
      !symbolOrRangeChanged &&
      sameLeadingEdge &&
      sanitizedData.length === prev.length &&
      lastTime === prev.lastTime &&
      (lastOpen !== prev.lastOpen ||
        lastHigh !== prev.lastHigh ||
        lastLow !== prev.lastLow ||
        lastClose !== prev.lastClose);
    const unchangedData =
      !!prev &&
      !symbolOrRangeChanged &&
      sameLeadingEdge &&
      sanitizedData.length === prev.length &&
      lastTime === prev.lastTime &&
      lastOpen === prev.lastOpen &&
      lastHigh === prev.lastHigh &&
      lastLow === prev.lastLow &&
      lastClose === prev.lastClose;

    const allowIncrementalCandleWrite =
      chartStyle === 'CANDLE' || chartStyle === 'LINE' || chartStyle === 'AREA';

    if (allowIncrementalCandleWrite && (appendedNewestOnly || patchedNewestOnly) && lastCandle) {
      let renderTime = rawToRenderTimeRef.current.get(lastTime);

      if (!Number.isFinite(renderTime as number) && appendedNewestOnly && prev) {
        const rawGap = lastTime - prev.lastTime;
        const isSessionGap = rawGap > intervalHintSecRef.current * 2;

        renderTime = isSessionGap
          ? prev.lastRenderTime + intervalHintSecRef.current
          : prev.lastRenderTime + rawGap;

        rawToRenderTimeRef.current.set(lastTime, renderTime as number);
        renderToRawTimeRef.current.set(renderTime as number, lastTime);
      }

      if (!Number.isFinite(renderTime as number)) {
        renderTime = lastTime;
      }

      const renderCandle: CandlestickData = {
        ...(lastCandle as any),
        time: Number(renderTime) as any,
      };
      controller.updateCandle(renderCandle);
      if (lineSeriesRef.current) {
        lineSeriesRef.current.update({
          time: renderCandle.time as any,
          value: Number(renderCandle.close),
        } as any);
      }
      if (areaSeriesRef.current) {
        areaSeriesRef.current.update({
          time: renderCandle.time as any,
          value: Number(renderCandle.close),
        } as any);
      }
      lastAppliedDataRef.current = {
        symbolKey,
        rangeKey,
        length: sanitizedData.length,
        firstTime,
        lastTime,
        lastRenderTime: Number(renderTime),
        lastOpen,
        lastHigh,
        lastLow,
        lastClose,
      };
      return;
    }

    if (unchangedData) {
      return;
    }

    if (process.env.NODE_ENV !== 'production') {
      for (let i = 1; i < sanitizedData.length; i++) {
        if (sanitizedData[i].time <= sanitizedData[i - 1].time) {
          console.error('Non-monotonic candle stream detected', {
            index: i,
            prev: sanitizedData[i - 1],
            current: sanitizedData[i],
          });
          trackAnalysisEvent({
            name: 'chart_non_monotonic_candles',
            level: 'warn',
            payload: {
              symbol,
              instrumentKey,
              index: i,
            },
          });
          break;
        }
      }
    }

    const renderedData = rebuildRenderTimeline(
      sanitizedData as CandlestickData[],
      rawToRenderTimeRef,
      renderToRawTimeRef,
      intervalHintSecRef,
    );
    const mappedVolumeData = toMappedVolumeData(volumeData, rawToRenderTimeRef);
    const candleData =
      chartStyle === 'HEIKIN_ASHI'
        ? toHeikinAshiData(renderedData)
        : chartStyle === 'HOLLOW_CANDLES'
        ? toHollowCandleData(renderedData)
        : chartStyle === 'VOLUME_CANDLES'
        ? toVolumeCandleData(renderedData, mappedVolumeData)
        : renderedData;
    const lineData = toLineData(renderedData);
    const hlcAreaData = toLineData(renderedData, 'hlc3');
    const columnData = toColumnData(renderedData);

    const baseForPrimary = candleData;
    controller.setData(baseForPrimary);
    if (barSeriesRef.current) {
      barSeriesRef.current.setData(renderedData as any);
    }
    if (lineSeriesRef.current) {
      lineSeriesRef.current.setData(lineData as any);
    }
    if (areaSeriesRef.current) {
      areaSeriesRef.current.setData((chartStyle === 'HLC_AREA' ? hlcAreaData : lineData) as any);
    }
    if (baselineSeriesRef.current) {
      baselineSeriesRef.current.applyOptions({
        baseValue: {
          type: 'price',
          price: Number(renderedData[0]?.close ?? 0),
        },
      } as any);
      baselineSeriesRef.current.setData(lineData as any);
    }
    if (columnSeriesRef.current) {
      const minLow = renderedData.reduce((min, row: any) => Math.min(min, Number(row.low)), Number(renderedData[0]?.low ?? 0));
      columnSeriesRef.current.applyOptions({
        base: Number.isFinite(minLow) ? minLow * 0.995 : 0,
      } as any);
      columnSeriesRef.current.setData(columnData as any);
    }
    const renderedLastTime = Number(renderedData[renderedData.length - 1]?.time ?? lastTime);
    lastAppliedDataRef.current = {
      symbolKey,
      rangeKey,
      length: sanitizedData.length,
      firstTime,
      lastTime,
      lastRenderTime: renderedLastTime,
      lastOpen,
      lastHigh,
      lastLow,
      lastClose,
    };
  }, [
    controller,
    data,
    symbol,
    instrumentKey,
    range,
    chartStyle,
    rawToRenderTimeRef,
    renderToRawTimeRef,
    intervalHintSecRef,
    lastAppliedDataRef,
    barSeriesRef,
    lineSeriesRef,
    areaSeriesRef,
    baselineSeriesRef,
    columnSeriesRef,
    volumeData,
  ]);

  useEffect(() => {
    const volumeSeries = volumeSeriesRef.current;

    if (!volumeSeries) return;

    if (!showVolume) {
      volumeSeries.setData([]);
      return;
    }

    if (volumeData && volumeData.length > 0) {
      try {
        const mappedVolume = toMappedVolumeData(volumeData, rawToRenderTimeRef);
        volumeSeries.setData(mappedVolume as any);
      } catch (err) {
        console.warn('?? Failed to update volume data:', err);
        trackAnalysisEvent({
          name: 'chart_volume_update_failed',
          level: 'warn',
          payload: {
            symbol,
            instrumentKey,
          },
        });
      }
    }
  }, [showVolume, volumeData, volumeSeriesRef, rawToRenderTimeRef, symbol, instrumentKey]);
};
