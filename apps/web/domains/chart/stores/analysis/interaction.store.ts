import type { AnalysisState, AnalysisStoreCreator, Drawing, Point, TwoPointDrawing } from "./types";
import { toggleId } from "./shared";

type InteractionSlice = Pick<
  AnalysisState,
  | "activeTool"
  | "interactionState"
  | "selectedDrawingId"
  | "selectedDrawingIds"
  | "setActiveTool"
  | "setSelectedDrawing"
  | "setSelectedDrawings"
  | "toggleDrawingSelection"
  | "startDrawing"
  | "startDragging"
  | "updateDraft"
  | "commitDrawing"
  | "cancelDrawing"
  | "addCollectedPoint"
>;

export const createInteractionSlice: AnalysisStoreCreator<InteractionSlice> = (set, get, _store) => ({
  activeTool: "cursor",
  interactionState: { status: "idle" },
  selectedDrawingId: null,
  selectedDrawingIds: [],

  setActiveTool: (activeTool) =>
    set({
      activeTool,
      interactionState: { status: "idle" },
    }),
  setSelectedDrawing: (selectedDrawingId) =>
    set({
      selectedDrawingId,
      selectedDrawingIds: selectedDrawingId ? [selectedDrawingId] : [],
    }),
  setSelectedDrawings: (selectedDrawingIds) =>
    set({
      selectedDrawingIds,
      selectedDrawingId: selectedDrawingIds[0] || null,
    }),
  toggleDrawingSelection: (id, additive = false) =>
    set((state) => {
      const next = additive ? toggleId(state.selectedDrawingIds, id) : [id];
      return {
        selectedDrawingIds: next,
        selectedDrawingId: next[0] || null,
      };
    }),

  startDrawing: (point) =>
    set({
      interactionState: {
        status: "drawing",
        dragStartPoint: point,
        currentPoint: point,
      },
      selectedDrawingId: null,
      selectedDrawingIds: [],
    }),
  startDragging: (id, startPoint, originalDrawing) =>
    set({
      interactionState: {
        status: "dragging",
        activeDrawingIds: [id],
        dragStartPoint: startPoint,
        originalDrawings: { [id]: originalDrawing },
        currentPoint: startPoint,
      },
      selectedDrawingId: id,
      selectedDrawingIds: [id],
    }),
  updateDraft: (point) =>
    set((state) => ({
      interactionState: {
        ...state.interactionState,
        currentPoint: point,
      },
    })),
  commitDrawing: (symbol) => {
    const { activeTool, interactionState } = get();
    if (
      interactionState.status !== "drawing" ||
      !interactionState.dragStartPoint ||
      !interactionState.currentPoint
    ) {
      return;
    }

    let draft: Omit<Drawing, "id"> | null = null;
    if (activeTool === "trendline" || activeTool === "ray" || activeTool === "rectangle") {
      draft = {
        type: activeTool,
        visible: true,
        locked: false,
        p1: interactionState.dragStartPoint,
        p2: interactionState.currentPoint,
      } as Omit<TwoPointDrawing, "id">;
    }

    if (draft) get().addDrawing(symbol, draft);
    set({ interactionState: { status: "idle" } });
  },
  cancelDrawing: () => set({ interactionState: { status: "idle" } }),
  addCollectedPoint: (point) =>
    set((state) => {
      const previous = state.interactionState.collectedPoints || [];
      return {
        interactionState: {
          ...state.interactionState,
          collectedPoints: [...previous, point],
          currentPoint: point,
        },
      };
    }),
});
