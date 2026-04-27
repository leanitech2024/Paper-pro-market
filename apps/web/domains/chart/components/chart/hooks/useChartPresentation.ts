import { useEffect, type MutableRefObject } from 'react';
import { LineType, type IChartApi, type ISeriesApi } from 'lightweight-charts';
import type { ChartStyle } from '@/domains/chart/stores/analysis.store';
import {
  CANDLE_TOP_MARGIN_WITH_VOLUME,
  CANDLE_BOTTOM_MARGIN_WITH_VOLUME,
  CANDLE_TOP_MARGIN_FULL,
  CANDLE_BOTTOM_MARGIN_FULL,
} from '../constants/chart.constants';

type UseChartPresentationArgs = {
  chart: IChartApi | null;
  candleSeriesRef: MutableRefObject<ISeriesApi<'Candlestick'> | null>;
  barSeriesRef: MutableRefObject<ISeriesApi<'Bar'> | null>;
  lineSeriesRef: MutableRefObject<ISeriesApi<'Line'> | null>;
  areaSeriesRef: MutableRefObject<ISeriesApi<'Area'> | null>;
  baselineSeriesRef: MutableRefObject<ISeriesApi<'Baseline'> | null>;
  columnSeriesRef: MutableRefObject<ISeriesApi<'Histogram'> | null>;
  volumeSeriesRef: MutableRefObject<ISeriesApi<'Histogram'> | null>;
  hasMacd: boolean;
  showVolume: boolean;
  chartStyle: ChartStyle;
};

export const useChartPresentation = ({
  chart,
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
}: UseChartPresentationArgs) => {
  useEffect(() => {
    if (!chart || !candleSeriesRef.current) return;

    const topWithVolume = CANDLE_TOP_MARGIN_WITH_VOLUME;
    const bottomWithVolume = CANDLE_BOTTOM_MARGIN_WITH_VOLUME;
    if (hasMacd) {
      candleSeriesRef.current.priceScale().applyOptions({
        scaleMargins: {
          top: showVolume ? topWithVolume : CANDLE_TOP_MARGIN_FULL,
          bottom: showVolume ? bottomWithVolume : CANDLE_BOTTOM_MARGIN_FULL,
        },
      });
    } else {
      candleSeriesRef.current.priceScale().applyOptions({
        scaleMargins: {
          top: showVolume ? topWithVolume : CANDLE_TOP_MARGIN_FULL,
          bottom: showVolume ? bottomWithVolume : CANDLE_BOTTOM_MARGIN_FULL,
        },
      });
    }
  }, [chart, candleSeriesRef, hasMacd, showVolume]);

  useEffect(() => {
    const candleSeries = candleSeriesRef.current;
    const barSeries = barSeriesRef.current;
    const lineSeries = lineSeriesRef.current;
    const areaSeries = areaSeriesRef.current;
    const baselineSeries = baselineSeriesRef.current;
    const columnSeries = columnSeriesRef.current;
    const volumeSeries = volumeSeriesRef.current;
    if (!candleSeries || !barSeries || !lineSeries || !areaSeries || !baselineSeries || !columnSeries) return;

    const isCandleMode =
      chartStyle === 'CANDLE' ||
      chartStyle === 'HEIKIN_ASHI' ||
      chartStyle === 'HOLLOW_CANDLES' ||
      chartStyle === 'VOLUME_CANDLES';
    candleSeries.applyOptions({
      visible: isCandleMode,
      upColor: chartStyle === 'HOLLOW_CANDLES' ? 'rgba(0, 0, 0, 0)' : chartStyle === 'HEIKIN_ASHI' ? '#22C55E' : '#089981',
      downColor: chartStyle === 'HEIKIN_ASHI' ? '#EF4444' : '#F23645',
      borderUpColor: chartStyle === 'HEIKIN_ASHI' ? '#22C55E' : '#089981',
      borderDownColor: chartStyle === 'HEIKIN_ASHI' ? '#EF4444' : '#F23645',
      wickUpColor: chartStyle === 'HEIKIN_ASHI' ? '#22C55E' : '#089981',
      wickDownColor: chartStyle === 'HEIKIN_ASHI' ? '#EF4444' : '#F23645',
    });

    barSeries.applyOptions({
      visible: chartStyle === 'BARS' || chartStyle === 'HIGH_LOW',
      openVisible: chartStyle !== 'HIGH_LOW',
      thinBars: chartStyle === 'HIGH_LOW',
      upColor: '#089981',
      downColor: '#F23645',
    });

    lineSeries.applyOptions({
      visible: chartStyle === 'LINE' || chartStyle === 'LINE_WITH_MARKERS' || chartStyle === 'STEP_LINE',
      pointMarkersVisible: chartStyle === 'LINE_WITH_MARKERS',
      lineType: chartStyle === 'STEP_LINE' ? LineType.WithSteps : LineType.Simple,
    });

    areaSeries.applyOptions({
      visible: chartStyle === 'AREA' || chartStyle === 'HLC_AREA',
    });

    baselineSeries.applyOptions({
      visible: chartStyle === 'BASELINE',
    });

    columnSeries.applyOptions({
      visible: chartStyle === 'COLUMNS',
    });

    if (volumeSeries) {
      volumeSeries.applyOptions({
        visible: showVolume,
      });
    }
  }, [chartStyle, showVolume, candleSeriesRef, barSeriesRef, lineSeriesRef, areaSeriesRef, baselineSeriesRef, columnSeriesRef, volumeSeriesRef]);
};
