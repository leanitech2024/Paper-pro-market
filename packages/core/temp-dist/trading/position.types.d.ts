import { ProductType, Side, InstrumentMode } from '../types/general.types.js';
export interface UserPosition {
    id: string;
    symbol: string;
    instrumentToken?: string;
    name: string;
    side: Side;
    quantity: number;
    entryPrice: number;
    currentPrice: number;
    contractValue?: number;
    productType: ProductType;
    leverage: number;
    timestamp: Date | number;
    instrument: InstrumentMode;
    lotSize: number;
    currentPnL: number;
    expiryDate?: Date;
    stopLoss?: number;
    target?: number;
}
//# sourceMappingURL=position.types.d.ts.map