import { useState } from 'react';
import { useMarketStore } from '@/domains/market/stores/market.store';

export function useChartTradingPanelData() {
  const { historicalData, livePrice } = useMarketStore();
  const [qty, setQty] = useState(1);

  // Mock OHLC or get from last candle
  const lastCandle = historicalData.length > 0 ? historicalData[historicalData.length - 1] : null;

  const change = lastCandle ? (lastCandle.close - lastCandle.open) : 0;
  const changePct = lastCandle ? ((change / lastCandle.open) * 100) : 0;
  const colorClass = change >= 0 ? 'text-[#089981]' : 'text-[#F23645]';

  return {
    livePrice,
    qty,
    setQty,
    lastCandle,
    change,
    changePct,
    colorClass
  };
}
