import type { AnalysisState, AnalysisStoreCreator } from "./types";
import { createSymbolState } from "./shared";

type SettingsSlice = Pick<
  AnalysisState,
  | "isAnalysisMode"
  | "timeframe"
  | "range"
  | "chartStyle"
  | "chartStyleBySymbol"
  | "hotkeysEnabled"
  | "indicatorPresetsBySymbol"
  | "symbolState"
  | "globalHideState"
  | "setAnalysisMode"
  | "setTimeframe"
  | "setRange"
  | "setChartStyle"
  | "setChartStyleForSymbol"
  | "getChartStyle"
  | "setHotkeysEnabled"
  | "setGlobalHide"
  | "hideAll"
  | "showAll"
>;

export const createSettingsSlice: AnalysisStoreCreator<SettingsSlice> = (set, get, _store) => ({
  isAnalysisMode: false,
  timeframe: "5m",
  range: "1D",
  chartStyle: "CANDLE",
  chartStyleBySymbol: {},
  hotkeysEnabled: true,
  indicatorPresetsBySymbol: {},
  symbolState: {},
  globalHideState: { drawings: false, indicators: false, positions: false },

  setAnalysisMode: (isOpen) => set({ isAnalysisMode: isOpen }),
  setTimeframe: (timeframe) => set({ timeframe }),
  setRange: (range) => set({ range }),
  setChartStyle: (chartStyle) => set({ chartStyle }),
  setChartStyleForSymbol: (symbol, style) =>
    set((state) => ({
      chartStyle: style,
      chartStyleBySymbol: {
        ...state.chartStyleBySymbol,
        [symbol]: style,
      },
      symbolState: {
        ...state.symbolState,
        [symbol]: {
          ...(state.symbolState[symbol] || createSymbolState()),
          chartStyle: style,
        },
      },
    })),
  getChartStyle: (symbol) => {
    const state = get();
    return (
      state.chartStyleBySymbol[symbol] ||
      state.symbolState[symbol]?.chartStyle ||
      state.chartStyle
    );
  },
  setHotkeysEnabled: (hotkeysEnabled) => set({ hotkeysEnabled }),
  setGlobalHide: (key, hidden) =>
    set((state) => ({
      globalHideState: { ...state.globalHideState, [key]: hidden },
    })),
  hideAll: (_symbol) =>
    set({ globalHideState: { drawings: true, indicators: true, positions: true } }),
  showAll: (_symbol) =>
    set({ globalHideState: { drawings: false, indicators: false, positions: false } }),
});
