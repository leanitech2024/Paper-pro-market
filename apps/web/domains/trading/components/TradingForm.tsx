"use client";

import { Stock, InstrumentMode } from '@paper-market/core';
import { InstrumentType } from '@/domains/trading/components/form/InstrumentSelector';

import { EquityTradingForm } from '@/domains/trading/components/equity/equity-trading-form';
import { FuturesTradingForm } from '@/domains/trading/components/futures/futures-trading-form';
import { OptionsTradingForm } from '@/domains/trading/components/options/options-trading-form';

interface TradingFormProps {
  selectedStock: Stock | null;
  onStockSelect: (stock: Stock) => void;
  instruments: Stock[];
  instrumentMode: InstrumentMode;
  allowedInstrumentTypes?: InstrumentType[];
  sheetMode?: boolean;
  onOpenSearch?: () => void;
  activeInstrumentType?: InstrumentType;
  onInstrumentTypeChange?: (type: InstrumentType) => void;
}

export function TradingForm(props: TradingFormProps) {
  if (props.instrumentMode === 'equity') {
    return (
      <EquityTradingForm 
        selectedStock={props.selectedStock}
        onStockSelect={props.onStockSelect}
        instruments={props.instruments}
        sheetMode={props.sheetMode}
        onOpenSearch={props.onOpenSearch}
      />
    );
  }

  if (props.instrumentMode === 'futures') {
    return (
      <FuturesTradingForm 
        selectedStock={props.selectedStock}
        onStockSelect={props.onStockSelect}
        instruments={props.instruments}
        sheetMode={props.sheetMode}
        activeInstrumentType={props.activeInstrumentType}
        onInstrumentTypeChange={props.onInstrumentTypeChange}
        allowedInstrumentTypes={props.allowedInstrumentTypes}
      />
    );
  }

  return (
    <OptionsTradingForm 
      selectedStock={props.selectedStock}
      onStockSelect={props.onStockSelect}
      instruments={props.instruments}
      sheetMode={props.sheetMode}
      activeInstrumentType={props.activeInstrumentType}
      onInstrumentTypeChange={props.onInstrumentTypeChange}
      allowedInstrumentTypes={props.allowedInstrumentTypes}
    />
  );
}
