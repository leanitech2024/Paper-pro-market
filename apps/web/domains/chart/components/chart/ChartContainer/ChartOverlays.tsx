import { ChartOverlayLegend } from '@/domains/chart/components/chart/ChartOverlayLegend';

interface ChartOverlaysProps {
  symbol: string;
  legendData: any;
  legendUpColor: string;
  legendDownColor: string;
  visibleIndicators: any[];
  indicators: any[];
  updateIndicator: (symbol: string, id: string, payload: any) => void;
  removeIndicator: (symbol: string, id: string) => void;
}

export function ChartOverlays({
  symbol,
  legendData,
  legendUpColor,
  legendDownColor,
  visibleIndicators,
  indicators,
  updateIndicator,
  removeIndicator
}: ChartOverlaysProps) {
  return (
    <ChartOverlayLegend
      symbol={symbol}
      data={legendData}
      upColor={legendUpColor}
      downColor={legendDownColor}
      indicators={visibleIndicators.map((indicator) => ({
        id: indicator.id,
        label: indicator.type,
        color: indicator.display.color,
        visible: indicator.display.visible,
      }))}
      onToggleIndicatorVisibility={(id) => {
        const target = indicators.find((indicator) => indicator.id === id);
        if (!target) return;
        updateIndicator(symbol, id, {
          display: {
            ...target.display,
            visible: !target.display.visible,
          },
        });
      }}
      onRemoveIndicator={(id) => removeIndicator(symbol, id)}
    />
  );
}
