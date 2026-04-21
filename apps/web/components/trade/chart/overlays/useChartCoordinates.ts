import { useCallback, useMemo, type MutableRefObject } from 'react';
import type { IChartApi, ISeriesApi, Time, Logical, CandlestickData, Coordinate } from 'lightweight-charts';
import type { Point } from '@/stores/trading/analysis.store';
import { detectIntervalHintSec, resolveDisplayTime } from '../utils/timeline';

export function useChartCoordinates(
  chart: IChartApi | null,
  mainSeries: ISeriesApi<'Candlestick'> | null,
  data: CandlestickData[],
  rawToRenderTimeRef?: MutableRefObject<Map<number, number>>,
  renderToRawTimeRef?: MutableRefObject<Map<number, number>>
) {
  const timeInterval = useMemo(() => {
    return detectIntervalHintSec(data);
  }, [data]);

  const priceStep = 0.01;

  const toRenderTime = useCallback(
    (rawTime: number) => {
      const mapped = rawToRenderTimeRef?.current.get(rawTime);
      return Number.isFinite(mapped as number) ? Number(mapped) : rawTime;
    },
    [rawToRenderTimeRef]
  );

  const toRawTime = useCallback(
    (renderTime: number) => {
      if (!renderToRawTimeRef) return renderTime;
      return resolveDisplayTime(renderTime, renderToRawTimeRef as MutableRefObject<Map<number, number>>);
    },
    [renderToRawTimeRef]
  );

  const pointToCoords = useCallback(
    (p: Point) => {
      if (!chart || !mainSeries) return null;
      const timeScale = chart.timeScale();
      const y = mainSeries.priceToCoordinate(p.price);
      const renderTime = toRenderTime(p.time);
      const x = timeScale.timeToCoordinate(renderTime as Time);

      if (x !== null && y !== null) return { x: x as Coordinate, y: y as Coordinate };

      if (y !== null && data && data.length > 0) {
        const lastIndex = data.length - 1;
        const lastCandleTime = toRenderTime(Number(data[lastIndex].time));
        const firstCandleTime = toRenderTime(Number(data[0].time));
        let logical: number | null = null;
        if (renderTime > lastCandleTime) {
          logical = lastIndex + (renderTime - lastCandleTime) / timeInterval;
        } else if (renderTime < firstCandleTime) {
          logical = (renderTime - firstCandleTime) / timeInterval;
        }

        if (logical !== null) {
          const projectedX = timeScale.logicalToCoordinate(logical as Logical);
          if (projectedX !== null) return { x: projectedX as Coordinate, y: y as Coordinate };
        }
      }
      return null;
    },
    [chart, mainSeries, data, timeInterval, toRenderTime]
  );

  const coordsToPoint = useCallback(
    (x: number, y: number): Point | null => {
      if (!chart || !mainSeries) return null;
      const timeScale = chart.timeScale();
      const price = mainSeries.coordinateToPrice(y);
      if (price === null) return null;

      const time = timeScale.coordinateToTime(x);
      if (time !== null) return { time: toRawTime(Number(time)), price };

      const logical = timeScale.coordinateToLogical(x);
      if (logical === null || !data || data.length === 0) return null;

      const lastIndex = data.length - 1;
      if (logical >= 0 && logical <= lastIndex) {
        const idx = Math.round(logical);
        const pt = data[idx];
        if (pt) return { time: Number(pt.time), price };
      }

      const firstRawTime = Number(data[0].time);
      const lastRawTime = Number(data[lastIndex].time);

      if (logical > lastIndex) {
        return {
          time: lastRawTime + Math.round(logical - lastIndex) * timeInterval,
          price,
        };
      }
      if (logical < 0) {
        return { time: firstRawTime + Math.round(logical) * timeInterval, price };
      }
      return null;
    },
    [chart, mainSeries, data, timeInterval, toRawTime]
  );

  const snapTime = useCallback(
    (time: number) => Math.round(time / timeInterval) * timeInterval,
    [timeInterval]
  );

  const snapPrice = useCallback(
    (price: number) => Math.round(price / priceStep) * priceStep,
    []
  );

  return { pointToCoords, coordsToPoint, timeInterval, priceStep, snapTime, snapPrice };
}
