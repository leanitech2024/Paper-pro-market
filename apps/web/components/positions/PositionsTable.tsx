"use client";
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { UserPosition as Position } from '@paper-market/core';
import { usePositionsStore } from '@/stores/trading/positions.store';
import { useMarketStore } from '@/stores/trading/market.store';
import { cn, formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatExpiryLabel, daysToExpiry, isExpired } from '@paper-market/core';
import Spinner from '@/components/ui/spinner';
import { toInstrumentKey } from '@paper-market/core';
import { PartialCloseDialog } from '@/components/positions/PartialCloseDialog';

interface PositionsTableProps {
  loading?: boolean;
}

export function PositionsTable({ loading: parentLoading = false }: PositionsTableProps) {
  const positions = usePositionsStore((state) => state.positions);
  const fetchPositions = usePositionsStore((state) => state.fetchPositions);
  const isLoading = usePositionsStore((state) => state.isLoading);
  const closePosition = usePositionsStore((state) => state.closePosition);
  const quotesByInstrument = useMarketStore((state) => state.quotesByInstrument);
  const selectQuote = useMarketStore((state) => state.selectQuote);
  
  const loading = parentLoading || isLoading;
  
  const [closingPosition, setClosingPosition] = useState<Position | null>(null);
  const [closingPositionId, setClosingPositionId] = useState<string | null>(null); // Track which position is closing
  useEffect(() => {
    fetchPositions();
    // Poll lightly for structural recovery only (SSE remains price source of truth).
    const interval = setInterval(() => fetchPositions(true), 30000);
    return () => clearInterval(interval);
  }, [fetchPositions]);



  const getLivePrice = (position: Position): number => {
    const tokenKey = toInstrumentKey(position.instrumentToken || "");
    if (tokenKey) {
      const tokenQuote = quotesByInstrument[tokenKey] || selectQuote(tokenKey);
      const tokenLive = Number(tokenQuote?.price);
      return Number.isFinite(tokenLive) && tokenLive > 0 ? tokenLive : 0;
    }

    const symbolQuote = selectQuote(position.symbol);
    const symbolLive = Number(symbolQuote?.price);
    return Number.isFinite(symbolLive) && symbolLive > 0 ? symbolLive : 0;
  };

  const getDisplayPrice = (position: Position): number => {
    const live = getLivePrice(position);
    if (live > 0) return live;
    const cached = Number(position.currentPrice);
    return Number.isFinite(cached) && cached > 0 ? cached : 0;
  };

  const hasDisplayPrice = (position: Position) => getDisplayPrice(position) > 0;

  const calculatePnL = (position: Position, currentPrice: number) => {
    if (currentPrice === 0) return 0;

    return position.side === 'BUY'
      ? (currentPrice - position.entryPrice) * position.quantity
      : (position.entryPrice - currentPrice) * position.quantity;
  };

  const getPositionPnL = (position: Position) => {
    const livePrice = getLivePrice(position);
    if (livePrice > 0) return calculatePnL(position, livePrice);

    const cachedPnl = Number(position.currentPnL);
    if (Number.isFinite(cachedPnl)) return cachedPnl;

    const fallbackPrice = getDisplayPrice(position);
    if (fallbackPrice > 0) return calculatePnL(position, fallbackPrice);

    return 0;
  };


  // handleClose is now delegated to PartialCloseDialog's internal submit

  const hasFetched = usePositionsStore((s) => s.hasFetched);

  const panelClass = "rounded-[28px] border border-slate-200/80 bg-white dark:border-white/[0.08] dark:bg-[#0c1322] shadow-sm overflow-hidden flex flex-col";

  if (!hasFetched) {
    return (
      <div className={panelClass}>
        <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-white/[0.08] bg-slate-50/50 dark:bg-black/10">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-950 dark:text-slate-100">
            <TrendingUp className="h-5 w-5 text-slate-600 dark:text-slate-300" />
            Open Positions
          </h2>
        </div>
        <div className="flex flex-col items-center justify-center py-20">
          <Spinner size={40} className="text-slate-400" />
          <p className="mt-4 font-medium text-slate-500 dark:text-slate-400">
            Loading positions...
          </p>
        </div>
      </div>
    );
  }


  return (
    <>
      <div className={panelClass}>
        <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-white/[0.08] bg-slate-50/50 dark:bg-black/10">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-950 dark:text-slate-100">
            <TrendingUp className="h-5 w-5 text-slate-600 dark:text-slate-300" />
            Open Positions
            {positions.length > 0 && (
              <Badge variant="secondary" className="bg-slate-200/50 text-slate-700 dark:bg-white/[0.08] dark:text-slate-300 border-none px-2 py-0.5 h-6">
                {positions.length}
              </Badge>
            )}
          </h2>
        </div>
        <div className="p-0 flex flex-col flex-1 min-h-0">
          {positions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center text-slate-500 dark:text-slate-400">
              <div className="h-20 w-20 bg-slate-100 dark:bg-white/[0.02] rounded-full flex items-center justify-center mb-4">
                <TrendingUp className="h-10 w-10 opacity-30" />
              </div>
              <p className="text-lg font-semibold text-slate-950 dark:text-slate-100">No Open Positions</p>
              <p className="text-sm mt-1">Start trading to see your positions here</p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="sm:hidden space-y-3 p-4">
                {positions.map((position) => {
                  const displayPrice = getDisplayPrice(position);
                  const hasQuote = hasDisplayPrice(position);
                  const pnl = getPositionPnL(position);
                  const pnlPercent = ((pnl / (position.entryPrice * position.quantity)) * 100).toFixed(2);

                  return (
                    <div key={position.id} className="bg-muted/30 rounded-lg p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{position.symbol}</span>
                            <Badge variant="outline" className="text-xs">{position.instrument?.toUpperCase() || 'EQUITY'}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {position.productType} • {position.quantity} qty
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            'font-medium text-xs',
                            position.side === 'BUY'
                              ? 'border-success text-success'
                              : 'border-destructive text-destructive'
                          )}
                        >
                          {position.side}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Entry</p>
                          <p className="font-medium">{formatCurrency(position.entryPrice)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Current</p>
                          <p className="font-medium">{hasQuote ? formatCurrency(displayPrice) : '--'}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-muted-foreground text-xs">P&L</p>
                          <div className={cn(
                            'font-semibold flex items-center gap-2',
                            hasQuote ? (pnl >= 0 ? 'text-profit' : 'text-loss') : 'text-muted-foreground'
                          )}>
                            {hasQuote ? (
                              <>
                                <span>{pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}</span>
                                <span className="text-xs font-normal">({pnl >= 0 ? '+' : ''}{pnlPercent}%)</span>
                              </>
                            ) : (
                              <span>--</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setClosingPosition(position)}
                          disabled={closingPositionId === position.id}
                          className="w-full border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground h-8 text-xs"
                        >
                          {closingPositionId === position.id ? 'Closing...' : 'Close Position'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-y-auto max-h-[600px]">
                <Table className="relative">
                  <TableHeader className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 backdrop-blur shadow-sm dark:border-white/[0.08] dark:bg-[#0c1322]/95">
                    <TableRow className="border-none hover:bg-transparent px-2">
                      <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-6">Symbol</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider">Type</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider">Side</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Qty</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Entry</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Current</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider text-right">P&L</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider text-right pr-6">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                    {positions.map((position) => {
                      const displayPrice = getDisplayPrice(position);
                      const hasQuote = hasDisplayPrice(position);
                      const pnl = getPositionPnL(position);
                      const pnlPercent = ((pnl / (position.entryPrice * position.quantity)) * 100).toFixed(2);

                      return (
                        <TableRow
                          key={position.id}
                          className={cn(
                            'border-none transition-colors',
                            pnl >= 0 ? 'hover:bg-emerald-500/5 dark:hover:bg-emerald-400/10' : 'hover:bg-rose-500/5 dark:hover:bg-rose-400/10'
                          )}
                        >
                          <TableCell className="pl-6 py-4">
                            <div>
                              <p className="font-semibold text-slate-950 dark:text-slate-100 text-sm">{position.symbol}</p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                                {position.productType} • {position.leverage}x
                                {/* START EXPIRY INDICATOR */}
                                {position.expiryDate && (
                                  <span className={cn(
                                    "ml-1",
                                    isExpired(position.expiryDate) ? "text-muted-foreground" :
                                      daysToExpiry(position.expiryDate) === 0 ? "text-destructive font-medium" :
                                        daysToExpiry(position.expiryDate) === 1 ? "text-orange-500" :
                                          "text-muted-foreground"
                                  )}>
                                    • {formatExpiryLabel(position.expiryDate)}
                                  </span>
                                )}
                                {/* END EXPIRY INDICATOR */}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {position.instrument?.toUpperCase() || 'EQUITY'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                'font-medium',
                                position.side === 'BUY'
                                  ? 'border-success text-success'
                                  : 'border-destructive text-destructive'
                              )}
                            >
                              {position.side === 'BUY' ? (
                                <TrendingUp className="mr-1 h-3 w-3" />
                              ) : (
                                <TrendingDown className="mr-1 h-3 w-3" />
                              )}
                              {position.side}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-foreground font-medium">
                            {position.quantity}
                          </TableCell>
                          <TableCell className="text-right text-foreground">
                            {formatCurrency(position.entryPrice)}
                          </TableCell>
                          <TableCell className="text-right text-foreground">
                            {hasQuote ? formatCurrency(displayPrice) : '--'}
                          </TableCell>
                          <TableCell className={cn(
                            'text-right font-semibold',
                            hasQuote ? (pnl >= 0 ? 'text-profit' : 'text-loss') : 'text-muted-foreground'
                          )}>
                            {hasQuote ? (
                              <div className="animate-pulse-glow">
                                {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
                                <p className="text-xs font-normal">
                                  ({pnl >= 0 ? '+' : ''}{pnlPercent}%)
                                </p>
                              </div>
                            ) : (
                              <span>--</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setClosingPosition(position)}
                              disabled={closingPositionId !== null}
                              className="h-8 px-4 rounded-lg font-semibold whitespace-nowrap"
                            >
                              {closingPositionId === position.id ? 'Closing...' : "Exit Position"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      </div>

      <PartialCloseDialog
        position={closingPosition}
        open={!!closingPosition}
        onOpenChange={(v) => { if (!v) setClosingPosition(null); }}
        livePrice={closingPosition ? getDisplayPrice(closingPosition) : 0}
      />
    </>
  );
}
