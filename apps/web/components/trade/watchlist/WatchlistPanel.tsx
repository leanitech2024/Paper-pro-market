"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Stock } from '@paper-market/core';
import { Plus, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useMarketStore } from '@/stores/trading/market.store';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from 'sonner';
import { WatchlistItemMenu } from './WatchlistItemMenu';
import { WatchlistSkeleton } from './WatchlistSkeleton';
import {
  useWatchlists,
  useWatchlistInstruments,
  useCreateWatchlist,
  useDefaultWatchlistSnapshot,
} from '@/hooks/queries/use-watchlists';
import { toCanonicalSymbol, toInstrumentKey, toSymbolKey } from '@paper-market/core';

interface WatchlistPanelProps {
  instruments: Stock[];
  onSelect: (stock: Stock) => void;
  selectedSymbol?: string;
  onOpenSearch: () => void;
  onClearSelection?: () => void;
}

export function WatchlistPanel({ instruments, onSelect, selectedSymbol, onOpenSearch, onClearSelection }: WatchlistPanelProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [hoveredSymbol, setHoveredSymbol] = useState<string | null>(null);
  const [preferredWatchlistId, setPreferredWatchlistId] = useState<string | null>(null);
  const lastAppliedQuerySnapshotRef = useRef<string>('');
  const queryClient = useQueryClient();

  // 🔥 NEW: TanStack Query hooks for data fetching
  const { data: watchlists = [], isLoading: isLoadingWatchlists } = useWatchlists();
  const { data: defaultSnapshot } = useDefaultWatchlistSnapshot();
  const createWatchlistMutation = useCreateWatchlist();

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('lastWatchlistId') : null;
    if (saved) setPreferredWatchlistId(saved);
  }, []);
  
  // Get active watchlist ID from Zustand (UI state only)
  const { activeWatchlistId, setActiveWatchlistId, setStocks } = useMarketStore();
  const quotesByInstrument = useMarketStore((state) => state.quotesByInstrument);
  const selectQuote = useMarketStore((state) => state.selectQuote);
  // 1️⃣ Determine the actual watchlist ID to use
  let resolvedWatchlistId = activeWatchlistId;
  const activeIsValid = watchlists.some(w => w.id === resolvedWatchlistId);

  if (!activeIsValid) {
    // If not valid, try from local storage first
    let fallback = preferredWatchlistId;
    if (!fallback || !watchlists.some(w => w.id === fallback)) {
        // Otherwise use default or first available
        fallback = watchlists.find(w => w.isDefault)?.id || watchlists[0]?.id || null;
    }
    resolvedWatchlistId = fallback;
  }

  // 2️⃣ Sync back to Zustand & LocalStorage
  useEffect(() => {
    if (isLoadingWatchlists) return;
    
    if (resolvedWatchlistId && activeWatchlistId !== resolvedWatchlistId) {
       setActiveWatchlistId(resolvedWatchlistId);
    }
    
    if (resolvedWatchlistId) {
      localStorage.setItem('lastWatchlistId', resolvedWatchlistId);
    }
  }, [resolvedWatchlistId, activeWatchlistId, isLoadingWatchlists, setActiveWatchlistId]);

  // Pre-seed default watchlist snapshot cache on first load
  useEffect(() => {
    if (!defaultSnapshot?.defaultId) return;
    const cached = queryClient.getQueryData(['watchlist', defaultSnapshot.defaultId]);
    if (cached) return;
    queryClient.setQueryData(['watchlist', defaultSnapshot.defaultId], defaultSnapshot.instruments);
  }, [defaultSnapshot, queryClient]);

  // Prefetch resolved watchlist snapshot as soon as we know the ID
  useEffect(() => {
    if (!resolvedWatchlistId) return;
    const cached = queryClient.getQueryData(['watchlist', resolvedWatchlistId]);
    if (cached) return;
    queryClient.prefetchQuery({
      queryKey: ['watchlist', resolvedWatchlistId],
      queryFn: () =>
        fetch(`/api/v1/watchlists/${resolvedWatchlistId}/snapshot`)
          .then((r) => {
            if (!r.ok) throw new Error('Failed to fetch snapshot');
            return r.json();
          })
          .then((r) => r.data as Stock[]),
      staleTime: 15_000,
    });
  }, [resolvedWatchlistId, queryClient]);
  
  // Fetch instruments for active watchlist
  const { data: queryInstruments = [], isLoading: isLoadingInstruments } = useWatchlistInstruments(resolvedWatchlistId);

  // Sync query data to Zustand store (for SSE price updates)
  useEffect(() => {
    if (isLoadingInstruments || !queryInstruments) return;

    // Only apply when query payload itself changed.
    // Do NOT compare against live store state; SSE updates would be overwritten.
    const querySnapshot = queryInstruments
      .map((s) => {
        const price = Number(s.price || 0).toFixed(2);
        const change = Number(s.change || 0).toFixed(2);
        const changePercent = Number(s.changePercent || 0).toFixed(2);
        return `${s.instrumentToken}:${price}:${change}:${changePercent}`;
      })
      .sort()
      .join(',');

    if (querySnapshot === lastAppliedQuerySnapshotRef.current) return;

    setStocks(queryInstruments);
    lastAppliedQuerySnapshotRef.current = querySnapshot;
  }, [queryInstruments, isLoadingInstruments, setStocks]);

  const activeWatchlist = watchlists.find(w => w.id === resolvedWatchlistId);
  const isFetchingWatchlistData = isLoadingWatchlists || isLoadingInstruments;

  // Render immediately from query data; switch to store-backed prices once available.
  const localMatches = useMemo(() => {
    if (instruments.length > 0) return instruments;
    return queryInstruments;
  }, [instruments, queryInstruments]);
  const selectedSymbolKey = useMemo(
    () => toSymbolKey(toCanonicalSymbol(selectedSymbol || "")),
    [selectedSymbol]
  );
  const handleItemRemoved = (stock: Stock) => {
    const removedSymbolKey = toSymbolKey(toCanonicalSymbol(stock.symbol || ""));
    if (removedSymbolKey && removedSymbolKey === selectedSymbolKey) {
      onClearSelection?.();
    }
  };

  const handleCreateWatchlist = async () => {
    if (!newWatchlistName.trim()) return;
    
    try {
      const res = await createWatchlistMutation.mutateAsync(newWatchlistName.trim());
      
      // 🔥 FIX: Switch to the new watchlist immediately
      if (res.success && res.data?.id) {
        setActiveWatchlistId(res.data.id);
      }
      
      setNewWatchlistName('');
      setIsCreating(false);
      toast.success('Watchlist created');
    } catch (error) {
        toast.error('Failed to create watchlist');
    }
  };

  // ═══════════════════════════════════════════════════════════
  //  SKELETON LOADER: Show placeholders while fetching
  // ═══════════════════════════════════════════════════════════
  if (isFetchingWatchlistData && localMatches.length === 0) {
    return <WatchlistSkeleton />;
  }

  return (
    <div className="flex h-full min-h-0 w-full max-w-full flex-col overflow-hidden overscroll-y-contain border-r border-slate-200/80 bg-white dark:border-white/[0.08] dark:bg-[#0c1322]">
      {/* Header with Selector */}
      <div className="flex items-center justify-between px-3 h-9 border-b border-slate-200/80 bg-slate-50/80 dark:border-white/[0.08] dark:bg-[#10192b]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-900 hover:text-slate-950 dark:text-slate-100 dark:hover:text-white transition-colors">
              {activeWatchlist?.name || 'Watchlist'}
              <ChevronDown className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {watchlists.map(watchlist => (
              <DropdownMenuItem
                key={watchlist.id}
                onClick={() => setActiveWatchlistId(watchlist.id)}
                className={cn(
                  "text-xs cursor-pointer",
                  watchlist.id === resolvedWatchlistId && "bg-slate-100 font-medium dark:bg-white/[0.06]"
                )}
              >
                {watchlist.name}
                {watchlist.isDefault && (
                  <span className="ml-auto text-[10px] text-muted-foreground"></span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setIsCreating(true)}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Create Watchlist Dialog */}
      <Dialog open={isCreating} onOpenChange={(open) => {
        setIsCreating(open);
        if (!open) setNewWatchlistName('');
      }}>
        <DialogContent className="sm:max-w-[425px] bg-white/90 dark:bg-[#0c1322]/95 backdrop-blur-xl border-slate-200/80 dark:border-white/[0.08] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">Create New Watchlist</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Watchlist Name
              </label>
              <Input
                id="name"
                className="h-10 text-sm focus-visible:ring-primary/50"
                placeholder="e.g. My Favorites, Long Term..."
                value={newWatchlistName}
                onChange={(e) => setNewWatchlistName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateWatchlist();
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              size="sm"
              className="px-4"
              onClick={() => {
                setIsCreating(false);
                setNewWatchlistName('');
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              onClick={handleCreateWatchlist}
              disabled={!newWatchlistName.trim() || createWatchlistMutation.isPending}
            >
              {createWatchlistMutation.isPending ? 'Creating...' : 'Create Watchlist'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* List Content */}
      <ScrollArea className="flex-1 min-h-0 h-full overscroll-y-contain">
        <div className="flex flex-col">
          {localMatches.map((stock, i) => {
            const quoteKey = stock.instrumentToken
              ? toInstrumentKey(stock.instrumentToken)
              : "";
            const quote = quoteKey
              ? (quotesByInstrument[quoteKey] || selectQuote(quoteKey))
              : null;
            const fallbackPrice = Number(stock.price);
            const fallbackChange = Number(stock.change);
            const fallbackChangePercent = Number(stock.changePercent);
            const hasFallbackPrice = Number.isFinite(fallbackPrice) && fallbackPrice > 0;

            const quotePrice = typeof quote?.price === 'number' ? quote.price : undefined;
            const quoteChange = typeof quote?.change === 'number' ? quote.change : undefined;
            const quoteChangePercent =
              typeof quote?.changePercent === 'number' ? quote.changePercent : undefined;

            const hasLiveQuote = Number.isFinite(quotePrice) && (quotePrice ?? 0) > 0;
            const livePrice = hasLiveQuote ? quotePrice : (hasFallbackPrice ? fallbackPrice : undefined);
            const liveChange = hasLiveQuote
              ? (Number.isFinite(quoteChange) ? quoteChange : 0)
              : (hasFallbackPrice && Number.isFinite(fallbackChange) ? fallbackChange : undefined);
            const liveChangePercent = hasLiveQuote
              ? (Number.isFinite(quoteChangePercent) ? quoteChangePercent : 0)
              : (hasFallbackPrice && Number.isFinite(fallbackChangePercent) ? fallbackChangePercent : undefined);

            const hasQuote = Number.isFinite(livePrice) && (livePrice ?? 0) > 0;
            const renderedStock: Stock = {
              ...stock,
              price: Number.isFinite(livePrice) ? (livePrice as number) : 0,
              change: Number.isFinite(liveChange) ? (liveChange as number) : 0,
              changePercent: Number.isFinite(liveChangePercent) ? (liveChangePercent as number) : 0,
            };

            return (
            <div
              key={`${stock.symbol}-${i}`}
              onClick={() => onSelect(renderedStock)}
              onMouseEnter={() => {
                setHoveredSymbol(stock.symbol);
              }}
              onMouseLeave={() => setHoveredSymbol(null)}
              className={cn(
                "group flex items-center justify-between px-3 py-2.5 border-b border-slate-200/60 dark:border-white/[0.05] cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.03]",
                selectedSymbolKey === toSymbolKey(toCanonicalSymbol(stock.symbol)) &&
                  "bg-slate-100/80 border-l-2 border-l-primary dark:bg-white/[0.06]"
              )}
            >
              {/* Left: Symbol + Name */}
              <div className="flex flex-col gap-1 flex-1">
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{stock.symbol}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[140px]">{stock.name}</span>
              </div>
              
              {/* Right: Price/Percentage OR B/S Buttons */}
              <div className="flex items-center gap-2">
                {hoveredSymbol !== stock.symbol ? (
                  hasQuote ? (
                    <div className="flex w-20 flex-col items-end gap-1">
                      <span
                        className="text-sm font-mono font-semibold"
                        style={{ color: (liveChange ?? 0) >= 0 ? '#089981' : '#F23645' }}
                      >
                        {(livePrice as number).toLocaleString('en-IN')}
                      </span>
                      <div className="flex items-center gap-1 text-xs font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        <span>
                          {`${(liveChange ?? 0) >= 0 ? '+' : ''}${(liveChange ?? 0).toFixed(2)}`}
                        </span>
                        <span>
                          {`(${(liveChangePercent ?? 0).toFixed(2)}%)`}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-20" />
                  )
                ) : (
                  // Hover State: Show B/S Buttons + Menu
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(renderedStock);
                        window.triggerTrade?.('BUY');
                      }}
                      className="h-7 px-3 text-xs font-bold border border-[#089981] text-[#089981] bg-transparent hover:bg-[#089981] hover:text-white transition-colors"
                    >
                      B
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(renderedStock);
                        window.triggerTrade?.('SELL');
                      }}
                      className="h-7 px-3 text-xs font-bold border border-[#F23645] text-[#F23645] bg-transparent hover:bg-[#F23645] hover:text-white transition-colors"
                    >
                      S
                    </Button>
                    <div className="pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                      <WatchlistItemMenu
                        stock={renderedStock}
                        isInWatchlist={true}
                        onSelect={onSelect}
                        onRemoved={handleItemRemoved}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
            );
          })}
          
          {!isFetchingWatchlistData && localMatches.length === 0 && (
            <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
              No symbols in watchlist
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

