import { ChartHeader } from '@/domains/chart/components/chart/ChartHeader';
import { ChartToolbar } from '../toolbar/ChartToolbar';
import { ChartStyle } from '@/domains/chart/stores/analysis.store';
import React from 'react';
import dynamic from 'next/dynamic';

const AnalysisOverlay = dynamic(() => import('@/domains/chart/components/analysis/AnalysisOverlay').then(mod => mod.AnalysisOverlay), { ssr: false });

interface ChartLayoutProps {
  isAnalysisMode: boolean;
  symbol: string;
  headerSymbol?: string;
  chartStyle: ChartStyle;
  isMobile: boolean;
  showTradingPanel: boolean;
  setShowTradingPanel: (show: boolean) => void;
  shouldShowInitialLoader: boolean;
  onSearchClick?: () => void;
  setChartStyleForSymbol: (symbol: string, style: ChartStyle) => void;
  setAnalysisMode: (mode: boolean) => void;
  handleUndo: () => void;
  handleRedo: () => void;
  handleScreenshot: () => void;
  handleMaximize: () => void;
  children: React.ReactNode;
}

export function ChartLayout({
  isAnalysisMode,
  symbol,
  headerSymbol,
  chartStyle,
  isMobile,
  showTradingPanel,
  setShowTradingPanel,
  shouldShowInitialLoader,
  onSearchClick,
  setChartStyleForSymbol,
  setAnalysisMode,
  handleUndo,
  handleRedo,
  handleScreenshot,
  handleMaximize,
  children
}: ChartLayoutProps) {
  const leftToolbar = <ChartToolbar symbol={symbol} />;
  
  const content = (
    <div className="relative flex h-full w-full min-w-0 flex-col">
      <ChartHeader
        symbol={symbol}
        displaySymbol={headerSymbol}
        chartStyle={chartStyle}
        compact={isMobile}
        isInstantOrderActive={showTradingPanel}
        onToggleInstantOrder={() => setShowTradingPanel(!showTradingPanel)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onScreenshot={handleScreenshot}
        onMaximize={isAnalysisMode ? () => setAnalysisMode(false) : handleMaximize}
        onSearchClick={onSearchClick}
        onChartStyleChange={(style) => setChartStyleForSymbol(symbol, style)}
        isLoading={shouldShowInitialLoader}
        isFullscreen={isAnalysisMode}
      />

      <div className="relative flex min-h-0 min-w-0 flex-1">
        {!isMobile && leftToolbar}
        {children}
      </div>
    </div>
  );

  if (isAnalysisMode) {
    return <AnalysisOverlay>{content}</AnalysisOverlay>;
  }

  return content;
}
