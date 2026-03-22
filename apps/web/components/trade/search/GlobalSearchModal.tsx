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
import Spinner from "@/components/ui/spinner";

interface GlobalSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectStock?: (stock: Stock) => void;
  searchMode?: "ALL" | "EQUITY" | "FUTURE" | "OPTION";
  placeholder?: string;
}

type SearchCategory = "ALL" | "Cash" | "F&O" | "Currency" | "Commodity";

export function GlobalSearchModal({
  open,
  onOpenChange,
  onSelectStock,
  searchMode = "ALL",
  placeholder = "Search stocks, indices, commodities...",
}: GlobalSearchModalProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<SearchCategory>("ALL");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [addedInstruments, setAddedInstruments] = useState<Set<string>>(new Set());

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

  /* ------------------ Debounced Search ------------------ */
  useEffect(() => {
    const handler = setTimeout(() => {
      if (query.length > 1) {
        searchInstruments(query, searchMode);
      }
    }, 250); // slightly faster

    return () => clearTimeout(handler);
  }, [query, searchInstruments, searchMode]);

  /* ------------------ Reset Modal ------------------ */
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setActiveCategory("ALL");
      setAddedInstruments(new Set());

      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults]);

  /* ------------------ Keyboard Navigation ------------------ */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open || !searchResults.length) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev === searchResults.length - 1 ? 0 : prev + 1
        );
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev === 0 ? searchResults.length - 1 : prev - 1
        );
      }

      if (e.key === "Enter") {
        e.preventDefault();
        handleSelect(searchResults[selectedIndex]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, searchResults, selectedIndex, handleSelect]);

  /* ------------------ Watchlist Toggle ------------------ */
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
    } catch {
      setAddedInstruments((prev) => {
        const next = new Set(prev);
        if (isAdded) {
          next.add(token);
        } else {
          next.delete(token);
        }
        return next;
      });
      toast.error("Watchlist update failed");
    }
  };

  const categories: SearchCategory[] = [
    "ALL",
    "Cash",
    "F&O",
    "Currency",
    "Commodity",
  ];

  const showCenteredLoading = query.length > 1 && isSearching && searchResults.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] max-w-3xl gap-0 overflow-hidden border border-border bg-background p-0 text-foreground shadow-2xl dark:border-white/10 dark:bg-slate-950 dark:text-slate-100">
        <DialogHeader className="border-b border-border px-4 pb-4 pt-5 sm:px-6 dark:border-white/10">
          <DialogTitle className="text-lg font-semibold text-foreground dark:text-white">
            Symbol Search
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="px-4 pb-4 sm:px-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground dark:text-slate-400" />

            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="h-11 rounded-lg border-border bg-muted/30 pl-10 pr-4 text-foreground placeholder:text-muted-foreground shadow-sm focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus-visible:border-[#2d6cff]"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-2 border-b border-border px-4 pb-3 sm:px-6 dark:border-white/10">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant="ghost"
              size="sm"
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "h-8 rounded-lg border px-3 text-xs font-semibold transition-colors",
                activeCategory === cat
                  ? "border-primary/40 bg-primary/15 text-primary hover:bg-primary/20 dark:border-[#2d6cff] dark:bg-[#2d6cff]/20 dark:text-[#9fc1ff] dark:hover:bg-[#2d6cff]/30"
                  : "border-border bg-card text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground dark:border-white/10 dark:bg-transparent dark:text-slate-300 dark:hover:border-white/20 dark:hover:bg-white/[0.05] dark:hover:text-white"
              )}
            >
              {cat}
            </Button>
          ))}
        </div>

        {/* RESULTS + SINGLE TOOLTIP PROVIDER */}
        <TooltipProvider delayDuration={80} skipDelayDuration={200}>
          <ScrollArea className="h-[52vh] max-h-[520px] sm:h-[440px]">
            {query.length <= 1 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <TrendingUp className="mb-4 h-12 w-12 text-muted-foreground/45 dark:text-slate-500/40" />
                <p className="text-sm text-muted-foreground dark:text-slate-400">
                  Start typing to search instruments
                </p>
              </div>
            ) : showCenteredLoading ? (
              <div className="h-[400px] grid place-items-center">
                <div className="flex flex-col items-center justify-center gap-3">
                  <Spinner size={22} />
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Searching...</p>
                </div>
              </div>
            ) : searchResults.length === 0 && !isSearching ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground dark:text-slate-400">
                  No symbols found
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border dark:divide-white/10">
                {/* Header */}
                <div className="hidden sm:grid grid-cols-12 gap-4 bg-muted/40 px-6 py-2 text-xs font-semibold tracking-wide text-muted-foreground dark:bg-white/[0.03] dark:text-slate-400">
                  <div className="col-span-4">SYMBOL</div>
                  <div className="col-span-5">DESCRIPTION</div>
                  <div className="col-span-2 text-right">EXCHANGE</div>
                  <div className="col-span-1"></div>
                </div>

                {searchResults.map((stock, idx) => {
                  const token = stock.instrumentToken;
                  const isAdded = token
                    ? addedInstruments.has(token)
                    : false;

                  return (
                    <div
                      key={`${stock.symbol}-${idx}`}
                      onClick={() => handleSelect(stock)}
                      className={cn(
                        "flex cursor-pointer flex-col gap-2 border-l-2 px-4 py-3 transition-colors sm:grid sm:grid-cols-12 sm:gap-4 sm:px-6",
                        selectedIndex === idx
                          ? "border-primary bg-primary/10 dark:border-[#2d6cff] dark:bg-[#2d6cff]/12"
                          : "border-transparent hover:bg-muted/50 dark:hover:bg-white/[0.04]"
                      )}
                    >
                      <div className="flex items-center justify-between sm:block sm:col-span-4 text-sm font-semibold text-foreground dark:text-white">
                        <span>{stock.symbol}</span>
                        <span className="inline-flex items-center rounded border border-border bg-muted/45 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:hidden dark:border-white/15 dark:bg-white/[0.04] dark:text-slate-300">
                          NSE
                        </span>
                      </div>

                      <div className="truncate text-sm text-muted-foreground sm:col-span-5 dark:text-slate-300">
                        {stock.name}
                      </div>

                      <div className="hidden sm:flex sm:col-span-2 sm:justify-end">
                        <span className="inline-flex items-center rounded border border-border bg-muted/45 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground dark:border-white/15 dark:bg-white/[0.04] dark:text-slate-300">
                          NSE
                        </span>
                      </div>

                      {/* Bookmark */}
                      <div className="flex justify-end sm:col-span-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={
                                addInstrumentMutation.isPending ||
                                removeInstrumentMutation.isPending
                              }
                              onClick={(e) =>
                                handleToggleWatchlist(stock, e)
                              }
                              className={cn(
                                "h-7 w-7 border border-transparent text-muted-foreground opacity-80 hover:border-border hover:bg-muted hover:text-foreground hover:opacity-100 dark:text-slate-400 dark:hover:border-white/15 dark:hover:bg-white/[0.06] dark:hover:text-white",
                                isAdded && "border-primary/40 bg-primary/15 text-primary dark:border-[#2d6cff]/40 dark:bg-[#2d6cff]/15 dark:text-[#9fc1ff]"
                              )}
                            >
                              <Bookmark
                                className={cn(
                                  "h-4 w-4",
                                  isAdded && "fill-current"
                                )}
                              />
                            </Button>
                          </TooltipTrigger>

                          <TooltipContent side="left">
                            {isAdded
                              ? "Remove from watchlist"
                              : "Add to watchlist"}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}
