"use client";

import { create } from "zustand";
import { UserPosition as Position } from "@paper-market/core";
import { EnrichedTrade as Trade } from "@paper-market/core";
import { InstrumentMode } from "@paper-market/core";
import { usePositionsStore } from "./positions.store";
import { useJournalStore } from "./journal.store";
import { useWalletStore } from "@/stores/wallet.store";
import { ExitReason } from "@paper-market/core";
import type { ProductType } from "@paper-market/core";

// ─── OrderPlacementParams ─────────────────────────────────────────────────────
// Everything the UI knows about an order. All four formerly-missing fields are
// now first-class so they flow through to the API payload.
type OrderPlacementParams = {
  instrumentToken: string;
  symbol: string;
  side: Position["side"];
  quantity: number;
  entryPrice?: number;

  /** CNC (default) or MIS. MIS enables leverage + auto-square-off at close. */
  productType?: ProductType;

  /** 1–10. Only meaningful for MIS. CNC is always enforced to 1 by the backend. */
  leverage?: number;

  /**
   * Stop-loss trigger price.
   * BUY  → must be < entryPrice.
   * SELL → must be > entryPrice.
   */
  stopLossPrice?: number;

  /**
   * Profit-target trigger price.
   * BUY  → must be > entryPrice.
   * SELL → must be < entryPrice.
   */
  targetPrice?: number;
};

interface TradeExecutionState {
  pendingOrders: Trade[];
  pendingOrderDetails: Record<string, { leverage: number; lotSize: number }>;
  isOrderProcessing: boolean;
  processingOrderCount: number;
  orderProcessingError: string | null;
  clearOrderProcessingError: () => void;

  placeOrder: (
    tradeParams: OrderPlacementParams,
    lotSize: number,
    instrumentMode: InstrumentMode,
    orderType?: "MARKET" | "LIMIT" | "STOP",
    triggerPrice?: number
  ) => Promise<void>;

  fetchOrders: () => Promise<void>;
  processTick: (currentPrice: number, symbol: string) => void;

  executeTrade: (
    trade: OrderPlacementParams,
    lotSize: number,
    instrumentMode: InstrumentMode,
    orderType?: "MARKET" | "LIMIT" | "STOP"
  ) => Promise<void>;

  closePosition: (positionId: string, exitPrice: number, reason?: string) => void;
  settleExpiredPositions: () => void;
}

export const useTradeExecutionStore = create<TradeExecutionState>((set, get) => ({
  pendingOrders: [],
  pendingOrderDetails: {},
  isOrderProcessing: false,
  processingOrderCount: 0,
  orderProcessingError: null,
  clearOrderProcessingError: () => set({ orderProcessingError: null }),

  placeOrder: async (
    tradeParams,
    lotSize,
    instrumentMode,
    orderType = "MARKET",
    triggerPrice
  ) => {
    let markedProcessing = false;
    try {
      if (!tradeParams.instrumentToken || tradeParams.instrumentToken.trim().length === 0) {
        throw new Error("instrumentToken is required for order placement");
      }

      set((state) => {
        const nextCount = state.processingOrderCount + 1;
        return {
          processingOrderCount: nextCount,
          isOrderProcessing: nextCount > 0,
          orderProcessingError: null,
        };
      });
      markedProcessing = true;

      // ── Build API payload ──────────────────────────────────────────────────
      // All four formerly-missing fields are now included when present.
      const payload: Record<string, unknown> = {
        instrumentToken: tradeParams.instrumentToken,
        symbol: tradeParams.symbol,
        side: tradeParams.side,
        quantity: tradeParams.quantity,
        orderType: orderType,
        // productType defaults to CNC on the backend if omitted, but we send it
        // explicitly so the intent is never ambiguous.
        productType: tradeParams.productType ?? "CNC",
      };

      // leverage — only attach when it's a valid integer
      if (Number.isFinite(tradeParams.leverage) && (tradeParams.leverage ?? 0) > 0) {
        payload.leverage = tradeParams.leverage;
      }

      // stopLossPrice — attach when positive and finite
      if (Number.isFinite(tradeParams.stopLossPrice) && (tradeParams.stopLossPrice ?? 0) > 0) {
        payload.stopLossPrice = tradeParams.stopLossPrice;
      }

      // targetPrice — attach when positive and finite
      if (Number.isFinite(tradeParams.targetPrice) && (tradeParams.targetPrice ?? 0) > 0) {
        payload.targetPrice = tradeParams.targetPrice;
      }

      if (orderType === "LIMIT") {
        payload.limitPrice = tradeParams.entryPrice;
      }

      console.log("[TradeExecution] Sending order payload:", payload);

      const res = await fetch("/api/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const rawBody = await res.text();
      let data: any = null;
      if (rawBody) {
        try {
          data = JSON.parse(rawBody);
        } catch {
          data = null;
        }
      }

      if (!res.ok || !data?.success) {
        const apiError = data?.error;
        const errorCode =
          (typeof apiError?.code === "string" && apiError.code) ||
          (typeof data?.code === "string" && data.code) ||
          "";

        const backendMessage = (() => {
          if (errorCode === "MARKET_CLOSED")
            return (
              apiError?.message ||
              data?.message ||
              "Market is closed. Trading hours are 9:15 AM - 3:30 PM IST (Mon-Fri). You can still exit existing positions anytime."
            );
          if (errorCode === "INSUFFICIENT_FUNDS")
            return apiError?.message || data?.message || "Insufficient balance to place this order.";
          if (errorCode === "INSTRUMENT_INACTIVE")
            return "This instrument is no longer active or has expired.";
          if (errorCode === "INSTRUMENT_NOT_ALLOWED")
            return "Trading this instrument is not allowed in paper trading mode.";
          if (errorCode === "PARTIAL_EXIT_NOT_ALLOWED")
            return "Partial exit is disabled in paper trading mode.";
          if (errorCode === "INVALID_STOP_LOSS")
            return apiError?.message || "Stop-loss price is on the wrong side of the entry price.";
          if (errorCode === "INVALID_TARGET")
            return apiError?.message || "Target price is on the wrong side of the entry price.";
          if (errorCode === "CNC_LEVERAGE_NOT_ALLOWED")
            return "CNC orders cannot use leverage above 1x. Switch to MIS for leveraged intraday trading.";
          return (
            (typeof apiError === "string" && apiError) ||
            apiError?.message ||
            (typeof data?.message === "string" && data.message) ||
            (!data && rawBody ? rawBody.slice(0, 300) : null) ||
            `Order placement failed (HTTP ${res.status})`
          );
        })();

        console.error("Place Order API Failed:", {
          status: res.status,
          errorCode,
          data,
        });

        throw new Error(backendMessage);
      }

      get().fetchOrders();
      useWalletStore.getState().fetchWallet();
      usePositionsStore.getState().fetchPositions();
    } catch (error: any) {
      const message = error instanceof Error ? error.message : "Order placement failed";
      set({ orderProcessingError: message });
      console.error("[TradeExecution] Order placement failed", error);
      throw error;
    } finally {
      if (markedProcessing) {
        set((state) => {
          const nextCount = Math.max(0, state.processingOrderCount - 1);
          return {
            processingOrderCount: nextCount,
            isOrderProcessing: nextCount > 0,
          };
        });
      }
    }
  },

  fetchOrders: async () => {
    try {
      const res = await fetch("/api/v1/orders?status=OPEN");
      const data = await res.json();
      if (data.success) {
        set({ pendingOrders: data.data });
      }
    } catch (error) {
      console.error("Fetch Orders Error:", error);
    }
  },

  processTick: (_currentPrice, _symbol) => {
    // Tick-based SL/Target execution is handled by the backend monitoring engine.
  },

  executeTrade: async (trade, lotSize, mode, orderType = "MARKET") => {
    return get().placeOrder(trade, lotSize, mode, orderType);
  },

  closePosition: async (positionId: string, exitPrice: number, reason = "MANUAL") => {
    const positionsStore = usePositionsStore.getState();
    const position = positionsStore.positions.find((p) => p.id === positionId);

    if (!position) {
      console.error("Position not found:", positionId);
      return;
    }

    try {
      const exitSide = position.side === "BUY" ? "SELL" : "BUY";
      if (!position.instrumentToken) {
        throw new Error(`Missing instrumentToken for position ${position.symbol}`);
      }

      await get().placeOrder(
        {
          instrumentToken: position.instrumentToken,
          symbol: position.symbol,
          side: exitSide,
          quantity: position.quantity,
          entryPrice: exitPrice,
          // Preserve original productType and leverage on exit so margin math is consistent
          productType: (position as any).productType ?? "CNC",
          leverage: (position as any).leverage ?? 1,
        },
        position.lotSize || 1,
        position.instrument as InstrumentMode,
        "MARKET"
      );

      setTimeout(() => {
        positionsStore.fetchPositions();
      }, 500);

      const pnl =
        position.side === "BUY"
          ? (exitPrice - position.entryPrice) * position.quantity
          : (position.entryPrice - exitPrice) * position.quantity;

      const exitReason: ExitReason =
        reason === "EXPIRY SETTLEMENT" ? "EXPIRY" : "MANUAL";

      useJournalStore.getState().updateJournalOnExit(positionId, {
        exitPrice,
        exitTime: new Date(),
        realizedPnL: pnl,
        exitReason,
      });
    } catch (error) {
      console.error("Failed to close position:", error);
    }
  },

  settleExpiredPositions: () => {
    console.warn("settleExpiredPositions is deprecated. Backend handles expiry.");
  },
}));

