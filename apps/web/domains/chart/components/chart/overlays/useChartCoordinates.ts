import { useCallback, useMemo, type MutableRefObject } from 'react';
import type { IChartApi, ISeriesApi, Time, Logical, CandlestickData, Coordinate } from 'lightweight-charts';
import type { Point } from '@/domains/chart/stores/analysis.store';
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
      if (!chart || !mainSeries || !p) return null;
      
      const timeScale = chart.timeScale();
      const y = mainSeries.priceToCoordinate(p.price);
      
      // Ensure p.time is a valid value for conversion
      if (p.time === undefined || p.time === null || (typeof p.time === 'number' && isNaN(p.time))) {
        return null;
      }

      const renderTime = toRenderTime(p.time);
      
      // lightweight-charts timeToCoordinate can crash if passed undefined or certain invalid objects
      if (renderTime === undefined || renderTime === null || (typeof renderTime === 'number' && !Number.isFinite(renderTime))) {
        return null;
      }

      const x = timeScale.timeToCoordinate(renderTime as Time);

      if (x !== null && y !== null) return { x: x as Coordinate, y: y as Coordinate };

      if (y !== null && data && data.length > 0) {
        const lastIndex = data.length - 1;
        const lastCandleTime = toRenderTime(Number(data[lastIndex].time));
        const firstCandleTime = toRenderTime(Number(data[0].time));
        
        if (!Number.isFinite(lastCandleTime) || !Number.isFinite(firstCandleTime)) return null;

        let logical: number | null = null;
        const numRenderTime = Number(renderTime);
        
        if (numRenderTime > lastCandleTime) {
          logical = lastIndex + (numRenderTime - lastCandleTime) / timeInterval;
        } else if (numRenderTime < firstCandleTime) {
          logical = (numRenderTime - firstCandleTime) / timeInterval;
        }

        if (logical !== null && Number.isFinite(logical)) {
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
      if (time !== null) {
        let numTime: number;
        if (typeof time === 'object' && time !== null) {
          // If it's a BusinessDay, we don't have a direct numeric conversion in this utility.
          // In Paper-Pro-Market we rely on timestamps. Return null to avoid corrupting the store with NaN.
          return null;
        } else {
          numTime = Number(time);
        }
        if (Number.isFinite(numTime)) {
          return { time: toRawTime(numTime), price };
        }
      }

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
