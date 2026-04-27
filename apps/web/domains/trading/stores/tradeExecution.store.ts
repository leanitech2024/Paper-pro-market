"use client";

import { create } from "zustand";
import { UserPosition as Position } from "@paper-market/core";
import { EnrichedTrade as Trade } from "@paper-market/core";
import { InstrumentMode } from "@paper-market/core";
import { usePositionsStore } from "./positions.store";
import { useWalletStore } from "@/domains/platform/stores/wallet.store";
import { ExitReason } from "@paper-market/core";
import type { ProductType } from "@paper-market/core";
import { submitOrder, fetchOpenOrders } from "../server/api/trade-api.service";

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ OrderPlacementParams Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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

  /** 1Ã¢â‚¬â€œ10. Only meaningful for MIS. CNC is always enforced to 1 by the backend. */
  leverage?: number;

  /**
   * Stop-loss trigger price.
   * BUY  Ã¢â€ â€™ must be < entryPrice.
   * SELL Ã¢â€ â€™ must be > entryPrice.
   */
  stopLossPrice?: number;

  /**
   * Profit-target trigger price.
   * BUY  Ã¢â€ â€™ must be > entryPrice.
   * SELL Ã¢â€ â€™ must be < entryPrice.
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
    _triggerPrice?: number
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
    _triggerPrice
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

      // Ã¢â€â‚¬Ã¢â€â‚¬ Build API payload Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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

      // leverage Ã¢â‚¬â€ only attach when it's a valid integer
      if (Number.isFinite(tradeParams.leverage) && (tradeParams.leverage ?? 0) > 0) {
        payload.leverage = tradeParams.leverage;
      }

      // stopLossPrice Ã¢â‚¬â€ attach when positive and finite
      if (Number.isFinite(tradeParams.stopLossPrice) && (tradeParams.stopLossPrice ?? 0) > 0) {
        payload.stopLossPrice = tradeParams.stopLossPrice;
      }

      // targetPrice Ã¢â‚¬â€ attach when positive and finite
      if (Number.isFinite(tradeParams.targetPrice) && (tradeParams.targetPrice ?? 0) > 0) {
        payload.targetPrice = tradeParams.targetPrice;
      }

      if (orderType === "LIMIT") {
        payload.limitPrice = tradeParams.entryPrice;
      }

      console.log("[TradeExecution] Sending order payload:", payload);

      await submitOrder(payload);

      get().fetchOrders();
      // Note: Calling component/hook should trigger other store updates
      // DO NOT call usePositionsStore.getState().fetchPositions(true)
      // DO NOT call useWalletStore.getState().fetchWallet()
    } catch (err: any) {
      const message = err instanceof Error ? err.message : "Order placement failed";
      set({ orderProcessingError: message });
      console.error("[TradeExecution] Order placement failed", err);
      throw err;
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
      const data = await fetchOpenOrders();
      if (data.success) {
        set({ pendingOrders: data.data });
      }
    } catch (err) {
      console.error("Fetch Orders Error:", err);
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

      // Note: Calling component/hook should trigger other store updates
      // DO NOT update journal store here
      // DO NOT fetch positions store here
    } catch (err) {
      console.error("Failed to close position:", err);
    }
  },

  settleExpiredPositions: () => {
    console.warn("settleExpiredPositions is deprecated. Backend handles expiry.");
  },
}));
