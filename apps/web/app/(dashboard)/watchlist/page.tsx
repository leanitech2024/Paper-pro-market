"use client";

import { useEffect, useMemo, useState } from "react";
import { 
  useWatchlists, 
  useWatchlistInstruments, 
  useRemoveInstrument, 
  useAddInstrument, 
  useCreateWatchlist, 
  useDeleteWatchlist 
} from "@/hooks/queries/use-watchlists";
import { useMarketStore } from "@/stores/trading/market.store";
import { useSearchStore } from "@/stores/ui/search.store";
import { Search, Plus, Trash2, FolderPlus, FolderOpen, AlertCircle, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function formatPrice(val: number): string {
  if (!Number.isFinite(val) || val <= 0) return "--";
  return val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPct(val: number): string {
  if (!Number.isFinite(val)) return "--";
  return `${val > 0 ? "+" : ""}${val.toFixed(2)}%`;
}

export default function WatchlistPage() {
  const openSearch = useSearchStore((s) => s.openSearch);

  const { data: watchlists = [], isLoading: isLoadingWatchlists } = useWatchlists();
  const [selectedWatchlistId, setSelectedWatchlistId] = useState<string | null>(null);

  const { mutate: addInstrument } = useAddInstrument(selectedWatchlistId || "");
  const { mutate: removeInstrument } = useRemoveInstrument(selectedWatchlistId || "");
  const { mutate: createWatchlist, isPending: isCreating } = useCreateWatchlist();
  const { mutate: deleteWatchlist, isPending: isDeleting } = useDeleteWatchlist();

  const { data: rawInstruments = [], isLoading: isLoadingInstruments } = useWatchlistInstruments(selectedWatchlistId);
  const selectPrice = useMarketStore((s) => s.selectPrice);
  const selectQuote = useMarketStore((s) => s.selectQuote);

  const [newWatchlistName, setNewWatchlistName] = useState("");
  const [showCreateFolder, setShowCreateFolder] = useState(false);

  useEffect(() => {
    if (watchlists.length > 0 && !selectedWatchlistId) {
      const defaultList = watchlists.find((w) => w.isDefault) || watchlists[0];
      setSelectedWatchlistId(defaultList.id);
    } else if (watchlists.length > 0 && selectedWatchlistId) {
      // confirm it still exists
      if (!watchlists.find(w => w.id === selectedWatchlistId)) {
        const defaultList = watchlists.find((w) => w.isDefault) || watchlists[0];
        setSelectedWatchlistId(defaultList?.id || null);
      }
    }
  }, [watchlists, selectedWatchlistId]);

  const instruments = useMemo(() => {
    return rawInstruments.map((inst) => {
      const sp = selectPrice(inst.symbol);
      const livePrice = (sp && sp > 0) ? sp : inst.price;
      const quote = selectQuote(inst.symbol);
      const change = quote?.change || inst.change || 0;
      const changePercent = quote?.changePercent || inst.changePercent || 0;

      return { ...inst, price: livePrice, change, changePercent };
    });
  }, [rawInstruments, selectPrice, selectQuote]);

  const handleOpenSearch = () => {
    if (!selectedWatchlistId) return;
    openSearch({
      mode: "ALL",
      placeholder: "Search to add to watchlist...",
      onSelect: (stock) => {
        addInstrument({
          ...stock,
          instrumentToken: stock.instrumentToken || stock.symbol
        });
      },
    });
  };

  const handleCreateWatchlist = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newWatchlistName.trim();
    if (!name) return;
    createWatchlist(name, {
      onSuccess: (res) => {
        if (res.data?.id) setSelectedWatchlistId(res.data.id);
        setShowCreateFolder(false);
        setNewWatchlistName("");
        toast.success(`"${name}" created successfully`);
      }
    });
  };

  const handleDeleteWatchlist = () => {
    const list = watchlists.find((w) => w.id === selectedWatchlistId);
    if (!list || list.isDefault) return;
    if (window.confirm(`Are you sure you want to delete "${list.name}"?`)) {
      deleteWatchlist(list.id);
    }
  };

  const currentWatchlist = watchlists.find((w) => w.id === selectedWatchlistId);

  const panelClass = "rounded-[28px] border border-slate-200/80 bg-white dark:border-white/[0.08] dark:bg-[#0c1322]";

  return (
    <div className="h-[calc(100vh-100px)] md:h-[calc(100vh-60px)] p-4 md:p-6 flex flex-col lg:flex-row gap-4 md:gap-6">
      {/* Sidebar - Watchlists List */}
      <div className={cn(panelClass, "flex w-full flex-col lg:w-80 shrink-0 overflow-hidden")}>
        <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-white/[0.08] bg-slate-50/50 dark:bg-black/10">
          <h2 className="text-base font-semibold text-slate-950 dark:text-slate-100">My Watchlists</h2>
          <button 
            onClick={() => setShowCreateFolder(!showCreateFolder)}
            className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <FolderPlus className="h-5 w-5" />
          </button>
        </div>

        {showCreateFolder && (
          <div className="bg-muted/30 p-4 border-b border-border">
            <form onSubmit={handleCreateWatchlist} className="flex gap-2">
              <input
                type="text"
                autoFocus
                placeholder="List name..."
                value={newWatchlistName}
                onChange={(e) => setNewWatchlistName(e.target.value)}
                className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm"
              />
              <button
                type="button"
                onClick={() => {
                  setShowCreateFolder(false);
                  setNewWatchlistName("");
                }}
                className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background hover:bg-muted text-muted-foreground transition-colors"
                title="Cancel"
              >
                <X className="h-4 w-4" />
              </button>
              <button
                type="submit"
                disabled={isCreating || !newWatchlistName.trim()}
                className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition-colors"
                title="Create Watchlist"
              >
                <Check className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2">
          {isLoadingWatchlists ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Loading lists...</div>
          ) : (
            <div className="space-y-1">
              {watchlists.map((wl) => (
                <button
                  key={wl.id}
                  onClick={() => setSelectedWatchlistId(wl.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-colors mb-1",
                    wl.id === selectedWatchlistId 
                      ? "bg-slate-100 text-slate-900 font-semibold dark:bg-white/[0.08] dark:text-slate-100" 
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-slate-200"
                  )}
                >
                  <FolderOpen className={cn("h-4 w-4", wl.id === selectedWatchlistId ? "text-primary/70" : "text-muted-foreground/50")} />
                  <span className="flex-1 truncate">{wl.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Selected Watchlist Instruments */}
      <div className={cn(panelClass, "flex flex-1 flex-col overflow-hidden")}>
        {!currentWatchlist ? (
          <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
            <Search className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-lg">Select or create a watchlist to view instruments.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/50 px-6 py-5 dark:border-white/[0.08] dark:bg-black/10">
              <div>
                <h1 className="text-xl font-bold text-slate-950 dark:text-slate-100">{currentWatchlist.name}</h1>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                  {instruments.length} instrument{instruments.length !== 1 && 's'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {!currentWatchlist.isDefault && (
                  <button
                    onClick={handleDeleteWatchlist}
                    disabled={isDeleting}
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-destructive/30 bg-destructive/10 px-4 text-sm font-medium text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete List
                  </button>
                )}
                <button
                  onClick={handleOpenSearch}
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Stock
                </button>
              </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0 p-4 md:p-6">
              {isLoadingInstruments ? (
                <div className="flex justify-center p-12">
                  <p className="text-muted-foreground">Loading instruments...</p>
                </div>
              ) : instruments.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/30">
                  <AlertCircle className="mb-3 h-8 w-8 text-muted-foreground/50" />
                  <h3 className="font-semibold text-foreground">No instruments found</h3>
                  <p className="mb-4 mt-1 text-sm text-muted-foreground text-center max-w-[250px]">
                    This watchlist is empty. Add your favorite stocks to track them here.
                  </p>
                  <button
                    onClick={handleOpenSearch}
                    className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground"
                  >
                    Search Instruments
                  </button>
                </div>
              ) : (
                <div className="overflow-y-auto max-h-full rounded-2xl border border-slate-200 bg-white dark:border-white/[0.08] dark:bg-[#0c1322] shadow-sm">
                  <table className="w-full text-left text-sm relative">
                    <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 backdrop-blur text-slate-500 shadow-sm dark:border-white/[0.08] dark:bg-[#0c1322]/95 dark:text-slate-400">
                      <tr>
                        <th className="px-4 py-3 font-medium whitespace-nowrap">Symbol</th>
                        <th className="px-4 py-3 font-medium text-right">LTP (₹)</th>
                        <th className="px-4 py-3 font-medium text-right">Change (%)</th>
                        <th className="px-4 py-3 font-medium w-[80px]"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {instruments.map((inst) => {
                        const isPositive = inst.changePercent >= 0;
                        return (
                          <tr key={inst.instrumentToken} className="group hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3">
                              <div className="font-semibold text-foreground">{inst.symbol}</div>
                              <div className="text-[11px] text-muted-foreground">
                                {inst.name || (inst.optionType ? `${inst.optionType} Option` : inst.expiryDate ? "Future" : "Equity")}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-medium tabular-nums text-foreground">
                              {formatPrice(inst.price)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className={cn(
                                "inline-block rounded px-2 py-0.5 text-xs font-semibold tabular-nums",
                                isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                              )}>
                                {formatPct(inst.changePercent)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => removeInstrument(inst.instrumentToken || "")}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground/40 opacity-0 transition-opacity hover:bg-rose-500/15 hover:text-rose-500 group-hover:opacity-100 focus:opacity-100"
                                title="Remove from wishlist"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}