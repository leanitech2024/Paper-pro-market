import { useCallback } from 'react';
import type { IChartApi, ISeriesApi, Time, Logical, CandlestickData, Coordinate } from 'lightweight-charts';
import type { Point } from '@/stores/trading/analysis.store';

export function useChartCoordinates(
  chart: IChartApi | null,
  mainSeries: ISeriesApi<'Candlestick'> | null,
  data: CandlestickData[]
) {
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
        const interval =
          data.length > 1 ? (data[1].time as number) - (data[0].time as number) : 300;

        let logical: number | null = null;
        if ((p.time as number) > (lastCandle.time as number)) {
          logical = lastIndex + ((p.time as number) - (lastCandle.time as number)) / interval;
        } else if ((p.time as number) < (firstCandle.time as number)) {
          logical = ((p.time as number) - (firstCandle.time as number)) / interval;
        }

        if (logical !== null) {
          const projectedX = timeScale.logicalToCoordinate(logical as Logical);
          if (projectedX !== null) return { x: projectedX as Coordinate, y: y as Coordinate };
        }
      }
      return null;
    },
    [chart, mainSeries, data]
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

      const interval =
        data.length > 1 ? (data[1].time as number) - (data[0].time as number) : 300;

      if (logical > lastIndex) {
        return {
          time: (data[lastIndex].time as number) + Math.round(logical - lastIndex) * interval,
          price,
        };
      }
      if (logical < 0) {
        return { time: (data[0].time as number) + Math.round(logical) * interval, price };
      }
      return null;
    },
    [chart, mainSeries, data]
  );

  return { pointToCoords, coordsToPoint };
}
