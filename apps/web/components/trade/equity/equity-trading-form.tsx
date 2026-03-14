"use client";

import { useState, useMemo } from 'react';
import { Stock } from "@paper-market/core";
import { cn } from "@/lib/utils";
import { TooltipProvider } from '@/components/ui/tooltip';
import { Search, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

import { useTradeExecutionStore } from '@/stores/trading/tradeExecution.store';
import { useWalletStore } from '@/stores/wallet.store';
import { usePositionsStore } from '@/stores/trading/positions.store';
import { useInstrumentPrice } from '@/hooks/useInstrumentPrice';
import { useMarginPreview } from '@/hooks/useMarginPreview';
import { getExitQuantity } from '@/utils/trading/position-exit';

import { TradePriceDisplay, formatPrice } from '../shared/trade-price-display';
import { TradeMarginSummary, formatMoney } from '../shared/trade-margin-summary';
import { TradeControls } from '../shared/trade-controls';
import { OrderProcessingDialog, TradeConfirmationDialog } from '../form';

interface EquityTradingFormProps {
  selectedStock: Stock | null;
  onStockSelect: (stock: Stock) => void;
  instruments: Stock[];
  sheetMode?: boolean;
  onOpenSearch?: () => void;
}

export function EquityTradingForm({
  selectedStock,
  onStockSelect,
  instruments,
  sheetMode = false,
  onOpenSearch,
}: EquityTradingFormProps) {
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState('1');
  const [productType, setProductType] = useState<'CNC' | 'MIS'>('CNC');
  const [leverage, setLeverage] = useState('1');
  const [stopLoss, setStopLoss] = useState('');
  const [target, setTarget] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const executeTrade = useTradeExecutionStore((state) => state.executeTrade);
  const isOrderProcessing = useTradeExecutionStore((state) => state.isOrderProcessing);
  const orderProcessingError = useTradeExecutionStore((state) => state.orderProcessingError);
  const clearOrderProcessingError = useTradeExecutionStore((state) => state.clearOrderProcessingError);

  const balance = useWalletStore((state) => state.availableBalance);
  const walletEquity = useWalletStore((state) => state.equity);
  const blockedBalance = useWalletStore((state) => state.blockedBalance);
  const positions = usePositionsStore((state) => state.positions);

  const currentPrice = useInstrumentPrice(selectedStock);
  const leverageValue = parseInt(leverage) || 1;
  const inputValue = parseInt(quantity) || 0;
  
  const lotSize = selectedStock?.lotSize || 1;

  const {
    isOppositeExitFlow,
    effectiveQuantity,
    existingPositionQty
  } = getExitQuantity(positions, selectedStock?.instrumentToken, side, 'equity', inputValue * lotSize);

  const effectiveInputValue = isOppositeExitFlow ? Math.max(1, Math.round(effectiveQuantity / Math.max(1, lotSize))) : inputValue;

  const slValue = parseFloat(stopLoss);
  const targetValue = parseFloat(target);
  const hasSl = stopLoss.trim() !== '' && !isNaN(slValue);
  const hasTarget = target.trim() !== '' && !isNaN(targetValue);

  let isSlValid = true;
  if (hasSl) isSlValid = side === 'BUY' ? slValue < currentPrice : slValue > currentPrice;
  let isTargetValid = true;
  if (hasTarget) isTargetValid = side === 'BUY' ? targetValue > currentPrice : targetValue < currentPrice;

  // Real margin prediction
  const payloadForMarginPreview = selectedStock ? {
    instrumentToken: selectedStock.instrumentToken,
    symbol: selectedStock.symbol,
    side,
    quantity: effectiveQuantity,
    orderType: "MARKET" as const,
    limitPrice: currentPrice,
    productType,
    leverage: leverageValue
  } : null;

  const { requiredMargin, isLoading: isMarginLoading } = useMarginPreview(isOppositeExitFlow ? null : payloadForMarginPreview);

  const finalRequiredMargin = isOppositeExitFlow ? 0 : requiredMargin;

  const isQuantityValid = isOppositeExitFlow ? existingPositionQty > 0 : inputValue > 0;
  const hasInstrumentToken = Boolean(selectedStock?.instrumentToken);
  const hasValidPrice = Number.isFinite(currentPrice) && currentPrice > 0;
  const hasSufficientMargin = finalRequiredMargin <= balance;
  
  const canTrade = selectedStock && hasInstrumentToken && hasValidPrice && !isOrderProcessing && isQuantityValid && hasSufficientMargin && isSlValid && isTargetValid && !isMarginLoading;

  const handleSubmit = () => {
    if (isOrderProcessing || !canTrade || isMarginLoading || !selectedStock) return;
    if (!selectedStock.instrumentToken) {
      toast.error('Instrument routing key missing', { description: `Cannot place order for ${selectedStock.symbol} without instrumentToken.` });
      return;
    }
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setTimeout(() => setShowConfirmDialog(true), 50);
  };

  const confirmTrade = async () => {
    if (isOrderProcessing || !selectedStock) return;
    if (!selectedStock.instrumentToken) {
      toast.error('Instrument routing key missing', { description: `Cannot place order for ${selectedStock.symbol} without instrumentToken.` });
      return;
    }

    try {
      await executeTrade({
        instrumentToken: selectedStock.instrumentToken,
        symbol: selectedStock.symbol,
        side,
        quantity: effectiveQuantity,
        entryPrice: currentPrice,
        productType,
        leverage: leverageValue,
        stopLossPrice: hasSl ? slValue : undefined,
        targetPrice: hasTarget ? targetValue : undefined,
      }, lotSize, "equity");

      toast.success('Trade Sent', { description: `${side} ${effectiveQuantity} units of ${selectedStock.symbol} at market.` });
      setShowConfirmDialog(false);
      setTimeout(() => { setQuantity('1'); setStopLoss(''); setTarget(''); }, 300);
    } catch (error) {
      const fallbackMessage = error instanceof Error ? error.message : 'Order placement failed';
      const message = fallbackMessage.includes('PARTIAL_EXIT_NOT_ALLOWED')
        ? 'Partial exit is disabled in paper trading mode.'
        : fallbackMessage;
      toast.error('Order Failed', { description: message });
    }
  };

  return (
    <TooltipProvider>
      <div className={cn("flex h-full min-h-0 flex-col bg-card", sheetMode && "rounded-none")}>
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Equity Order</div>
          <button type="button" onClick={() => onOpenSearch?.()} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background/70 px-2 py-1 text-[10px] font-semibold text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60" disabled={!onOpenSearch}>
            <Search className="h-3 w-3" />Search
          </button>
        </div>

        <div className={cn("flex-1 space-y-3 overflow-y-auto px-4 py-3 [scrollbar-width:thin]", sheetMode && "pb-20")}>
          {!selectedStock ? (
            <div className="flex h-full min-h-[220px] items-center justify-center rounded-xl border border-border bg-background/70">
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">No stock selected</p>
                <p className="mt-1 text-xs text-muted-foreground">Search and select an equity instrument.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-3 rounded-xl border border-border bg-background/70 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Selected Stock</p>
                    <p className="mt-1 truncate text-sm font-bold text-foreground">{selectedStock.symbol}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{selectedStock.name || 'Equity instrument'}</p>
                  </div>
                </div>
              </div>

              <TradePriceDisplay symbol={selectedStock.symbol} currentPrice={currentPrice} side={side} variant="equity" />

              <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-border bg-background/70">
                {(["BUY", "SELL"] as const).map((value) => (
                  <button key={value} type="button" onClick={() => setSide(value)}
                    className={cn("py-2 text-sm font-bold transition-colors",
                      side === value ? value === "BUY" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white" : "text-muted-foreground hover:text-foreground")}>
                    <span className="inline-flex items-center gap-1.5">
                      {value === "BUY" ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}{value}
                    </span>
                  </button>
                ))}
              </div>

              <TradeControls 
                side={side} setSide={setSide} 
                productType={productType} setProductType={(v) => { setProductType(v); if (v === 'CNC') setLeverage('1'); }} 
                leverage={leverage} setLeverage={setLeverage} 
                quantity={quantity} setQuantity={setQuantity}
                inputValue={inputValue} effectiveQuantity={effectiveQuantity}
                isOppositeExitFlow={isOppositeExitFlow} existingPositionQty={existingPositionQty}
                stopLoss={stopLoss} setStopLoss={setStopLoss}
                target={target} setTarget={setTarget}
                hasSl={hasSl} isSlValid={isSlValid}
                hasTarget={hasTarget} isTargetValid={isTargetValid} />

              <TradeMarginSummary 
                requiredMargin={finalRequiredMargin} 
                balance={balance} 
                blockedBalance={blockedBalance} 
                walletEquity={walletEquity} />

              {(!isSlValid || !isTargetValid) && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/8 px-3 py-2">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                  <p className="text-[11px] leading-relaxed text-amber-300">Check SL/Target levels relative to entry price before placing the order.</p>
                </div>
              )}
              {!hasSufficientMargin && (
                <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/8 px-3 py-2">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
                  <p className="text-[11px] leading-relaxed text-rose-300">Insufficient funds. Required {formatMoney(requiredMargin)}, available {formatMoney(balance)}.</p>
                </div>
              )}
              {orderProcessingError && (
                <div className="rounded-lg border border-rose-500/30 bg-rose-500/8 px-3 py-2 text-[11px] text-rose-300">{orderProcessingError}</div>
              )}
            </>
          )}
        </div>

        {selectedStock && (
          <div className={cn("shrink-0 border-t border-border p-4", sheetMode && "sticky bottom-0 bg-card")}>
            <button type="button" onClick={handleSubmit} disabled={!canTrade}
              className={cn("w-full min-h-11 rounded-xl py-3 text-sm font-bold tracking-wide transition-all",
                !canTrade ? "cursor-not-allowed bg-muted text-muted-foreground"
                  : side === "BUY" ? "bg-emerald-600 text-white shadow-[0_4px_20px_rgba(16,185,129,.35)] hover:bg-emerald-500"
                  : "bg-rose-600 text-white shadow-[0_4px_20px_rgba(239,68,68,.3)] hover:bg-rose-500")}>
              {isOrderProcessing ? "Placing order..." : isOppositeExitFlow
                ? `${side} EXIT | ${effectiveQuantity.toLocaleString("en-IN")} qty`
                : `${side} ${selectedStock.symbol} | ${effectiveQuantity.toLocaleString("en-IN")} qty`}
            </button>
            <p className="mt-2 text-center text-[10px] text-muted-foreground">Paper trading | instant fill</p>
          </div>
        )}

        <OrderProcessingDialog isProcessing={isOrderProcessing} errorMessage={orderProcessingError} onDismissError={clearOrderProcessingError} />
        <TradeConfirmationDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog} selectedStock={selectedStock} side={side} quantityValue={effectiveQuantity} currentPrice={currentPrice} requiredMargin={finalRequiredMargin} productType={productType} leverageValue={leverageValue} isProcessing={isOrderProcessing} onConfirm={confirmTrade} />
      </div>
    </TooltipProvider>
  );
}
