import { create } from "zustand";
import { persist } from "zustand/middleware";

import { createDrawingSlice } from "./analysis/drawing.store";
import { createIndicatorSlice } from "./analysis/indicator.store";
import { createInteractionSlice } from "./analysis/interaction.store";
import { createSettingsSlice } from "./analysis/settings.store";
import { isChartStyle, makeDefaultIndicator, normalizeSymbolStateRecord } from "./analysis/shared";
import type { AnalysisState, ChartStyle } from "./analysis/types";

export { makeDefaultIndicator };
export type {
  AnalysisState,
  ArrowDrawing,
  BrushDrawing,
  ChartStyle,
  Drawing,
  DrawingType,
  GlobalHideState,
  HorizontalLineDrawing,
  IndicatorConfig,
  IndicatorDisplay,
  IndicatorType,
  InteractionState,
  InteractionStatus,
  MultiPointDrawing,
  Point,
  PositionDrawing,
  SinglePointLineDrawing,
  TextDrawing,
  ThreePointDrawing,
  ToolType,
  TwoPointDrawing,
} from "./analysis/types";

export const useAnalysisStore = create<AnalysisState>()(
  persist(
    (set, get, store) => ({
      ...createSettingsSlice(set, get, store),
      ...createInteractionSlice(set, get, store),
      ...createIndicatorSlice(set, get, store),
      ...createDrawingSlice(set, get, store),
    }),
    {
      name: "analysis-storage-v2",
      version: 2,
      migrate: (persistedState: any, version) => {
        if (!persistedState || typeof persistedState !== "object") return persistedState;
        const symbolState = normalizeSymbolStateRecord(persistedState.symbolState);
        const chartStyleBySymbol = {
          ...(persistedState.chartStyleBySymbol || {}),
        } as Record<string, ChartStyle>;

        if (version < 2) {
          for (const [symbol, value] of Object.entries(symbolState)) {
            if (value?.chartStyle && !chartStyleBySymbol[symbol]) {
              chartStyleBySymbol[symbol] = value.chartStyle;
            }
          }
        }

        const chartStyle = isChartStyle(persistedState.chartStyle)
          ? persistedState.chartStyle
          : "CANDLE";

        return {
          ...persistedState,
          symbolState,
          chartStyle,
          chartStyleBySymbol,
        };
      },
      partialize: (state) => ({
        symbolState: state.symbolState,
        chartStyle: state.chartStyle,
        chartStyleBySymbol: state.chartStyleBySymbol,
        hotkeysEnabled: state.hotkeysEnabled,
        indicatorPresetsBySymbol: state.indicatorPresetsBySymbol,
      }),
    }
  )
);
