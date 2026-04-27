import { useMemo, useState } from 'react';
import { useMarketStore } from '@/domains/market/stores/market.store';
import { useAnalysisStore } from '@/domains/chart/stores/analysis.store';
import { symbolToIndexInstrumentKey, toCanonicalSymbol, toInstrumentKey } from '@paper-market/core';
import { EMPTY_INDICATORS, EMPTY_DRAWINGS } from './chart.constants';

export function useChartData(symbol: string, instrumentKey?: string) {
  const canonicalSymbol = toCanonicalSymbol(symbol);
  
  const stocksBySymbol = useMarketStore(state => state.stocksBySymbol);
  const quotesByInstrument = useMarketStore(state => state.quotesByInstrument);
  const selectQuote = useMarketStore(state => state.selectQuote);
  const selectedStockSnapshot = stocksBySymbol?.[canonicalSymbol];

  const resolvedInstrumentKey = useMemo(() => {
    if (instrumentKey) return toInstrumentKey(instrumentKey);
    const indexKey = symbolToIndexInstrumentKey(canonicalSymbol);
    if (indexKey) return indexKey;
    return toInstrumentKey(stocksBySymbol?.[canonicalSymbol]?.instrumentToken || canonicalSymbol);
  }, [instrumentKey, stocksBySymbol, canonicalSymbol]);

  const selectedQuote = useMemo(() => {
    const candidateKeys = [
      resolvedInstrumentKey,
      selectedStockSnapshot?.instrumentToken,
      canonicalSymbol,
      symbol,
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean);

    for (const raw of candidateKeys) {
      const normalized = toInstrumentKey(raw);
      const lookupKeys = new Set<string>([raw, normalized]);
      if (normalized) {
        lookupKeys.add(normalized.replace("|", ":"));
        lookupKeys.add(normalized.replace(":", "|"));
      }

      for (const key of lookupKeys) {
        const hit = quotesByInstrument[key];
        if (hit) return hit;
      }
    }

    return (
      selectQuote(resolvedInstrumentKey) ||
      selectQuote(selectedStockSnapshot?.instrumentToken || "") ||
      selectQuote(canonicalSymbol) ||
      null
    );
  }, [
    canonicalSymbol,
    quotesByInstrument,
    resolvedInstrumentKey,
    selectQuote,
    selectedStockSnapshot,
    symbol,
  ]);

  const globalHideState = useAnalysisStore(state => state.globalHideState);
  const indicators = useAnalysisStore(state => state.symbolState[symbol]?.indicators ?? EMPTY_INDICATORS);
  const drawings = useAnalysisStore(state => state.symbolState[symbol]?.drawings ?? EMPTY_DRAWINGS);
  const chartStyle = useAnalysisStore(
    state => state.chartStyleBySymbol[symbol] || state.symbolState[symbol]?.chartStyle || state.chartStyle
  );

  const visibleIndicators = useMemo(
    () => (globalHideState.indicators ? [] : indicators),
    [globalHideState.indicators, indicators],
  );

  const showVolume = useMemo(
    () =>
      !globalHideState.indicators &&
      visibleIndicators.some((indicator) => indicator.type === "VOL" && indicator.display?.visible !== false),
    [globalHideState.indicators, visibleIndicators],
  );

  const overlayIndicators = useMemo(
    () => visibleIndicators.filter((indicator) => indicator.type !== "VOL"),
    [visibleIndicators],
  );

  return {
    canonicalSymbol,
    resolvedInstrumentKey,
    selectedStockSnapshot,
    selectedQuote,
    indicators,
    drawings,
    chartStyle,
    visibleIndicators,
    showVolume,
    overlayIndicators
  };
}

export function useChartHoverInfo(historicalData: any[], showVolume: boolean, volumeData: any[]) {
  const [hoveredCandle, setHoveredCandle] = useState<{
    time?: number;
    open: number;
    high: number;
    low: number;
    close: number;
  } | null>(null);

  const latestCandle = useMemo(() => {
    if (!historicalData.length) return null;
    const last = historicalData[historicalData.length - 1] as any;
    return {
      time: Number(last.time),
      open: Number(last.open),
      high: Number(last.high),
      low: Number(last.low),
      close: Number(last.close),
      volume: showVolume ? Number(volumeData?.[volumeData.length - 1]?.value) : undefined,
    };
  }, [historicalData, showVolume, volumeData]);

  const legendData = hoveredCandle
    ? { ...hoveredCandle, volume: latestCandle?.volume }
    : latestCandle;

  return { hoveredCandle, setHoveredCandle, legendData };
}
