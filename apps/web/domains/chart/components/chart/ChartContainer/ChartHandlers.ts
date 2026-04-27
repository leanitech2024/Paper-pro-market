import { useCallback } from 'react';
import { IChartApi } from 'lightweight-charts';
import { useAnalysisStore } from '@/domains/chart/stores/analysis.store';
import { useMarketStore } from '@/domains/market/stores/market.store';

export function useChartHandlers(symbol: string, chartApi: IChartApi | null, resolvedInstrumentKey: string) {
  const handleUndo = () => useAnalysisStore.getState().undoDrawing(symbol);
  const handleRedo = () => useAnalysisStore.getState().redoDrawing(symbol);
  
  const handleScreenshot = () => {
    if (chartApi) {
        const canvas = chartApi.takeScreenshot();
        const url = canvas.toDataURL();
        const a = document.createElement('a');
        a.href = url;
        a.download = `${symbol}_chart_${Date.now()}.png`;
        a.click();
    }
  };

  const handleMaximize = () => {
    useAnalysisStore.getState().setAnalysisMode(true);
  };

  const historicalData = useMarketStore(state => state.historicalData);
  const range = useAnalysisStore(state => state.range);
  const fetchMoreHistory = useMarketStore(state => state.fetchMoreHistory);

  const handleLoadMore = useCallback(async () => {
    if (historicalData.length === 0) return;
    
    const firstCandle = historicalData[0];
    const currentRange = String(range || '').toUpperCase();
    if (!currentRange) return;

    await fetchMoreHistory(symbol, currentRange, firstCandle.time as number, resolvedInstrumentKey);
  }, [historicalData, symbol, range, fetchMoreHistory, resolvedInstrumentKey]);

  return {
    handleUndo,
    handleRedo,
    handleScreenshot,
    handleMaximize,
    handleLoadMore
  };
}
