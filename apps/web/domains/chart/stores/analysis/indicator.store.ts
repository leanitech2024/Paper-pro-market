import type { AnalysisState, AnalysisStoreCreator } from "./types";
import { createSymbolState, normalizeIndicator, nowId } from "./shared";

type IndicatorSlice = Pick<
  AnalysisState,
  | "addIndicator"
  | "updateIndicator"
  | "removeIndicator"
  | "clearIndicators"
  | "getIndicators"
>;

export const createIndicatorSlice: AnalysisStoreCreator<IndicatorSlice> = (set, get, _store) => ({
  addIndicator: (symbol, config) =>
    set((state) => {
      const current = state.symbolState[symbol] || createSymbolState();
      const normalized = normalizeIndicator(config);
      const duplicate = current.indicators.some((item) => item.type === normalized.type);
      if (duplicate) return state;
      return {
        symbolState: {
          ...state.symbolState,
          [symbol]: {
            ...current,
            indicators: [...current.indicators, { ...normalized, id: nowId() }],
          },
        },
      };
    }),
  updateIndicator: (symbol, id, updater) =>
    set((state) => {
      const current = state.symbolState[symbol];
      if (!current) return state;
      return {
        symbolState: {
          ...state.symbolState,
          [symbol]: {
            ...current,
            indicators: current.indicators.map((indicator) => {
              if (indicator.id !== id) return indicator;
              const merged = {
                ...indicator,
                ...updater,
                params: {
                  ...indicator.params,
                  ...(updater.params || {}),
                },
                display: {
                  ...indicator.display,
                  ...(updater.display || {}),
                },
              };
              const normalized = normalizeIndicator({
                ...merged,
                type: merged.type,
                source: merged.source,
              });
              return {
                ...normalized,
                id: indicator.id,
              };
            }),
          },
        },
      };
    }),
  removeIndicator: (symbol, id) =>
    set((state) => {
      const current = state.symbolState[symbol];
      if (!current) return state;
      return {
        symbolState: {
          ...state.symbolState,
          [symbol]: {
            ...current,
            indicators: current.indicators.filter((indicator) => indicator.id !== id),
          },
        },
      };
    }),
  clearIndicators: (symbol) =>
    set((state) => {
      const current = state.symbolState[symbol];
      if (!current) return state;
      return {
        symbolState: {
          ...state.symbolState,
          [symbol]: {
            ...current,
            indicators: [],
          },
        },
      };
    }),
  getIndicators: (symbol) => get().symbolState[symbol]?.indicators || [],
});
