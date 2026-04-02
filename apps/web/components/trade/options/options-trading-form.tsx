"use client";

import { useState, useEffect, useMemo } from 'react';
import { Stock, formatExpiryLabel, parseOptionSymbol } from "@paper-market/core";
import { cn } from "@/lib/utils";
import { TooltipProvider } from '@/components/ui/tooltip';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { useTradeExecutionStore } from '@/stores/trading/tradeExecution.store';
import { useWalletStore } from '@/stores/wallet.store';
import { usePositionsStore } from '@/stores/trading/positions.store';
import { useInstrumentPrice } from '@/hooks/useInstrumentPrice';
import { useMarginPreview } from '@/hooks/useMarginPreview';
import { getExitQuantity } from '@/utils/trading/position-exit';

import { TradePriceDisplay } from '../shared/trade-price-display';
import { TradeMarginSummary, formatMoney } from '../shared/trade-margin-summary';
import { TradeControls } from '../shared/trade-controls';
import { parseExpiryDate, toExpiryIso } from '../shared/utils';
import { InstrumentSelector, InstrumentType } from '../form/InstrumentSelector';
import { StockSearch, OrderTypeToggle, OrderProcessingDialog, TradeConfirmationDialog, OptionsRiskMetrics, OptionsPayoffChart } from '../form';

interface OptionsTradingFormProps {
  selectedStock: Stock | null;
  onStockSelect: (stock: Stock) => void;
  instruments: Stock[];
  sheetMode?: boolean;
  activeInstrumentType?: InstrumentType;
  onInstrumentTypeChange?: (type: InstrumentType) => void;
  allowedInstrumentTypes?: InstrumentType[];
}

export function OptionsTradingForm({
  selectedStock,
  onStockSelect,
  instruments,
  sheetMode = false,
  activeInstrumentType,
  onInstrumentTypeChange,
  allowedInstrumentTypes
}: OptionsTradingFormProps) {
  const [localInstrumentType, setLocalInstrumentType] = useState<InstrumentType>("NIFTY");
  const instrumentType = activeInstrumentType || localInstrumentType;
  const setInstrumentType = (type: InstrumentType) => {
    if (onInstrumentTypeChange) {
      onInstrumentTypeChange(type);
    } else {
      setLocalInstrumentType(type);
    }
  };

  const [selectedExpiry, setSelectedExpiry] = useState<string>("");
  const [selectedStrike, setSelectedStrike] = useState<string>("");
  const [optionType, setOptionType] = useState<"CE" | "PE">("CE");

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

  const currentPrice = useInstrumentPrice(selectedStock, instrumentType);
  const leverageValue = parseInt(leverage) || 1;
  const inputValue = parseInt(quantity) || 0;
  
  const getLotSize = () => {
    if (selectedStock?.lotSize) return selectedStock.lotSize;
    if (instrumentType === 'NIFTY') return 50;
    if (instrumentType === 'BANKNIFTY') return 15;
    if (instrumentType === 'FINNIFTY') return 25;
    return 1;
  };
  const lotSize = getLotSize();

  const isSearchDrivenDerivative = instrumentType === "STOCK OPTIONS";

  useEffect(() => {
    if (isSearchDrivenDerivative) return;
    const expiries = Array.from(new Set(instruments
      .filter(i => i.expiryDate)
      .map(i => toExpiryIso(i.expiryDate))
      .filter(Boolean)
    )).sort();
    if (expiries.length === 0) { if (selectedExpiry) setSelectedExpiry(""); return; }
    if (!selectedExpiry || !expiries.includes(selectedExpiry)) setSelectedExpiry(expiries[0]);
  }, [instruments, isSearchDrivenDerivative, selectedExpiry]);

  useEffect(() => {
    if (isSearchDrivenDerivative) return;
    
    let match: Stock | undefined;
    if (selectedExpiry && selectedStrike) {
      match = instruments.find(i =>
        toExpiryIso(i.expiryDate) === selectedExpiry &&
        parseOptionSymbol(i.symbol)?.strike === parseFloat(selectedStrike) &&
        parseOptionSymbol(i.symbol)?.type === optionType
      );
    }
    
    if (match && !match.instrumentToken) return;
    if (match && match.symbol !== selectedStock?.symbol) onStockSelect(match);
  }, [isSearchDrivenDerivative, selectedExpiry, selectedStrike, optionType, instruments, onStockSelect, selectedStock]);

  const availableExpiries = useMemo(() => {
    const dates = instruments.map(i => parseExpiryDate(i.expiryDate)).filter((d): d is Date => Boolean(d));
    return Array.from(new Set(dates.map(d => d.getTime()))).map(t => new Date(t)).sort((a, b) => a.getTime() - b.getTime());
  }, [instruments]);

  const availableStrikes = useMemo(() => {
    const withExpiry = instruments.filter(i => toExpiryIso(i.expiryDate) === selectedExpiry);
    const strikes = new Set<number>();
    withExpiry.forEach(i => { const p = parseOptionSymbol(i.symbol); if (p) strikes.add(p.strike); });
    return Array.from(strikes).sort((a, b) => a - b);
  }, [instruments, selectedExpiry]);

  const {
    isOppositeExitFlow,
    effectiveQuantity,
    existingPositionQty
  } = getExitQuantity(positions, selectedStock?.instrumentToken, side, 'options', inputValue * lotSize);

  const effectiveInputValue = isOppositeExitFlow ? Math.max(1, Math.round(effectiveQuantity / Math.max(1, lotSize))) : inputValue;

  const slValue = parseFloat(stopLoss);
  const targetValue = parseFloat(target);
  const hasSl = stopLoss.trim() !== '' && !isNaN(slValue);
  const hasTarget = target.trim() !== '' && !isNaN(targetValue);

  let isSlValid = true;
  if (hasSl) isSlValid = side === 'BUY' ? slValue < currentPrice : slValue > currentPrice;
  let isTargetValid = true;
  if (hasTarget) isTargetValid = side === 'BUY' ? targetValue > currentPrice : targetValue < currentPrice;

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
      }, lotSize, "options");

      toast.success('Trade Sent', { description: `${side} ${effectiveQuantity} units of ${selectedStock.symbol} at market.` });
      setShowConfirmDialog(false);
      setTimeout(() => { setQuantity('1'); setStopLoss(''); setTarget(''); }, 300);
    } catch (err) {
      const fallbackMessage = err instanceof Error ? err.message : 'Order placement failed';
      const message = fallbackMessage.includes('PARTIAL_EXIT_NOT_ALLOWED')
        ? 'Partial exit is disabled in paper trading mode.'
        : fallbackMessage;
      toast.error('Order Failed', { description: message });
    }
  };

  return (
    <TooltipProvider>
      <Card className={cn("bg-card border-border h-full rounded-sm shadow-none flex flex-col min-h-0", sheetMode && "rounded-none border-0 bg-transparent")}>
        <CardHeader className="pb-2 p-3">
          <InstrumentSelector value={instrumentType} onChange={setInstrumentType} hideStockOptions={false} allowedValues={allowedInstrumentTypes} />
        </CardHeader>
        <CardContent className={cn("space-y-4 p-3 flex-1 min-h-0 overflow-y-auto", sheetMode && "px-4 pb-24")}>

          {isSearchDrivenDerivative && (
            <StockSearch
              selectedStock={selectedStock} onStockSelect={onStockSelect}
              instruments={instruments} instrumentMode='options'
              label="Search Stock Option" placeholder="e.g. RELIANCE, TCS..."
            />
          )}

          {!isSearchDrivenDerivative && (
            <div className="space-y-4 rounded-sm bg-muted/30 p-3 border border-border">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Expiry</Label>
                <Select value={selectedExpiry} onValueChange={setSelectedExpiry}>
                  <SelectTrigger className="bg-input border-border h-8 rounded-sm text-xs"><SelectValue placeholder="Select Expiry" /></SelectTrigger>
                  <SelectContent>{availableExpiries.map(exp => (<SelectItem key={exp.toISOString()} value={exp.toISOString()}>{formatExpiryLabel(exp)}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Strike Price</Label>
                  <Select value={selectedStrike} onValueChange={setSelectedStrike}>
                    <SelectTrigger className="bg-input border-border h-8 rounded-sm text-xs"><SelectValue placeholder="Select Strike" /></SelectTrigger>
                    <SelectContent className="max-h-[200px]">{availableStrikes.map(strike => (<SelectItem key={strike} value={strike.toString()}>{strike}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase">Option Type</Label>
                  <ToggleGroup type="single" value={optionType} onValueChange={(v) => v && setOptionType(v as "CE" | "PE")} className="justify-start w-full gap-2">
                    <ToggleGroupItem value="CE" className="flex-1 h-7 text-xs data-[state=on]:bg-green-500/15 data-[state=on]:text-green-600 dark:data-[state=on]:bg-green-500/20 dark:data-[state=on]:text-green-400 border border-border data-[state=on]:border-green-500/30 hover:bg-muted hover:text-foreground transition-all">CE (Call)</ToggleGroupItem>
                    <ToggleGroupItem value="PE" className="flex-1 h-7 text-xs data-[state=on]:bg-red-500/15 data-[state=on]:text-red-600 dark:data-[state=on]:bg-red-500/20 dark:data-[state=on]:text-red-400 border border-border data-[state=on]:border-red-500/30 hover:bg-muted hover:text-foreground transition-all">PE (Put)</ToggleGroupItem>
                  </ToggleGroup>
                </div>
              </div>
            </div>
          )}

          {selectedStock ? (
            <div className="pt-2 border-t">
              <TradePriceDisplay symbol={selectedStock.symbol} currentPrice={currentPrice} side={side} />
              <OrderTypeToggle side={side} onSideChange={setSide} />

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

              <div className="space-y-4 mt-6">
                <OptionsRiskMetrics selectedStock={selectedStock} quantityValue={effectiveInputValue} currentPrice={currentPrice} lotSize={lotSize} side={side} />
                <OptionsPayoffChart selectedStock={selectedStock} quantityValue={effectiveInputValue} currentPrice={currentPrice} lotSize={lotSize} side={side} />
              </div>

              <div className={cn("mt-4 space-y-4", sheetMode && "sticky bottom-0 border-t border-white/[0.08] bg-[#0d1422] py-3")}>
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
                <button onClick={handleSubmit} disabled={!canTrade}
                  className={cn('w-full min-h-11 text-sm font-bold uppercase tracking-widest transition-all rounded-sm shadow-none',
                    !canTrade ? "cursor-not-allowed bg-muted text-muted-foreground" :
                    side === 'BUY' ? 'bg-trade-buy hover:bg-trade-buy/90 text-white' : 'bg-trade-sell hover:bg-trade-sell/90 text-white')}>
                  {isOrderProcessing ? "Placing order..." : isOppositeExitFlow ? `${side} EXIT | ${effectiveQuantity.toLocaleString("en-IN")} qty` : `${side} ${selectedStock?.symbol}`}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center p-8 border rounded-lg bg-muted/10 border-dashed">
              <p className="text-sm text-muted-foreground">Select an instrument to trade</p>
            </div>
          )}
        </CardContent>
      </Card>
      <OrderProcessingDialog isProcessing={isOrderProcessing} errorMessage={orderProcessingError} onDismissError={clearOrderProcessingError} />
      <TradeConfirmationDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog} selectedStock={selectedStock} side={side} quantityValue={effectiveQuantity} currentPrice={currentPrice} requiredMargin={finalRequiredMargin} productType={productType} leverageValue={leverageValue} isProcessing={isOrderProcessing} onConfirm={confirmTrade} />
    </TooltipProvider>
  );
}
