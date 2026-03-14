"use client";

import { useRouter } from 'next/navigation';
import { BarChart3, MoreVertical, Plus, ShoppingCart, Trash2, WalletCards } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Stock } from '@paper-market/core';
import { useMarketStore } from '@/stores/trading/market.store';
import { useAddInstrument, useRemoveInstrument } from '@/hooks/queries/use-watchlists';
import { toast } from 'sonner';

interface WatchlistItemMenuProps {
  stock: Stock;
  isInWatchlist?: boolean;
  onSelect?: (stock: Stock) => void;
  onRemoved?: (stock: Stock) => void;
}

export function WatchlistItemMenu({ stock, isInWatchlist = true, onSelect, onRemoved }: WatchlistItemMenuProps) {
  const router = useRouter();
  const { activeWatchlistId } = useMarketStore();
  const { mutateAsync: addInstrument } = useAddInstrument(activeWatchlistId || '');
  const { mutateAsync: removeInstrument } = useRemoveInstrument(activeWatchlistId || '');

  const handleOpenChart = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(stock);
  };

  const handleTrade = (side: 'BUY' | 'SELL') => (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(stock);
    window.triggerTrade?.(side);
  };

  const handleOpenOptionsChain = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/trade/options?underlying=${encodeURIComponent(stock.symbol)}`);
  };

  const handleAddToWatchlist = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!stock.instrumentToken) {
      toast.error('Cannot add: Missing instrument token');
      return;
    }

    if (!activeWatchlistId) {
      toast.error('No active watchlist selected');
      return;
    }

    try {
      await addInstrument(stock);
      toast.success(`Added ${stock.symbol} to watchlist`);
    } catch (error) {
      toast.error('Failed to add to watchlist');
    }
  };

  const handleRemoveFromWatchlist = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!stock.instrumentToken) {
      toast.error('Cannot remove: Missing instrument token');
      return;
    }

    if (!activeWatchlistId) {
      toast.error('No active watchlist selected');
      return;
    }

    try {
      onRemoved?.(stock);
      toast.success(`Removed ${stock.symbol} from watchlist`);
      await removeInstrument(stock.instrumentToken);
    } catch (error) {
      toast.error('Failed to remove from watchlist');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 p-1">
        <DropdownMenuItem onClick={handleOpenChart} className="gap-2 cursor-pointer">
          <BarChart3 className="h-4 w-4" />
          <span>Open Chart</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleTrade('BUY')} className="gap-2 cursor-pointer">
          <ShoppingCart className="h-4 w-4" />
          <span>Buy {stock.symbol}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleTrade('SELL')} className="gap-2 cursor-pointer">
          <WalletCards className="h-4 w-4" />
          <span>Sell {stock.symbol}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleOpenOptionsChain} className="gap-2 cursor-pointer">
          <MoreVertical className="h-4 w-4" />
          <span>Open Options Chain</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {!isInWatchlist ? (
          <DropdownMenuItem onClick={handleAddToWatchlist} className="gap-2 cursor-pointer">
            <Plus className="h-4 w-4" />
            <span>Add to Watchlist</span>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem 
            onClick={handleRemoveFromWatchlist} 
            className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            <span>Remove from Watchlist</span>
          </DropdownMenuItem>
        )}
        

      </DropdownMenuContent>
    </DropdownMenu>
  );
}
