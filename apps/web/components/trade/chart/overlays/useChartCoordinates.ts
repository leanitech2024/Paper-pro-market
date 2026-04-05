import { useCallback, useMemo } from 'react';
import type { IChartApi, ISeriesApi, Time, Logical, CandlestickData, Coordinate } from 'lightweight-charts';
import type { Point } from '@/stores/trading/analysis.store';

export function useChartCoordinates(
  chart: IChartApi | null,
  mainSeries: ISeriesApi<'Candlestick'> | null,
  data: CandlestickData[]
) {
  const timeInterval = useMemo(() => {
    if (data.length > 1) {
      const first = Number(data[0].time);
      const second = Number(data[1].time);
      const interval = Math.abs(second - first);
      if (Number.isFinite(interval) && interval > 0) return interval;
    }
    return 300;
  }, [data]);

  const priceStep = 0.01;

  const pointToCoords = useCallback(
    (p: Point) => {
      if (!chart || !mainSeries) return null;
      const timeScale = chart.timeScale();
      const y = mainSeries.priceToCoordinate(p.price);
      const x = timeScale.timeToCoordinate(p.time as Time);

      if (x !== null && y !== null) return { x: x as Coordinate, y: y as Coordinate };

      if (y !== null && data && data.length > 0) {
        const lastIndex = data.length - 1;
        const lastCandle = data[lastIndex];
        const firstCandle = data[0];
        let logical: number | null = null;
        if ((p.time as number) > (lastCandle.time as number)) {
          logical = lastIndex + ((p.time as number) - (lastCandle.time as number)) / timeInterval;
        } else if ((p.time as number) < (firstCandle.time as number)) {
          logical = ((p.time as number) - (firstCandle.time as number)) / timeInterval;
        }

        if (logical !== null) {
          const projectedX = timeScale.logicalToCoordinate(logical as Logical);
          if (projectedX !== null) return { x: projectedX as Coordinate, y: y as Coordinate };
        }
      }
      return null;
    },
    [chart, mainSeries, data, timeInterval]
  );

  const coordsToPoint = useCallback(
    (x: number, y: number): Point | null => {
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

      if (logical > lastIndex) {
        return {
          time: (data[lastIndex].time as number) + Math.round(logical - lastIndex) * timeInterval,
          price,
        };
      }
      if (logical < 0) {
        return { time: (data[0].time as number) + Math.round(logical) * timeInterval, price };
      }
      return null;
    },
    [chart, mainSeries, data, timeInterval]
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
