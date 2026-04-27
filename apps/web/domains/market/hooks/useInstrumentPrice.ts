import { useMarketStore } from '@/domains/market/stores/market.store';
import { Stock } from '@paper-market/core';

export function useInstrumentPrice(selectedStock: Stock | null, instrumentType: string = '') {
  const liveTokenPrice = useMarketStore((state) => {
    const token = selectedStock?.instrumentToken;
    if (!token) return 0;
    const price = Number(state.quotesByInstrument[token]?.price);
    return Number.isFinite(price) && price > 0 ? price : 0;
  });

  const liveSymbolPrice = useMarketStore((state) => {
    const symbol = selectedStock?.symbol;
    if (!symbol) return 0;
    const price = Number(state.selectPrice(symbol));
    return Number.isFinite(price) && price > 0 ? price : 0;
  });

  const liveUnderlyingPrice = useMarketStore((state) => {
    if (!instrumentType) return 0;
    const price = Number(state.selectPrice(instrumentType));
    return Number.isFinite(price) && price > 0 ? price : 0;
  });

  const fallbackPrice = selectedStock?.price || 0;

  return liveTokenPrice || liveSymbolPrice || liveUnderlyingPrice || fallbackPrice;
}
