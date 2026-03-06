import { useEffect, type MutableRefObject } from 'react';
import { HistogramSeries, LineSeries, type IChartApi, type ISeriesApi } from 'lightweight-charts';
import type { ChartIndicatorInput, TimeMapRef } from '../types/chart.types';

type UseIndicatorsArgs = {
  chart: IChartApi | null;
  indicators: ChartIndicatorInput[];
  indicatorSeriesRefs: MutableRefObject<Map<string, ISeriesApi<any>[]>>;
  rawToRenderTimeRef: TimeMapRef;
};

/** Map indicator points from raw candle time to chart render time so they align with candlesticks. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapToRenderTime(rows: any[], rawToRenderTimeRef: TimeMapRef): any[] {
  if (!rows?.length) return rows;
  const map = rawToRenderTimeRef.current;
  return rows.map((row) => {
    const raw = Number(row.time);
    const render = Number.isFinite(raw) ? (map.get(raw) ?? raw) : raw;
    return { ...row, time: render };
  });
}

export const useIndicators = ({ chart, indicators, indicatorSeriesRefs, rawToRenderTimeRef }: UseIndicatorsArgs) => {
  useEffect(() => {
    if (!chart) return;

    const currentIds = new Set(indicators.map((i) => i.config.id));

    indicatorSeriesRefs.current.forEach((seriesArray, id) => {
      if (!currentIds.has(id)) {
        seriesArray.forEach((s) => chart.removeSeries(s));
        indicatorSeriesRefs.current.delete(id);
      }
    });

    indicators.forEach(({ config, data, series }) => {
      const existing = indicatorSeriesRefs.current.get(config.id);
      const mapTime = (arr: { time: number }[]) => mapToRenderTime(arr, rawToRenderTimeRef);

      if (config.type === 'MACD' && series) {
        const histogram = mapTime(series.histogram || []);
        const macd = mapTime(series.macd || []);
        const signal = mapTime(series.signal || []);
        if (!existing) {
          const paneId = 'MACD';

          const hist = chart.addSeries(HistogramSeries, {
            priceScaleId: paneId,
            color: config.seriesColors?.histogram || '#26a69a',
          });

          const macdLine = chart.addSeries(LineSeries, {
            priceScaleId: paneId,
            color: config.seriesColors?.macd || '#2962FF',
            lineWidth: 1,
            title: 'MACD',
          });

          const sigLine = chart.addSeries(LineSeries, {
            priceScaleId: paneId,
            color: config.seriesColors?.signal || '#FF6D00',
            lineWidth: 1,
            title: 'Signal',
          });

          chart.priceScale(paneId).applyOptions({
            scaleMargins: { top: 0.75, bottom: 0 },
          });

          indicatorSeriesRefs.current.set(config.id, [hist, macdLine, sigLine]);

          hist.setData(histogram);
          macdLine.setData(macd);
          sigLine.setData(signal);
        } else {
          const [hist, macdLine, sigLine] = existing;
          hist.setData(histogram);
          macdLine.setData(macd);
          sigLine.setData(signal);
        }
      } else if (config.type === 'BB' && series) {
        const upper = mapTime(series.upper || []);
        const lower = mapTime(series.lower || []);
        const middle = mapTime(series.middle || []);
        if (!existing) {
          const upperS = chart.addSeries(LineSeries, {
            color: config.display.color || '#2962FF',
            lineWidth: 1,
            title: 'BB Upper',
          });
          const lowerS = chart.addSeries(LineSeries, {
            color: config.display.color || '#2962FF',
            lineWidth: 1,
            title: 'BB Lower',
          });
          const middleS = chart.addSeries(LineSeries, {
            color: '#FF6D00',
            lineWidth: 1,
            title: 'BB Middle',
          });

          indicatorSeriesRefs.current.set(config.id, [upperS, lowerS, middleS]);

          if (series.upper) upperS.setData(upper);
          if (series.lower) lowerS.setData(lower);
          if (series.middle) middleS.setData(middle);
        } else {
          const [upperS, lowerS, middleS] = existing;
          if (series.upper) upperS.setData(upper);
          if (series.lower) lowerS.setData(lower);
          if (series.middle) middleS.setData(middle);
        }
      } else {
        const mappedData = mapToRenderTime(Array.isArray(data) ? data : [], rawToRenderTimeRef);
        if (!existing) {
          const s = chart.addSeries(LineSeries, {
            color: config.display.color,
            lineWidth: Math.max(1, Math.min(4, Number(config.display.lineWidth || 2))) as any,
            priceScaleId: config.type === 'RSI' ? 'RSI' : 'right',
            title: `${config.type} ${config.params?.period || ''}`.trim(),
          });

          if (config.type === 'RSI') {
            chart.priceScale('RSI').applyOptions({
              scaleMargins: { top: 0.8, bottom: 0.05 },
            });
          }

          indicatorSeriesRefs.current.set(config.id, [s]);
          s.setData(mappedData);
        } else {
          existing[0].setData(mappedData);
        }
      }
    });
  }, [chart, indicators, indicatorSeriesRefs, rawToRenderTimeRef]);
};
