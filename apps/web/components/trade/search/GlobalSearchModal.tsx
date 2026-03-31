"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Search, TrendingUp, Bookmark } from "lucide-react";
import { useMarketStore } from "@/stores/trading/market.store";
import { Stock } from "@paper-market/core";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAddInstrument, useRemoveInstrument } from "@/hooks/queries/use-watchlists";

interface GlobalSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectStock?: (stock: Stock) => void;
  searchMode?: "ALL" | "EQUITY" | "FUTURE" | "OPTION";
  placeholder?: string;
}

type SearchCategory = "ALL" | "Cash";

const CATEGORIES: SearchCategory[] = ["ALL", "Cash"];

export function GlobalSearchModal({
  open,
  onOpenChange,
  onSelectStock,
  searchMode = "ALL",
  placeholder = "Search stocks, indices...",
}: GlobalSearchModalProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<SearchCategory>("ALL");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [addedInstruments, setAddedInstruments] = useState<Set<string>>(new Set());
  const [isLocalLoading, setIsLocalLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const { searchInstruments, searchResults, isSearching, activeWatchlistId } =
    useMarketStore();

  const addInstrumentMutation = useAddInstrument(activeWatchlistId || "");
  const removeInstrumentMutation = useRemoveInstrument(activeWatchlistId || "");

  const handleSelect = useCallback(
    (stock: Stock) => {
      onSelectStock?.(stock);
      onOpenChange(false);
    },
    [onSelectStock, onOpenChange]
  );

  useEffect(() => {
    if (query.length === 0) {
        setIsLocalLoading(false);
        searchInstruments('');
        return;
    }
    if (query.length === 1) {
        setIsLocalLoading(false);
        return;
    }
    setIsLocalLoading(true);
    const handler = setTimeout(() => {
        searchInstruments(query, searchMode);
        setIsLocalLoading(false);
    }, 150);
    return () => clearTimeout(handler);
  }, [query, searchInstruments, searchMode]);

  /* Reset on open */
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setActiveCategory("ALL");
      setAddedInstruments(new Set());
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  /* Reset selected index when results change */
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults]);

  /* Keyboard navigation */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open || !searchResults.length) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev === searchResults.length - 1 ? 0 : prev + 1
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev === 0 ? searchResults.length - 1 : prev - 1
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleSelect(searchResults[selectedIndex]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, searchResults, selectedIndex, handleSelect]);

  /* Watchlist toggle */
  const handleToggleWatchlist = async (stock: Stock, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!activeWatchlistId) {
      toast.error("No watchlist selected");
      return;
    }

    const token = stock.instrumentToken;
    if (!token) {
      toast.error("Missing instrument token");
      return;
    }

    const isAdded = addedInstruments.has(token);

    try {
      if (isAdded) {
        setAddedInstruments((prev) => {
          const next = new Set(prev);
          next.delete(token);
          return next;
        });
        await removeInstrumentMutation.mutateAsync(token);
        toast.success(`Removed ${stock.symbol} from watchlist`);
      } else {
        setAddedInstruments((prev) => new Set(prev).add(token));
        await addInstrumentMutation.mutateAsync(stock);
        toast.success(`Added ${stock.symbol} to watchlist`);
      }
    } catch (error: unknown) {
      setAddedInstruments((prev) => {
        const next = new Set(prev);
        if (isAdded) next.add(token);
        else next.delete(token);
        return next;
      });
      
      if (!isAdded) {
        // !isAdded means we were trying to ADD the instrument and it failed
        toast.error("Unable to add: Watchlist limit of 20 instruments reached.");
      } else {
        toast.error("Failed to remove from watchlist.");
      }
    }
  };

  const showLoading = (isSearching || isLocalLoading) && query.length > 1;
  const showEmpty = !isSearching && !isLocalLoading && query.length > 1 && searchResults.length === 0;
  const showPrompt = query.length <= 1;
  const showResults = !isSearching && !isLocalLoading && searchResults.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[94vw] max-w-3xl h-[85vh] sm:h-[600px] gap-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-0 text-foreground shadow-2xl dark:border-white/10 dark:bg-[#0c1322] dark:text-slate-100 sm:w-[92vw] flex flex-col">

        {/* Header */}
        <DialogHeader className="shrink-0 border-b border-slate-200/80 px-4 pb-3 pt-4 sm:px-6 sm:pb-4 sm:pt-5 dark:border-white/10">
          <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-white">
            Symbol Search
          </DialogTitle>
        </DialogHeader>

        {/* Search input */}
        <div className="shrink-0 px-4 pt-4 pb-3 sm:px-6 sm:pt-5 sm:pb-4">
          <div className="relative flex items-center">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="h-10 sm:h-11 rounded-lg border-slate-200/80 bg-slate-50/70 pl-10 pr-4 text-slate-900 placeholder:text-slate-400 shadow-sm focus-visible:border-blue-500 focus-visible:ring-0 focus-visible:ring-offset-0 dark:border-white/10 dark:bg-[#10192b] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus-visible:border-blue-400"
            />
          </div>
        </div>

        {/* Category pills */}
        <div className="shrink-0 flex flex-wrap gap-2 border-b border-slate-200/80 px-4 pb-3 sm:px-6 dark:border-white/10">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat}
              variant="ghost"
              size="sm"
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "h-8 rounded-lg border px-3 text-[11px] font-semibold transition-colors",
                activeCategory === cat
                  ? "border-blue-500/40 bg-blue-600/10 text-blue-500 hover:bg-blue-600/15 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-400 dark:hover:bg-blue-500/20"
                  : "border-slate-200/80 bg-white text-slate-600 hover:border-slate-200 hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:bg-transparent dark:text-slate-300 dark:hover:border-white/20 dark:hover:bg-white/[0.05] dark:hover:text-white"
              )}
            >
              {cat}
            </Button>
          ))}
        </div>

        {/* Results area */}
        <TooltipProvider delayDuration={80} skipDelayDuration={200}>
          <ScrollArea className="flex-1 min-h-0 w-full relative">

            {/* Prompt state */}
            {showPrompt && (
              <div className="flex flex-col items-center justify-center h-full absolute inset-0 text-center p-8">
                <TrendingUp className="mb-4 h-12 w-12 text-muted-foreground/45 dark:text-slate-500/40" />
                <p className="text-sm text-muted-foreground dark:text-slate-400">
                  Start typing to search instruments
                </p>
              </div>
            )}

            {/* Loading state */}
            {showLoading && (
              <div className="flex flex-col items-center justify-center h-full absolute inset-0 gap-3 p-8">
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="block h-2 w-2 rounded-full bg-blue-500/70 dark:bg-blue-400/60"
                      style={{
                        animation: "bounce 1.2s ease-in-out infinite",
                        animationDelay: `${i * 0.2}s`,
                      }}
                    />
                  ))}
                </div>
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  Searching instruments...
                </p>
                <style>{`
                  @keyframes bounce {
                    0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
                    40% { transform: translateY(-6px); opacity: 1; }
                  }
                `}</style>
              </div>
            )}

            {/* Empty state */}
            {showEmpty && (
              <div className="flex flex-col items-center justify-center h-full absolute inset-0 gap-2 p-8">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  No results for &ldquo;{query}&rdquo;
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Try a different symbol or company name
                </p>
              </div>
            )}

            {/* Results list */}
            {showResults && (
              <div className="divide-y divide-slate-200/70 dark:divide-white/10">
                {/* Table header */}
                <div className="hidden sm:grid grid-cols-12 gap-4 bg-slate-50/70 px-6 py-2 text-xs font-semibold tracking-wide text-slate-500 dark:bg-white/[0.03] dark:text-slate-400 sticky top-0 z-10">
                  <div className="col-span-4">SYMBOL</div>
                  <div className="col-span-5">DESCRIPTION</div>
                  <div className="col-span-2 text-right">EXCHANGE</div>
                  <div className="col-span-1" />
                </div>

                <div className="pb-4">
                  {searchResults.map((stock, idx) => {
                    const token = stock.instrumentToken;
                    const isAdded = token ? addedInstruments.has(token) : false;
                    const isPending =
                      addInstrumentMutation.isPending ||
                      removeInstrumentMutation.isPending;

                    return (
                      <div
                        key={`${stock.symbol}-${idx}`}
                        onClick={() => handleSelect(stock)}
                        className={cn(
                          "flex cursor-pointer flex-col gap-2 border-l-2 px-4 py-3 transition-colors sm:grid sm:grid-cols-12 sm:gap-4 sm:px-6",
                          selectedIndex === idx
                            ? "border-blue-500 bg-blue-600/10 dark:border-blue-500 dark:bg-blue-500/15"
                            : "border-transparent hover:bg-slate-100/60 dark:hover:bg-white/[0.04]"
                        )}
                      >
                        {/* Symbol + mobile exchange badge */}
                        <div className="flex items-center justify-between sm:block sm:col-span-4 text-sm font-semibold text-foreground dark:text-white">
                          <span>{stock.symbol}</span>
                          <span className="inline-flex items-center rounded border border-slate-200/80 bg-slate-50/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 sm:hidden dark:border-white/15 dark:bg-white/[0.04] dark:text-slate-300">
                            {(stock as Stock & { segment?: string }).segment === 'BSE_EQ' ? 'BSE' : 'NSE'}
                          </span>
                        </div>

                        {/* Name */}
                        <div className="truncate text-sm text-muted-foreground sm:col-span-5 dark:text-slate-300">
                          {stock.name}
                        </div>

                        {/* Desktop exchange badge */}
                        <div className="hidden sm:flex sm:col-span-2 sm:justify-end">
                          <span className="inline-flex items-center rounded border border-slate-200/80 bg-slate-50/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:border-white/15 dark:bg-white/[0.04] dark:text-slate-300">
                            {(stock as Stock & { segment?: string }).segment === 'BSE_EQ' ? 'BSE' : 'NSE'}
                          </span>
                        </div>

                        {/* Bookmark */}
                        <div className="flex justify-end sm:col-span-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={isPending}
                                onClick={(e) => handleToggleWatchlist(stock, e)}
                                className={cn(
                                  "h-7 w-7 border border-transparent text-muted-foreground opacity-80 hover:border-border hover:bg-muted hover:text-foreground hover:opacity-100 dark:text-slate-400 dark:hover:border-white/15 dark:hover:bg-white/[0.06] dark:hover:text-white",
                                  isAdded &&
                                    "border-blue-500/40 bg-blue-600/10 text-blue-500 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-400"
                                )}
                              >
                                <Bookmark
                                  className={cn("h-4 w-4", isAdded && "fill-current")}
                                />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                              {isAdded ? "Remove from watchlist" : "Add to watchlist"}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </ScrollArea>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}