"use client";

import { TradingForm } from "@/components/trade/TradingForm";
import { Stock } from "@paper-market/core";

interface EquityTradeFormProps {
  selectedStock: Stock | null;
  onStockSelect: (stock: Stock) => void;
  instruments: Stock[];
  sheetMode?: boolean;
  onOpenSearch?: () => void;
}

export function EquityTradeForm({
  selectedStock,
  onStockSelect,
  instruments,
  sheetMode = false,
  onOpenSearch,
}: EquityTradeFormProps) {
  return (
    <TradingForm
      selectedStock={selectedStock}
      onStockSelect={onStockSelect}
      instruments={instruments}
      instrumentMode="equity"
      sheetMode={sheetMode}
      onOpenSearch={onOpenSearch}
    />
  );
}

