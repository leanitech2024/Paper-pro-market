import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { IChartApi } from 'lightweight-charts';

type Dimensions = { width: number; height: number };

type UseChartResizeArgs = {
  autoResize: boolean;
  chart: IChartApi | null;
  chartContainerRef: MutableRefObject<HTMLDivElement | null>;
  chartInstance: IChartApi | null;
  height?: number;
  setDimensions: Dispatch<SetStateAction<Dimensions>>;
};

export const useChartResize = ({
  autoResize,
  chart,
  chartContainerRef,
  chartInstance,
  height,
  setDimensions,
}: UseChartResizeArgs) => {
  useEffect(() => {
    if (!autoResize || !chartContainerRef.current || !chart) return;

    const resizeObserver = new ResizeObserver(() => {
      const container = chartContainerRef.current;
      if (!container) return;

      requestAnimationFrame(() => {
        if (!chartContainerRef.current) return;
        const width = container.clientWidth;
        const nextHeight = container.clientHeight || height || 400;

        if (width === 0 || nextHeight === 0) return;

        chart.applyOptions({ width, height: nextHeight });
        setDimensions({ width, height: nextHeight });
      });
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => resizeObserver.disconnect();
  }, [autoResize, chartContainerRef, chart, chartInstance, setDimensions, height]);

  useEffect(() => {
    if (typeof height === 'number' && height > 0 && chart) {
      chart.applyOptions({ height });
      setDimensions((d) => ({ ...d, height }));
    }
  }, [height, chart, setDimensions]);
};
