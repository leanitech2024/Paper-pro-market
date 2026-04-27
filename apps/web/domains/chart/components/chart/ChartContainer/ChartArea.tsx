import React from 'react';
import { ChartTradingPanel } from '@/domains/chart/components/chart/ChartTradingPanel';
import { ChartLoadingIndicator } from '@/domains/chart/components/chart/ChartLoadingIndicator';
import { ChartOverlays } from './ChartOverlays';
import dynamic from 'next/dynamic';

const BaseChart = dynamic(() => import('../BaseChart').then(mod => mod.BaseChart), { ssr: false });

interface ChartAreaProps {
  symbol: string;
  headerSymbol?: string;
  instrumentKey: string;
  range: string | undefined;
  isMobile: boolean;
  showTradingPanel: boolean;
  shouldShowInitialLoader: boolean;
  shouldShowNoDataState: boolean;
  historicalData: any[];
  chartProps: any;
  setChartApi: (api: any) => void;
  handleLoadMore: () => void;
  setHoveredCandle: (candle: any) => void;
  
  legendData: any;
  legendUpColor: string;
  legendDownColor: string;
  visibleIndicators: any[];
  indicators: any[];
  updateIndicator: (symbol: string, id: string, payload: any) => void;
  removeIndicator: (symbol: string, id: string) => void;
}

export function ChartArea({
  symbol,
  headerSymbol,
  instrumentKey,
  range,
  isMobile,
  showTradingPanel,
  shouldShowInitialLoader,
  shouldShowNoDataState,
  historicalData,
  chartProps,
  setChartApi,
  handleLoadMore,
  setHoveredCandle,
  
  legendData,
  legendUpColor,
  legendDownColor,
  visibleIndicators,
  indicators,
  updateIndicator,
  removeIndicator,
}: ChartAreaProps) {
  return (
    <div className="relative flex-1 h-full bg-transparent flex flex-col min-w-0">
      {showTradingPanel && <ChartTradingPanel symbol={symbol} />}

      <div className="flex-1 w-full min-h-0 relative">
        {shouldShowInitialLoader && (
          <div className="absolute inset-0 z-50 bg-background/50 flex items-center justify-center">
            <ChartLoadingIndicator />
          </div>
        )}

        {shouldShowNoDataState && (
          <div className="absolute inset-0 z-40 flex items-center justify-center text-muted-foreground bg-background/50">
            No historical data available for {symbol}
          </div>
        )}

        {historicalData.length > 0 && (
          <>
            <BaseChart
              {...chartProps}
              symbol={symbol}
              instrumentKey={instrumentKey}
              range={range}
              isMobile={isMobile}
              onChartReady={setChartApi}
              onLoadMore={handleLoadMore}
              onHoverCandleChange={(candle: any) => {
                if (!candle) {
                  setHoveredCandle(null);
                  return;
                }
                setHoveredCandle({
                  time: Number(candle.time as number),
                  open: Number((candle as any).open),
                  high: Number((candle as any).high),
                  low: Number((candle as any).low),
                  close: Number((candle as any).close),
                });
              }}
            />
            
            <ChartOverlays
              symbol={headerSymbol || symbol}
              legendData={legendData}
              legendUpColor={legendUpColor}
              legendDownColor={legendDownColor}
              visibleIndicators={visibleIndicators}
              indicators={indicators}
              updateIndicator={updateIndicator}
              removeIndicator={removeIndicator}
            />
          </>
        )}
      </div>
    </div>
  );
}
