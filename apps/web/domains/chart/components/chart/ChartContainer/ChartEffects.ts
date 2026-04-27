import { useEffect, useRef, useCallback } from 'react';
import { useMarketStore } from '@/domains/market/stores/market.store';
import { useAnalysisStore } from '@/domains/chart/stores/analysis.store';
import { debounce } from '@/lib/utils/debounce';
import { computeIndicators, scheduleIndicatorComputation } from '@/domains/chart/lib/indicator-engine';
import { trackAnalysisEvent } from '@/domains/chart/lib/telemetry';
import { IChartApi } from 'lightweight-charts';
import { ONE_DAY_VISIBLE_FALLBACK_BARS, INITIAL_VISIBLE_BARS_BY_RANGE, INITIAL_VISIBLE_BARS_BY_TIMEFRAME, ONE_DAY_TARGET_MULTIPLIER, ONE_DAY_WARMUP_MAX_PAGES } from './chart.constants';
import { toCanonicalSymbol } from '@paper-market/core';

export function useIntersectionObserverEffect(containerRef: React.RefObject<HTMLDivElement | null>, setIsChartVisible: (v: boolean) => void) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!containerRef.current) {
      setIsChartVisible(true);
      return;
    }
    if (!("IntersectionObserver" in window)) {
      setIsChartVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsChartVisible(true);
          observer.disconnect();
        }
      },
      { root: null, rootMargin: "200px", threshold: 0.01 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, [containerRef, setIsChartVisible]);
}

export function useSimulationLifecycleEffect(symbol: string) {
  const startSimulation = useMarketStore(state => state.startSimulation);
  const stopSimulation = useMarketStore(state => state.stopSimulation);

  useEffect(() => {
    useAnalysisStore.getState().cancelDrawing();
    stopSimulation();
    startSimulation();

    return () => {
      stopSimulation();
    };
  }, [symbol, startSimulation, stopSimulation]);
}

export function useHistoryLifecycleEffect(
  isChartVisible: boolean, 
  symbol: string, 
  timeframe: string | undefined, 
  range: string | undefined, 
  canonicalSymbol: string, 
  resolvedInstrumentKey: string
) {
  const debouncedInitRef = useRef(
    debounce((sym: string, tf: string | undefined, rng: string | undefined, key: string) => {
      useMarketStore.getState().initializeSimulation(sym, tf, rng, key);
    }, 300)
  );

  useEffect(() => {
    if (!isChartVisible) return;
    useMarketStore.setState((state: any) => ({
      historicalData: [],
      volumeData: [],
      isFetchingHistory: true,
      isInitialLoad: true,
      simulatedSymbol: canonicalSymbol,
      simulatedInstrumentKey: resolvedInstrumentKey,
      currentRequestId: (state.currentRequestId || 0) + 1,
    }));

    debouncedInitRef.current(symbol, timeframe, range, resolvedInstrumentKey);
  }, [isChartVisible, symbol, timeframe, range, canonicalSymbol, resolvedInstrumentKey]);
}

export function useLivePriceSyncEffect(
  resolvedInstrumentKey: string, 
  selectedQuotePrice: string | number | undefined, 
  selectedStockSnapshotPrice: string | number | undefined
) {
  useEffect(() => {
    const quotePrice = Number(selectedQuotePrice);
    const snapshotPrice = Number(selectedStockSnapshotPrice);
    const effectivePrice =
      Number.isFinite(quotePrice) && quotePrice > 0
        ? quotePrice
        : Number.isFinite(snapshotPrice) && snapshotPrice > 0
        ? snapshotPrice
        : 0;
    if (!Number.isFinite(effectivePrice) || effectivePrice <= 0) return;

    const state = useMarketStore.getState();
    if (state.simulatedInstrumentKey !== resolvedInstrumentKey || state.historicalData.length === 0) return;

    const lastIndex = state.historicalData.length - 1;
    const lastCandle = state.historicalData[lastIndex];
    if (!lastCandle) return;

    const currentClose = Number(lastCandle.close);
    if (Number.isFinite(currentClose) && Math.abs(currentClose - effectivePrice) < 0.0001) {
      if (Number(state.livePrice) !== effectivePrice) {
        useMarketStore.setState({ livePrice: effectivePrice });
      }
      return;
    }

    const patchedCandle = {
      ...lastCandle,
      close: effectivePrice,
      high: Math.max(Number(lastCandle.high), effectivePrice),
      low: Math.min(Number(lastCandle.low), effectivePrice),
    };

    useMarketStore.setState({
      historicalData: [...state.historicalData.slice(0, -1), patchedCandle],
      livePrice: effectivePrice,
    });
  }, [resolvedInstrumentKey, selectedQuotePrice, selectedStockSnapshotPrice]);
}

export function useIndicatorComputationEffect(
  data: any[],
  overlayIndicators: any[],
  symbol: string,
  resolvedInstrumentKey: string,
  setComputedIndicators: React.Dispatch<React.SetStateAction<any[]>>
) {
  useEffect(() => {
    if (data.length === 0 || overlayIndicators.length === 0) {
      setComputedIndicators((previous) => (previous.length === 0 ? previous : []));
      return;
    }

    const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();

    const scheduler = scheduleIndicatorComputation(
      () =>
        computeIndicators({
          symbol,
          instrumentKey: resolvedInstrumentKey,
          candles: data as any,
          indicators: overlayIndicators,
        }),
      (result) => {
        const endedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
        const elapsedMs = endedAt - startedAt;
        if (elapsedMs > 40) {
          trackAnalysisEvent({
            name: "indicator_compute_slow",
            level: "warn",
            payload: {
              symbol,
              instrumentKey: resolvedInstrumentKey,
              indicatorCount: overlayIndicators.length,
              candleCount: data.length,
              elapsedMs: Math.round(elapsedMs),
            },
          });
        }
        setComputedIndicators(result);
      }
    );

    return () => scheduler.cancel();
  }, [data, overlayIndicators, symbol, resolvedInstrumentKey, setComputedIndicators]);
}

export function useChartFramingEffect(
  chartApi: IChartApi | null,
  historicalDataLength: number,
  currentRequestId: number,
  activeRangeKey: string,
  activeTimeframeKey: string
) {
  const initialFrameRequestIdRef = useRef<number | null>(null);

  const frameChartToLatest = useCallback(() => {
    if (!chartApi || historicalDataLength === 0) return false;
    try {
      const timeScale = chartApi.timeScale();
      const targetVisibleBars =
        INITIAL_VISIBLE_BARS_BY_RANGE[activeRangeKey] ??
        INITIAL_VISIBLE_BARS_BY_TIMEFRAME[activeTimeframeKey] ??
        ONE_DAY_VISIBLE_FALLBACK_BARS;
      const chartWidth = Number((chartApi.options() as any)?.width);
      const minPixelsPerBar = activeRangeKey === '1D' ? 4 : activeRangeKey === '1M' ? 5 : 3;
      const widthCappedBars =
        Number.isFinite(chartWidth) && chartWidth > 0
          ? Math.floor(chartWidth / minPixelsPerBar)
          : targetVisibleBars;
      const desiredVisibleBars = Math.min(targetVisibleBars, Math.max(40, widthCappedBars));
      const visibleBars = Math.max(40, Math.min(desiredVisibleBars, historicalDataLength));
      const rightOffsetBars = activeRangeKey === '1D' ? 12 : activeRangeKey === '1M' ? 4 : 8;

      const to = Math.max(historicalDataLength - 1 + rightOffsetBars, rightOffsetBars);
      const from = Math.max(0, to - visibleBars);

      timeScale.setVisibleLogicalRange({ from, to });
      if (activeRangeKey !== '1M') {
        timeScale.scrollToRealTime();
      }
      return true;
    } catch (err) {
      console.warn('Initial chart framing failed:', err);
      return false;
    }
  }, [activeRangeKey, activeTimeframeKey, chartApi, historicalDataLength]);

  useEffect(() => {
    if (!chartApi || historicalDataLength === 0 || currentRequestId <= 0) return;
    if (initialFrameRequestIdRef.current === currentRequestId) return;

    const timer = window.setTimeout(() => {
      const framed = frameChartToLatest();
      if (framed) {
        initialFrameRequestIdRef.current = currentRequestId;
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [chartApi, historicalDataLength, currentRequestId, frameChartToLatest]);

  return { frameChartToLatest };
}

export function useWarmupEffect(
  chartApi: IChartApi | null,
  historicalDataLength: number,
  currentRequestId: number,
  range: string | undefined,
  symbol: string,
  resolvedInstrumentKey: string,
  canonicalSymbol: string,
  isFetchingHistory: boolean,
  isInitialLoad: boolean,
  hasMoreHistory: boolean,
  simulatedSymbol: string | null,
  frameChartToLatest: () => void
) {
  const warmupRequestIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!chartApi || historicalDataLength === 0 || currentRequestId <= 0) return;

    const normalizedRange = String(range || '').toUpperCase();
    if (normalizedRange !== '1D') return;
    if (!hasMoreHistory) return;
    if (isFetchingHistory && isInitialLoad) return;
    if (simulatedSymbol && toCanonicalSymbol(simulatedSymbol) !== canonicalSymbol) return;
    if (warmupRequestIdRef.current === currentRequestId) return;

    warmupRequestIdRef.current = currentRequestId;
    let cancelled = false;

    const warmup = async () => {
      const logicalRange = chartApi.timeScale().getVisibleLogicalRange();
      const visibleBars =
        logicalRange &&
        Number.isFinite(logicalRange.from) &&
        Number.isFinite(logicalRange.to) &&
        logicalRange.to > logicalRange.from
          ? Math.ceil(logicalRange.to - logicalRange.from)
          : ONE_DAY_VISIBLE_FALLBACK_BARS;
      const targetCandles = Math.ceil(visibleBars * ONE_DAY_TARGET_MULTIPLIER);

      let pagesLoaded = 0;

      while (!cancelled) {
        const marketState = useMarketStore.getState();
        const analysisRange = String(useAnalysisStore.getState().range || '').toUpperCase();
        const activeSymbol = toCanonicalSymbol(marketState.simulatedSymbol || '');

        if (marketState.currentRequestId !== currentRequestId) break;
        if (analysisRange !== normalizedRange) break;
        if (activeSymbol && activeSymbol !== canonicalSymbol) break;
        if (marketState.historicalData.length >= targetCandles) break;
        if (!marketState.hasMoreHistory) break;
        if (pagesLoaded >= ONE_DAY_WARMUP_MAX_PAGES) break;

        const firstCandle = marketState.historicalData[0];
        const firstCandleTime = Number(firstCandle?.time);
        if (!Number.isFinite(firstCandleTime)) break;

        pagesLoaded += 1;
        await marketState.fetchMoreHistory(symbol, normalizedRange, firstCandleTime, resolvedInstrumentKey);
      }

      if (!cancelled) {
        frameChartToLatest();
      }
    };

    void warmup();

    return () => {
      cancelled = true;
    };
  }, [
    chartApi,
    historicalDataLength,
    currentRequestId,
    range,
    symbol,
    resolvedInstrumentKey,
    canonicalSymbol,
    frameChartToLatest,
    isFetchingHistory,
    isInitialLoad,
    hasMoreHistory,
    simulatedSymbol,
  ]);
}

export function useChartHotkeysEffect(symbol: string) {
  const hotkeysEnabled = useAnalysisStore(state => state.hotkeysEnabled);
  const setActiveTool = useAnalysisStore(state => state.setActiveTool);
  const selectedDrawingIds = useAnalysisStore(state => state.selectedDrawingIds);
  const deleteSelectedDrawings = useAnalysisStore(state => state.deleteSelectedDrawings);

  useEffect(() => {
    if (!hotkeysEnabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTypingTarget =
        tag === "input" || tag === "textarea" || tag === "select" || Boolean(target?.isContentEditable);
      if (isTypingTarget || event.defaultPrevented) return;

      const key = event.key.toLowerCase();

      if ((event.ctrlKey || event.metaKey) && key === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          useAnalysisStore.getState().redoDrawing(symbol);
        } else {
          useAnalysisStore.getState().undoDrawing(symbol);
        }
        return;
      }

      if (key === "delete" || key === "backspace") {
        if (selectedDrawingIds.length > 0) {
          event.preventDefault();
          deleteSelectedDrawings(symbol);
        }
        return;
      }

      if (key === "escape") {
        event.preventDefault();
        const state = useAnalysisStore.getState();
        if (state.interactionState.status === "drawing") {
          state.cancelDrawing();
        } else {
          state.setSelectedDrawings([]);
          state.setActiveTool("cursor");
        }
        return;
      }

      if (event.altKey) {
        if (event.shiftKey && key === "r") {
          event.preventDefault();
          setActiveTool("polyline");
          return;
        }
        const altMap: Record<string, string> = {
          t: "trendline", h: "horizontal-line", v: "vertical-line", c: "cross-line", f: "gann-fan",
        };
        if (altMap[key]) {
          event.preventDefault();
          setActiveTool(altMap[key] as import('@/domains/chart/stores/analysis.store').ToolType);
        }
        return;
      }

      const toolMap: Record<string, string> = {
        v: "cursor", c: "crosshair", l: "long-position", s: "short-position", r: "rectangle", t: "text", b: "brush", m: "date-price-range",
      };
      if (!event.ctrlKey && !event.metaKey && toolMap[key]) {
        event.preventDefault();
        setActiveTool(toolMap[key] as import('@/domains/chart/stores/analysis.store').ToolType);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hotkeysEnabled, setActiveTool, symbol, selectedDrawingIds.length, deleteSelectedDrawings]);
}
