import {
  ATR, BollingerBands, EMA, MACD, RSI, SMA,
  Stochastic, StochasticRSI, CCI, WilliamsR, ROC, AwesomeOscillator,
  MFI, TRIX, KST, ADX, IchimokuCloud, PSAR, OBV, ForceIndex,
  KeltnerChannels,
} from "technicalindicators";
import type { IndicatorConfig } from "@/domains/chart/stores/analysis.store";
import { trackAnalysisEvent } from "@/domains/chart/lib/telemetry";
import { toDateKey } from "@paper-market/core";
import { clientLogger } from "@/lib/client-logger";

type CandleLike = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type ComputedIndicator = {
  config: IndicatorConfig;
  data: any[];
  series?: {
    macd?: any[];
    signal?: any[];
    histogram?: any[];
    middle?: any[];
    upper?: any[];
    lower?: any[];
    k?: any[];
    d?: any[];
    conversion?: any[];
    base?: any[];
    spanA?: any[];
    spanB?: any[];
    lagging?: any[];
    adx?: any[];
    pdi?: any[];
    mdi?: any[];
  };
};

type ComputeInput = {
  symbol: string;
  instrumentKey: string;
  candles: CandleLike[];
  indicators: IndicatorConfig[];
};

const CACHE_MAX_ENTRIES = 500;
const indicatorCache = new Map<string, ComputedIndicator>();

const toFinite = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const mapSimpleSeries = (values: number[], candles: CandleLike[], offset: number) =>
  values
    .map((value, index) => {
      const row = candles[index + offset];
      if (!row) return null;
      return { time: row.time, value: toFinite(value) };
    })
    .filter((item): item is { time: number; value: number } => Boolean(item));

const getParam = (indicator: IndicatorConfig, key: string, fallback: number) =>
  toFinite(indicator.params?.[key], fallback);

function cacheKey(input: ComputeInput, indicator: IndicatorConfig): string {
  const firstTime = input.candles[0]?.time ?? 0;
  const last = input.candles[input.candles.length - 1];
  const lastTime = last?.time ?? 0;
  const lastClose = last?.close ?? 0;
  return [
    input.instrumentKey || input.symbol,
    indicator.id,
    indicator.type,
    input.candles.length,
    firstTime,
    lastTime,
    lastClose,
    JSON.stringify(indicator.params || {}),
    JSON.stringify(indicator.display || {}),
  ].join("|");
}

function setCache(key: string, value: ComputedIndicator) {
  indicatorCache.set(key, value);
  if (indicatorCache.size > CACHE_MAX_ENTRIES) {
    const firstKey = indicatorCache.keys().next().value;
    if (firstKey) indicatorCache.delete(firstKey);
  }
}

function computeVwap(candles: CandleLike[]) {
  let cumulativePV = 0;
  let cumulativeVolume = 0;
  let sessionKey = "";
  const out: Array<{ time: number; value: number }> = [];

  for (const candle of candles) {
    const dayKey = toDateKey(candle.time);
    if (dayKey !== sessionKey) {
      sessionKey = dayKey;
      cumulativePV = 0;
      cumulativeVolume = 0;
    }
    const typical = (candle.high + candle.low + candle.close) / 3;
    const volume = Math.max(1, toFinite(candle.volume, 1));
    cumulativePV += typical * volume;
    cumulativeVolume += volume;
    out.push({
      time: candle.time,
      value: cumulativeVolume > 0 ? cumulativePV / cumulativeVolume : candle.close,
    });
  }
  return out;
}

function computeSupertrend(candles: CandleLike[], period: number, multiplier: number) {
  if (candles.length < period + 2) return [];
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const closes = candles.map((c) => c.close);
  const atr = ATR.calculate({ period, high: highs, low: lows, close: closes });
  if (atr.length === 0) return [];

  const offset = candles.length - atr.length;
  let prevFinalUpper = 0;
  let prevFinalLower = 0;
  let prevTrendUp = true;
  const out: Array<{ time: number; value: number }> = [];

  for (let i = offset; i < candles.length; i++) {
    const atrValue = atr[i - offset];
    if (!Number.isFinite(atrValue)) continue;
    const candle = candles[i];
    const hl2 = (candle.high + candle.low) / 2;
    const basicUpper = hl2 + multiplier * atrValue;
    const basicLower = hl2 - multiplier * atrValue;
    const prevClose = i > 0 ? candles[i - 1].close : candle.close;
    const finalUpper = i === offset || basicUpper < prevFinalUpper || prevClose > prevFinalUpper ? basicUpper : prevFinalUpper;
    const finalLower = i === offset || basicLower > prevFinalLower || prevClose < prevFinalLower ? basicLower : prevFinalLower;
    const trendUp: boolean =
      i === offset
        ? candle.close >= finalLower
        : (prevTrendUp ? candle.close >= finalLower : candle.close > finalUpper);
    out.push({ time: candle.time, value: trendUp ? finalLower : finalUpper });
    prevFinalUpper = finalUpper;
    prevFinalLower = finalLower;
    prevTrendUp = trendUp;
  }
  return out;
}

function computePivotPoints(candles: CandleLike[]) {
  if (candles.length === 0) return [];
  const out: Array<{ time: number; value: number }> = [];
  let prevHigh = candles[0].high;
  let prevLow = candles[0].low;
  let prevClose = candles[0].close;
  let sessionKey = toDateKey(candles[0].time);

  for (const candle of candles) {
    const dayKey = toDateKey(candle.time);
    if (dayKey !== sessionKey) {
      sessionKey = dayKey;
      prevHigh = candle.high;
      prevLow = candle.low;
      prevClose = candle.close;
    }
    out.push({ time: candle.time, value: (prevHigh + prevLow + prevClose) / 3 });
    prevHigh = Math.max(prevHigh, candle.high);
    prevLow = Math.min(prevLow, candle.low);
    prevClose = candle.close;
  }
  return out;
}

// â”€â”€â”€ Main compute dispatcher â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function computeSingle(input: ComputeInput, indicator: IndicatorConfig): ComputedIndicator {
  const key = cacheKey(input, indicator);
  const cached = indicatorCache.get(key);
  if (cached) return cached;

  const candles = input.candles;
  if (!indicator.display?.visible || candles.length === 0) {
    return { config: indicator, data: [] };
  }

  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const volumes = candles.map((c) => Math.max(1, toFinite(c.volume, 1)));

  let computed: ComputedIndicator = { config: indicator, data: [] };
  try {
    switch (indicator.type) {
      case "SMA": {
        const period = Math.max(1, getParam(indicator, "period", 20));
        computed = { config: indicator, data: mapSimpleSeries(SMA.calculate({ period, values: closes }), candles, period - 1) };
        break;
      }
      case "EMA": {
        const period = Math.max(1, getParam(indicator, "period", 20));
        computed = { config: indicator, data: mapSimpleSeries(EMA.calculate({ period, values: closes }), candles, period - 1) };
        break;
      }
      case "RSI": {
        const period = Math.max(1, getParam(indicator, "period", 14));
        computed = { config: indicator, data: mapSimpleSeries(RSI.calculate({ period, values: closes }), candles, period) };
        break;
      }
      case "MACD": {
        const fast = Math.max(1, getParam(indicator, "fastPeriod", 12));
        const slow = Math.max(fast + 1, getParam(indicator, "slowPeriod", 26));
        const sig = Math.max(1, getParam(indicator, "signalPeriod", 9));
        const result = MACD.calculate({ values: closes, fastPeriod: fast, slowPeriod: slow, signalPeriod: sig, SimpleMAOscillator: false, SimpleMASignal: false });
        const off = candles.length - result.length;
        const macd = result.map((v, i) => Number.isFinite(Number(v.MACD)) ? { time: candles[i + off]?.time, value: Number(v.MACD) } : null).filter((x): x is { time: number; value: number } => Boolean(x && Number.isFinite(x.time)));
        const signalData = result.map((v, i) => Number.isFinite(Number(v.signal)) ? { time: candles[i + off]?.time, value: Number(v.signal) } : null).filter((x): x is { time: number; value: number } => Boolean(x && Number.isFinite(x.time)));
        const histogram = result.map((v, i) => { const r = candles[i + off]; if (!r) return null; const n = Number(v.histogram); if (!Number.isFinite(n)) return null; return { time: r.time, value: n, color: n >= 0 ? "#26a69a" : "#ef5350" }; }).filter((x): x is { time: number; value: number; color: string } => Boolean(x));
        computed = { config: indicator, data: macd, series: { macd, signal: signalData, histogram } };
        break;
      }
      case "BB": {
        const period = Math.max(1, getParam(indicator, "period", 20));
        const stdDev = Math.max(0.1, getParam(indicator, "stdDev", 2));
        const result = BollingerBands.calculate({ period, stdDev, values: closes });
        const mapped = result.map((v, i) => { const r = candles[i + period - 1]; if (!r) return null; return { time: r.time, middle: Number(v.middle), upper: Number(v.upper), lower: Number(v.lower) }; }).filter((x): x is { time: number; middle: number; upper: number; lower: number } => Boolean(x && Number.isFinite(x.time)));
        computed = { config: indicator, data: mapped.map((m) => ({ time: m.time, value: m.middle })), series: { middle: mapped.map((m) => ({ time: m.time, value: m.middle })), upper: mapped.map((m) => ({ time: m.time, value: m.upper })), lower: mapped.map((m) => ({ time: m.time, value: m.lower })) } };
        break;
      }
      case "VWAP": {
        computed = { config: indicator, data: computeVwap(candles) };
        break;
      }
      case "ATR": {
        const period = Math.max(1, getParam(indicator, "period", 14));
        computed = { config: indicator, data: mapSimpleSeries(ATR.calculate({ period, high: highs, low: lows, close: closes }), candles, period) };
        break;
      }
      case "SUPERTREND": {
        const period = Math.max(1, getParam(indicator, "period", 10));
        const multiplier = Math.max(0.1, getParam(indicator, "multiplier", 3));
        computed = { config: indicator, data: computeSupertrend(candles, period, multiplier) };
        break;
      }

      // â”€â”€â”€ Momentum / Oscillator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      case "STOCH": {
        const period = Math.max(1, getParam(indicator, "period", 14));
        const signalPeriod = Math.max(1, getParam(indicator, "signalPeriod", 3));
        const result = Stochastic.calculate({ high: highs, low: lows, close: closes, period, signalPeriod });
        const off = candles.length - result.length;
        const k = result.map((v, i) => ({ time: candles[i + off]?.time, value: toFinite(v.k) })).filter((r) => Number.isFinite(r.time));
        const d = result.map((v, i) => ({ time: candles[i + off]?.time, value: toFinite(v.d) })).filter((r) => Number.isFinite(r.time));
        computed = { config: indicator, data: k, series: { k, d } };
        break;
      }
      case "STOCHRSI": {
        const rsiPeriod = Math.max(1, getParam(indicator, "rsiPeriod", 14));
        const stochasticPeriod = Math.max(1, getParam(indicator, "stochasticPeriod", 14));
        const kPeriod = Math.max(1, getParam(indicator, "kPeriod", 3));
        const dPeriod = Math.max(1, getParam(indicator, "dPeriod", 3));
        const result = StochasticRSI.calculate({ values: closes, rsiPeriod, stochasticPeriod, kPeriod, dPeriod });
        const off = candles.length - result.length;
        const k = result.map((v, i) => ({ time: candles[i + off]?.time, value: toFinite(v.k) })).filter((r) => Number.isFinite(r.time));
        const d = result.map((v, i) => ({ time: candles[i + off]?.time, value: toFinite(v.d) })).filter((r) => Number.isFinite(r.time));
        computed = { config: indicator, data: k, series: { k, d } };
        break;
      }
      case "CCI": {
        const period = Math.max(1, getParam(indicator, "period", 20));
        computed = { config: indicator, data: mapSimpleSeries(CCI.calculate({ period, high: highs, low: lows, close: closes }), candles, period - 1) };
        break;
      }
      case "WILLR": {
        const period = Math.max(1, getParam(indicator, "period", 14));
        computed = { config: indicator, data: mapSimpleSeries(WilliamsR.calculate({ period, high: highs, low: lows, close: closes }), candles, period - 1) };
        break;
      }
      case "ROC": {
        const period = Math.max(1, getParam(indicator, "period", 12));
        computed = { config: indicator, data: mapSimpleSeries(ROC.calculate({ period, values: closes }), candles, period) };
        break;
      }
      case "AO": {
        const fastPeriod = Math.max(1, getParam(indicator, "fastPeriod", 5));
        const slowPeriod = Math.max(fastPeriod + 1, getParam(indicator, "slowPeriod", 34));
        const result = AwesomeOscillator.calculate({ high: highs, low: lows, fastPeriod, slowPeriod });
        const off = candles.length - result.length;
        const data = result.map((v, i) => { const r = candles[i + off]; if (!r) return null; return { time: r.time, value: toFinite(v), color: v >= 0 ? "#26a69a" : "#ef5350" }; }).filter((x): x is { time: number; value: number; color: string } => Boolean(x));
        computed = { config: indicator, data };
        break;
      }
      case "MFI": {
        const period = Math.max(1, getParam(indicator, "period", 14));
        computed = { config: indicator, data: mapSimpleSeries(MFI.calculate({ period, high: highs, low: lows, close: closes, volume: volumes }), candles, period) };
        break;
      }
      case "TRIX": {
        const period = Math.max(1, getParam(indicator, "period", 18));
        const result = TRIX.calculate({ period, values: closes });
        computed = { config: indicator, data: mapSimpleSeries(result, candles, candles.length - result.length) };
        break;
      }
      case "KST": {
        const result = KST.calculate({
          values: closes,
          ROCPer1: getParam(indicator, "ROCPer1", 10), ROCPer2: getParam(indicator, "ROCPer2", 15),
          ROCPer3: getParam(indicator, "ROCPer3", 20), ROCPer4: getParam(indicator, "ROCPer4", 30),
          SMAROCPer1: getParam(indicator, "SMAROCPer1", 10), SMAROCPer2: getParam(indicator, "SMAROCPer2", 10),
          SMAROCPer3: getParam(indicator, "SMAROCPer3", 10), SMAROCPer4: getParam(indicator, "SMAROCPer4", 15),
          signalPeriod: getParam(indicator, "signalPeriod", 9),
        });
        const off = candles.length - result.length;
        const kst = result.map((v, i) => ({ time: candles[i + off]?.time, value: toFinite(v.kst) })).filter((r) => Number.isFinite(r.time));
        const signal = result.map((v, i) => ({ time: candles[i + off]?.time, value: toFinite(v.signal) })).filter((r) => Number.isFinite(r.time));
        computed = { config: indicator, data: kst, series: { macd: kst, signal } };
        break;
      }

      // â”€â”€â”€ Trend â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      case "ADX": {
        const period = Math.max(1, getParam(indicator, "period", 14));
        const result = ADX.calculate({ period, high: highs, low: lows, close: closes });
        const off = candles.length - result.length;
        const adxData = result.map((v, i) => ({ time: candles[i + off]?.time, value: toFinite(v.adx) })).filter((r) => Number.isFinite(r.time));
        const pdi = result.map((v, i) => ({ time: candles[i + off]?.time, value: toFinite(v.pdi) })).filter((r) => Number.isFinite(r.time));
        const mdi = result.map((v, i) => ({ time: candles[i + off]?.time, value: toFinite(v.mdi) })).filter((r) => Number.isFinite(r.time));
        computed = { config: indicator, data: adxData, series: { adx: adxData, pdi, mdi } };
        break;
      }
      case "ICHIMOKU": {
        const conversionPeriod = Math.max(1, getParam(indicator, "conversionPeriod", 9));
        const basePeriod = Math.max(1, getParam(indicator, "basePeriod", 26));
        const spanPeriod = Math.max(1, getParam(indicator, "spanPeriod", 52));
        const displacement = Math.max(1, getParam(indicator, "displacement", 26));
        const result = IchimokuCloud.calculate({ high: highs, low: lows, conversionPeriod, basePeriod, spanPeriod, displacement });
        const off = candles.length - result.length;
        const conversion = result.map((v, i) => ({ time: candles[i + off]?.time, value: toFinite(v.conversion) })).filter((r) => Number.isFinite(r.time));
        const base = result.map((v, i) => ({ time: candles[i + off]?.time, value: toFinite(v.base) })).filter((r) => Number.isFinite(r.time));
        const spanA = result.map((v, i) => ({ time: candles[i + off]?.time, value: toFinite(v.spanA) })).filter((r) => Number.isFinite(r.time));
        const spanB = result.map((v, i) => ({ time: candles[i + off]?.time, value: toFinite(v.spanB) })).filter((r) => Number.isFinite(r.time));
        computed = { config: indicator, data: conversion, series: { conversion, base, spanA, spanB } };
        break;
      }
      case "PSAR": {
        const step = Math.max(0.001, getParam(indicator, "step", 0.02));
        const max = Math.max(step, getParam(indicator, "max", 0.2));
        const result = PSAR.calculate({ high: highs, low: lows, step, max });
        computed = { config: indicator, data: mapSimpleSeries(result as number[], candles, candles.length - result.length) };
        break;
      }

      // â”€â”€â”€ Volume â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      case "OBV": {
        const result = OBV.calculate({ close: closes, volume: volumes });
        computed = { config: indicator, data: mapSimpleSeries(result, candles, candles.length - result.length) };
        break;
      }
      case "FORCE": {
        const period = Math.max(1, getParam(indicator, "period", 13));
        const result = ForceIndex.calculate({ close: closes, volume: volumes, period });
        computed = { config: indicator, data: mapSimpleSeries(result, candles, candles.length - result.length) };
        break;
      }

      // â”€â”€â”€ Volatility â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      case "KC": {
        const maPeriod = Math.max(1, getParam(indicator, "maPeriod", 20));
        const atrPeriod = Math.max(1, getParam(indicator, "atrPeriod", 10));
        const multiplier = Math.max(0.1, getParam(indicator, "multiplier", 2));
        const result = KeltnerChannels.calculate({
          high: highs,
          low: lows,
          close: closes,
          maPeriod,
          atrPeriod,
          multiplier,
          useSMA: false,
        });
        const off = candles.length - result.length;
        const middle = result.map((v, i) => ({ time: candles[i + off]?.time, value: toFinite(v.middle) })).filter((r) => Number.isFinite(r.time));
        const upper = result.map((v, i) => ({ time: candles[i + off]?.time, value: toFinite(v.upper) })).filter((r) => Number.isFinite(r.time));
        const lower = result.map((v, i) => ({ time: candles[i + off]?.time, value: toFinite(v.lower) })).filter((r) => Number.isFinite(r.time));
        computed = { config: indicator, data: middle, series: { middle, upper, lower } };
        break;
      }

      // â”€â”€â”€ Support / Resistance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      case "PIVOT": {
        computed = { config: indicator, data: computePivotPoints(candles) };
        break;
      }

      // Volume display (handled by BaseChart)
      case "VOL":
      case "VOLPROFILE":
        computed = { config: indicator, data: [] };
        break;

      default:
        computed = { config: indicator, data: [] };
    }
  } catch (err) {
    console.error("Indicator compute failed:", indicator.type, err);
    trackAnalysisEvent({
      name: "indicator_compute_failed",
      level: "error",
      payload: {
        indicatorType: indicator.type,
        indicatorId: indicator.id,
        symbol: input.symbol,
        instrumentKey: input.instrumentKey,
        candleCount: candles.length,
      },
    });
    computed = { config: indicator, data: [] };
  }

  setCache(key, computed);
  return computed;
}

export function computeIndicators(input: ComputeInput): ComputedIndicator[] {
  if (!Array.isArray(input.candles) || input.candles.length === 0) return [];
  if (!Array.isArray(input.indicators) || input.indicators.length === 0) return [];
  return input.indicators.map((indicator) => computeSingle(input, indicator));
}

type ScheduledResult<T> = {
  cancel: () => void;
  runImmediately: () => T;
};

export function scheduleIndicatorComputation<T>(
  task: () => T,
  onResult: (value: T) => void
): ScheduledResult<T> {
  if (typeof window === "undefined") {
    const value = task();
    onResult(value);
    return { cancel: () => undefined, runImmediately: () => value };
  }

  let cancelled = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let idleId: number | null = null;

  const runTask = () => {
    if (cancelled) return;
    const value = task();
    if (!cancelled) onResult(value);
  };

  if ("requestIdleCallback" in window) {
    idleId = (window as any).requestIdleCallback(runTask, { timeout: 120 });
  } else {
    timeoutId = setTimeout(runTask, 0);
  }

  return {
    cancel: () => {
      cancelled = true;
      if (idleId !== null && "cancelIdleCallback" in window) {
        (window as any).cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) clearTimeout(timeoutId);
    },
    runImmediately: () => task(),
  };
}
