"use client";

import { useAnalysisStore } from '@/domains/chart/stores/analysis.store';
import { ChartStyle } from '@/domains/chart/stores/analysis.store';
import { MobileHeader } from './MobileHeader';
import { DesktopHeader } from './DesktopHeader';
import { useChartHeader } from './hooks';

export interface ChartHeaderProps {
  symbol: string;
  displaySymbol?: string;
  chartStyle?: ChartStyle;
  compact?: boolean;
  isInstantOrderActive: boolean;
  onToggleInstantOrder: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onScreenshot?: () => void;
  onMaximize?: () => void;
  onSearchClick?: () => void;
  onChartStyleChange?: (style: ChartStyle) => void;
  isLoading?: boolean;
  isFullscreen?: boolean;
}

export function ChartHeader({
  symbol,
  displaySymbol,
  chartStyle = "CANDLE",
  compact = false,
  isInstantOrderActive: _isInstantOrderActive,
  onToggleInstantOrder: _onToggleInstantOrder,
  onUndo,
  onRedo,
  onScreenshot,
  onMaximize,
  onSearchClick,
  onChartStyleChange,
  isLoading = false,
  isFullscreen = false,
}: ChartHeaderProps) {
  const {
    range,
    setRange,
    timeframe,
    setTimeframe,
    activeTool,
    setActiveTool,
    clearAllDrawings,
  } = useAnalysisStore();
  
  const headerText = displaySymbol || symbol;
  
  const {
    styleSearch,
    setStyleSearch,
    effectiveTimeframe,
    activeTimeframeLabel,
    filteredStyleGroups
  } = useChartHeader(range, timeframe);

  return (
    <>
      <MobileHeader
        symbol={symbol}
        headerText={headerText}
        chartStyle={chartStyle}
        isLoading={isLoading}
        range={range}
        effectiveTimeframe={effectiveTimeframe}
        styleSearch={styleSearch}
        filteredStyleGroups={filteredStyleGroups}
        activeTool={activeTool}
        setRange={setRange}
        setTimeframe={setTimeframe}
        setStyleSearch={setStyleSearch}
        setActiveTool={(tool) => setActiveTool(tool as any)}
        clearAllDrawings={clearAllDrawings}
        onSearchClick={onSearchClick}
        onChartStyleChange={onChartStyleChange}
      />
      <DesktopHeader
        symbol={symbol}
        headerText={headerText}
        chartStyle={chartStyle}
        compact={compact}
        isLoading={isLoading}
        isFullscreen={isFullscreen}
        range={range}
        effectiveTimeframe={effectiveTimeframe}
        activeTimeframeLabel={activeTimeframeLabel}
        styleSearch={styleSearch}
        filteredStyleGroups={filteredStyleGroups}
        setRange={setRange}
        setTimeframe={setTimeframe}
        setStyleSearch={setStyleSearch}
        onSearchClick={onSearchClick}
        onChartStyleChange={onChartStyleChange}
        onUndo={onUndo}
        onRedo={onRedo}
        onScreenshot={onScreenshot}
        onMaximize={onMaximize}
      />
    </>
  );
}
