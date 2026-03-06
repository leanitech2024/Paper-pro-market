import { ProductType, Side, InstrumentMode } from '../types/general.types';

export interface UserPosition {
  id: string;
  symbol: string;
  instrumentToken?: string;
  name: string;
  side: Side;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  contractValue?: number; // Total value of the position
  productType: ProductType;
  leverage: number;
  timestamp: Date | number; // Allow number for Date.now()
  instrument: InstrumentMode;
  lotSize: number;
  currentPnL: number;
  expiryDate?: Date;
  stopLoss?: number;
  target?: number;
}
