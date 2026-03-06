import { Side, InstrumentMode, ExitReason, TradeStatus } from '../types/general.types';


export type OrderExecutionType = 'MARKET' | 'LIMIT' | 'STOP';

export interface TradeParams {
  instrumentToken: string;
  symbol: string;
  side: Side;
  quantity: number;
  entryPrice?: number;
  orderType?: OrderExecutionType;
}

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
  stopLoss?: number;
  target?: number;
  exitReason?: ExitReason;
  orderType?: OrderExecutionType;
  exchangeOrderId?: string;
}
