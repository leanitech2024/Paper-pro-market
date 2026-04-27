import { IndicatorConfig, Drawing } from '@/domains/chart/stores/analysis.store';

export const INITIAL_VISIBLE_BARS_BY_RANGE: Record<string, number> = {
  '1D': 220,
  '5D': 420,
  '1M': 300,
  '3M': 460,
  '6M': 180,
  '1Y': 300,
  '3Y': 190,
  '5Y': 280,
};

export const INITIAL_VISIBLE_BARS_BY_TIMEFRAME: Record<string, number> = {
  '1m': 220, '3m': 220, '5m': 220, '10m': 220, '15m': 220,
  '30m': 180, '1h': 180, '2h': 160, '3h': 140, '4h': 140,
  '1d': 200, '1w': 160, '1mo': 120,
};

export const ONE_DAY_VISIBLE_FALLBACK_BARS = 220;
export const ONE_DAY_TARGET_MULTIPLIER = 1.2;
export const ONE_DAY_WARMUP_MAX_PAGES = 2;

export const EMPTY_INDICATORS: IndicatorConfig[] = [];
export const EMPTY_DRAWINGS: Drawing[] = [];
