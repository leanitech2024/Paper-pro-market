"use client";
import { useState, useRef } from 'react';
import { IChartApi } from 'lightweight-charts';
import { useAnalysisStore } from '@/domains/chart/stores/analysis.store';
import { useMarketStore } from '@/domains/market/stores/market.store';
import { useTradeViewport } from '@/domains/trading/hooks/use-trade-viewport';

import { useChartData, useChartHoverInfo } from './ChartHooks';
import { 
  useIntersectionObserverEffect, 
  useSimulationLifecycleEffect, 
  useHistoryLifecycleEffect,
  useLivePriceSyncEffect,
  useIndicatorComputationEffect,
  useChartFramingEffect,
  useWarmupEffect,
  useChartHotkeysEffect
} from './ChartEffects';
import { useChartHandlers } from './ChartHandlers';

import { ChartLayout } from './ChartLayout';
import { ChartArea } from './ChartArea';

interface ChartContainerProps {
  symbol: string;
  headerSymbol?: string;
  instrumentKey?: string;
  onSearchClick?: () => void;
}

export function ChartContainer({ symbol, headerSymbol, instrumentKey, onSearchClick }: ChartContainerProps) {
  const { isMobile } = useTradeViewport();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isChartVisible, setIsChartVisible] = useState(false);
  const [showTradingPanel, setShowTradingPanel] = useState(false);
  const [chartApi, setChartApi] = useState<IChartApi | null>(null);
  const [computedIndicators, setComputedIndicators] = useState<any[]>([]);

  const {
    isAnalysisMode,
    setAnalysisMode,
    activeTool,
    timeframe,
    range,
    setChartStyleForSymbol,
    updateIndicator,
    removeIndicator,
  } = useAnalysisStore();

  const {
    historicalData,
    volumeData,
    isFetchingHistory,
    isInitialLoad,
    hasMoreHistory,
    currentRequestId,
    simulatedSymbol,
  } = useMarketStore();

  const {
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
  } = useChartData(symbol, instrumentKey);

  useIntersectionObserverEffect(containerRef, setIsChartVisible);
  useSimulationLifecycleEffect(symbol);
  
  useHistoryLifecycleEffect(
    isChartVisible, 
    symbol, 
    timeframe, 
    range, 
    canonicalSymbol, 
    resolvedInstrumentKey
  );

  useLivePriceSyncEffect(
    resolvedInstrumentKey, 
    selectedQuote?.price, 
    selectedStockSnapshot?.price
  );

  useIndicatorComputationEffect(
    historicalData,
    overlayIndicators,
    symbol,
    resolvedInstrumentKey,
    setComputedIndicators
  );

  const activeRangeKey = String(range || '').toUpperCase();
  const activeTimeframeKey = String(timeframe || '1m').toLowerCase();

  const { frameChartToLatest } = useChartFramingEffect(
    chartApi,
    historicalData.length,
    currentRequestId,
    activeRangeKey,
    activeTimeframeKey
  );

  useWarmupEffect(
    chartApi,
    historicalData.length,
    currentRequestId,
    range,
    symbol,
    resolvedInstrumentKey,
    canonicalSymbol,
    isFetchingHistory,
    isInitialLoad,
    hasMoreHistory,
    simulatedSymbol,
    frameChartToLatest
  );

  useChartHotkeysEffect(symbol);

  const {
    hoveredCandle,
    setHoveredCandle,
    legendData
  } = useChartHoverInfo(historicalData, showVolume, volumeData);

  const {
    handleUndo,
    handleRedo,
    handleScreenshot,
    handleMaximize,
    handleLoadMore
  } = useChartHandlers(symbol, chartApi, resolvedInstrumentKey);

  const shouldShowInitialLoader = historicalData.length === 0 && (isFetchingHistory || isInitialLoad);
  const shouldShowNoDataState = historicalData.length === 0 && !isFetchingHistory && !isInitialLoad;

  const chartProps = {
    data: historicalData,
    volumeData: volumeData,
    indicators: computedIndicators,
    drawings,
    activeTool,
    chartStyle,
    showVolume,
  };

  const legendUpColor = chartStyle === "HEIKIN_ASHI" ? "#22C55E" : "#089981";
  const legendDownColor = chartStyle === "HEIKIN_ASHI" ? "#EF4444" : "#F23645";

  return (
    <div ref={containerRef} className="relative h-full w-full min-w-0 group">
      <ChartLayout
        isAnalysisMode={isAnalysisMode}
        symbol={symbol}
        headerSymbol={headerSymbol}
        chartStyle={chartStyle}
        isMobile={isMobile}
        showTradingPanel={showTradingPanel}
        setShowTradingPanel={setShowTradingPanel}
        shouldShowInitialLoader={shouldShowInitialLoader}
        onSearchClick={onSearchClick}
        setChartStyleForSymbol={setChartStyleForSymbol}
        setAnalysisMode={setAnalysisMode}
        handleUndo={handleUndo}
        handleRedo={handleRedo}
        handleScreenshot={handleScreenshot}
        handleMaximize={handleMaximize}
      >
        <ChartArea
          symbol={symbol}
          headerSymbol={headerSymbol}
          instrumentKey={resolvedInstrumentKey}
          range={range}
          isMobile={isMobile}
          showTradingPanel={showTradingPanel}
          shouldShowInitialLoader={shouldShowInitialLoader}
          shouldShowNoDataState={shouldShowNoDataState}
          historicalData={historicalData}
          chartProps={chartProps}
          setChartApi={setChartApi}
          handleLoadMore={handleLoadMore}
          setHoveredCandle={setHoveredCandle}
          legendData={legendData}
          legendUpColor={legendUpColor}
          legendDownColor={legendDownColor}
          visibleIndicators={visibleIndicators}
          indicators={indicators}
          updateIndicator={updateIndicator}
          removeIndicator={removeIndicator}
        />
      </ChartLayout>
    </div>
  );
}
