import { Side, InstrumentMode, ExitReason, TradeStatus } from '../types/general.types';

export type OrderExecutionType = 'MARKET' | 'LIMIT' | 'STOP';

/** CNC = Cash-and-Carry (multi-day). MIS = Margin Intraday (auto-square-off). */
export type ProductType = 'CNC' | 'MIS';

// ─── TradeParams ──────────────────────────────────────────────────────────────
// The full payload that flows from the UI form → store.placeOrder → POST /api/v1/orders.
// All four formerly-missing fields are now first-class members.
export interface TradeParams {
  instrumentToken: string;
  symbol: string;
  side: Side;
  quantity: number;
  entryPrice?: number;
  orderType?: OrderExecutionType;

  /** CNC (default) or MIS. MIS enables leverage and auto-square-off at close. */
  productType?: ProductType;

  /** 1–10. Ignored for CNC by the backend (enforced to 1). */
  leverage?: number;

  /**
   * Optional stop-loss trigger price.
   * For BUY  → must be < entryPrice.
   * For SELL → must be > entryPrice.
   * When provided the backend spawns a child STOP_LOSS order immediately.
   */
  stopLossPrice?: number;

  /**
   * Optional profit-target trigger price.
   * For BUY  → must be > entryPrice.
   * For SELL → must be < entryPrice.
   * When provided the backend spawns a child TARGET order immediately.
   */
  targetPrice?: number;
}

// ─── EnrichedTrade ────────────────────────────────────────────────────────────
export interface EnrichedTrade {
  id: string;
  instrumentToken?: string;
  symbol: string;
  name: string;
  side: Side;
  quantity: number;
  filledQuantity: number;
  entryPrice: number;
  exitPrice: number | null;
  pnl: number | null;
  status: TradeStatus;
  entryTime: Date;
  exitTime: Date | null;
  updatedAt: Date;
  notes?: string;
  instrument: InstrumentMode;
  expiryDate?: Date;

  // ── Now wired end-to-end ───────────────────────────────────────────────────
  productType?: ProductType;
  leverage?: number;
  stopLossPrice?: number;
  targetPrice?: number;

  exitReason?: ExitReason;
  orderType?: OrderExecutionType;
  exchangeOrderId?: string;
}
