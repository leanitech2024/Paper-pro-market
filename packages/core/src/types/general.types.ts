export type ProductType = 'CNC' | 'MIS';

export type Side = 'BUY' | 'SELL';

export type TradeStatus = 'CREATED' | 'SENT' | 'PENDING' | 'OPEN' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELLED' | 'CLOSED' | 'REJECTED';

export type InstrumentMode = 'equity' | 'futures' | 'options';

export type ExpiryType = 'WEEKLY' | 'MONTHLY';

export type ExitReason = 'MANUAL' | 'STOP_LOSS' | 'TARGET' | 'EXPIRY' | 'SQUARE_OFF';