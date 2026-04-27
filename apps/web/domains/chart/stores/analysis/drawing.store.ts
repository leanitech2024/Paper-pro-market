import type { AnalysisState, AnalysisStoreCreator, Drawing } from "./types";
import { createSymbolState, nowId } from "./shared";

type DrawingSlice = Pick<
  AnalysisState,
  | "updateDrawing"
  | "undoDrawing"
  | "redoDrawing"
  | "addDrawing"
  | "removeDrawing"
  | "deleteDrawing"
  | "deleteSelectedDrawings"
  | "clearDrawings"
  | "setDrawingVisibility"
  | "setSelectedDrawingsLocked"
  | "getDrawings"
  | "lockAllDrawings"
  | "unlockAllDrawings"
  | "clearAllDrawings"
>;

export const createDrawingSlice: AnalysisStoreCreator<DrawingSlice> = (set, get, _store) => ({
  updateDrawing: (symbol, drawing) =>
    set((state) => {
      const current = state.symbolState[symbol] || createSymbolState();
      return {
        symbolState: {
          ...state.symbolState,
          [symbol]: {
            ...current,
            drawings: current.drawings.map((item) => (item.id === drawing.id ? drawing : item)),
          },
        },
      };
    }),
  undoDrawing: (symbol) =>
    set((state) => {
      const current = state.symbolState[symbol];
      if (!current || current.drawings.length === 0) return state;
      const nextDrawings = [...current.drawings];
      const popped = nextDrawings.pop();
      if (!popped) return state;
      return {
        symbolState: {
          ...state.symbolState,
          [symbol]: {
            ...current,
            drawings: nextDrawings,
            redoStack: [...current.redoStack, popped],
          },
        },
      };
    }),
  redoDrawing: (symbol) =>
    set((state) => {
      const current = state.symbolState[symbol];
      if (!current || current.redoStack.length === 0) return state;
      const redoStack = [...current.redoStack];
      const restored = redoStack.pop();
      if (!restored) return state;
      return {
        symbolState: {
          ...state.symbolState,
          [symbol]: {
            ...current,
            drawings: [...current.drawings, restored],
            redoStack,
          },
        },
      };
    }),
  addDrawing: (symbol, drawing) =>
    set((state) => {
      const current = state.symbolState[symbol] || createSymbolState();
      const next = {
        ...drawing,
        id: typeof (drawing as any).id === "string" ? (drawing as any).id : nowId(),
        visible: drawing.visible ?? true,
        locked: drawing.locked ?? false,
        zIndex: drawing.zIndex ?? current.drawings.length + 1,
      } as Drawing;
      return {
        symbolState: {
          ...state.symbolState,
          [symbol]: {
            ...current,
            drawings: [...current.drawings, next],
            redoStack: [],
          },
        },
      };
    }),
  removeDrawing: (symbol, id) =>
    set((state) => {
      const current = state.symbolState[symbol];
      if (!current) return state;
      const selectedDrawingIds = state.selectedDrawingIds.filter((item) => item !== id);
      return {
        symbolState: {
          ...state.symbolState,
          [symbol]: {
            ...current,
            drawings: current.drawings.filter((drawing) => drawing.id !== id),
          },
        },
        selectedDrawingIds,
        selectedDrawingId: selectedDrawingIds[0] || null,
      };
    }),
  deleteDrawing: (symbol, id) => get().removeDrawing(symbol, id),
  deleteSelectedDrawings: (symbol) =>
    set((state) => {
      const current = state.symbolState[symbol];
      if (!current || state.selectedDrawingIds.length === 0) return state;
      const selected = new Set(state.selectedDrawingIds);
      return {
        symbolState: {
          ...state.symbolState,
          [symbol]: {
            ...current,
            drawings: current.drawings.filter((drawing) => !selected.has(drawing.id)),
          },
        },
        selectedDrawingId: null,
        selectedDrawingIds: [],
      };
    }),
  clearDrawings: (symbol) =>
    set((state) => {
      const current = state.symbolState[symbol];
      if (!current) return state;
      return {
        symbolState: {
          ...state.symbolState,
          [symbol]: {
            ...current,
            drawings: [],
            redoStack: [],
          },
        },
        selectedDrawingId: null,
        selectedDrawingIds: [],
      };
    }),
  setDrawingVisibility: (symbol, drawingId, visible) =>
    set((state) => {
      const current = state.symbolState[symbol];
      if (!current) return state;
      return {
        symbolState: {
          ...state.symbolState,
          [symbol]: {
            ...current,
            drawings: current.drawings.map((drawing) =>
              drawing.id === drawingId ? { ...drawing, visible } : drawing
            ),
          },
        },
      };
    }),
  setSelectedDrawingsLocked: (symbol, locked) =>
    set((state) => {
      const current = state.symbolState[symbol];
      if (!current || state.selectedDrawingIds.length === 0) return state;
      const selected = new Set(state.selectedDrawingIds);
      return {
        symbolState: {
          ...state.symbolState,
          [symbol]: {
            ...current,
            drawings: current.drawings.map((drawing) =>
              selected.has(drawing.id) ? { ...drawing, locked } : drawing
            ),
          },
        },
      };
    }),
  getDrawings: (symbol) => get().symbolState[symbol]?.drawings || [],
  lockAllDrawings: (symbol) =>
    set((state) => {
      const current = state.symbolState[symbol];
      if (!current) return state;
      return {
        symbolState: {
          ...state.symbolState,
          [symbol]: {
            ...current,
            drawings: current.drawings.map((drawing) => ({ ...drawing, locked: true })),
          },
        },
      };
    }),
  unlockAllDrawings: (symbol) =>
    set((state) => {
      const current = state.symbolState[symbol];
      if (!current) return state;
      return {
        symbolState: {
          ...state.symbolState,
          [symbol]: {
            ...current,
            drawings: current.drawings.map((drawing) => ({ ...drawing, locked: false })),
          },
        },
      };
    }),
  clearAllDrawings: (symbol) =>
    set((state) => {
      const current = state.symbolState[symbol];
      if (!current) return state;
      return {
        symbolState: {
          ...state.symbolState,
          [symbol]: { ...current, drawings: [], redoStack: [] },
        },
        selectedDrawingId: null,
        selectedDrawingIds: [],
      };
    }),
});
