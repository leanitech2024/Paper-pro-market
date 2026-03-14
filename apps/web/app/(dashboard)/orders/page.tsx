"use client";
import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useOrdersStore } from '@/stores/trading/orders.store';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Search, ArrowUpDown, History, TrendingUp, TrendingDown, Download, X } from 'lucide-react';
import { formatExpiryLabel, daysToExpiry, isExpired } from '@paper-market/core';
import Spinner from '@/components/ui/spinner';

const OrdersPage = () => {
  const { trades, isLoading, hasFetched, error, fetchOrders, cancelOrder } = useOrdersStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'pnl'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<'all' | 'OPEN' | 'CLOSED'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const itemsPerPage = 10;

  // Fetch orders on mount
  useEffect(() => {
    if (!hasFetched) {
      fetchOrders();
    }
  }, [hasFetched, fetchOrders]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(value);
  };

  const filteredAndSortedTrades = useMemo(() => {
    let result = [...trades];

    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter((trade) => trade.status === statusFilter);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (trade) =>
          trade.symbol.toLowerCase().includes(query) ||
          trade.name.toLowerCase().includes(query)
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        const aTime = new Date(a.entryTime).getTime();
        const bTime = new Date(b.entryTime).getTime();
        comparison = bTime - aTime;
      } else if (sortBy === 'pnl') {
        comparison = (b.pnl || 0) - (a.pnl || 0);
      }
      return sortOrder === 'asc' ? -comparison : comparison;
    });

    return result;
  }, [trades, searchQuery, sortBy, sortOrder, statusFilter]);

  const paginatedTrades = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedTrades.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedTrades, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedTrades.length / itemsPerPage);

  const handleExport = () => {
    console.log("Export disabled for build debugging");
  };

  const toggleSort = (field: 'date' | 'pnl') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    setCancellingOrderId(orderId);
    try {
      await cancelOrder(orderId);
    } catch (error) {
      // Error is handled in the store which triggers a toast notification
    } finally {
      setCancellingOrderId(null);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">Order History</h1>
          <p className="text-muted-foreground text-sm">View and manage your trade executions</p>
        </div>
      </div>

      {/* Modern Filter Section */}
      <div className="grid gap-3 sm:flex sm:items-center sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search symbols..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-card border-border rounded-xl focus-visible:ring-primary/20 transition-all shadow-sm"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex-1 grid grid-cols-2 gap-2 sm:flex sm:w-auto">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | 'OPEN' | 'CLOSED')}>
              <SelectTrigger className="h-11 bg-card border-border rounded-xl px-3 sm:w-[130px] shadow-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'date' | 'pnl')}>
              <SelectTrigger className="h-11 bg-card border-border rounded-xl px-3 sm:w-[130px] shadow-sm">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Latest Date</SelectItem>
                <SelectItem value="pnl">Highest P&L</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={handleExport} 
            variant="outline" 
            className="h-11 px-3 sm:px-4 border-border rounded-xl bg-card hover:bg-accent transition-all shrink-0 shadow-sm"
            title="Export CSV"
          >
            <Download className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline font-medium">Export</span>
          </Button>
        </div>
      </div>

      {/* Orders Table */}
      <Card className="bg-card border-border shadow-md rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-border/50 bg-muted/5">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Executions
            {trades.length > 0 && (
              <Badge variant="secondary" className="bg-secondary/20 text-secondary border-none px-2 py-0 h-5">
                {trades.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Loading State */}
          {!hasFetched ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Spinner size={48} className="mb-4 text-primary" />
              <p className="text-lg font-medium">Loading your orders...</p>
            </div>
          ) : error ? (
            /* Error State */
            <div className="flex flex-col items-center justify-center py-20 text-destructive">
              <X className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">Failed to load orders</p>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => fetchOrders()} variant="outline" className="rounded-xl px-6">
                Try Again
              </Button>
            </div>
          ) : trades.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-center px-6">
              <div className="h-20 w-20 bg-muted/20 rounded-full flex items-center justify-center mb-4">
                <History className="h-10 w-10 opacity-30" />
              </div>
              <p className="text-lg font-semibold text-foreground">No Orders Found</p>
              <p className="text-sm max-w-xs mx-auto">You haven't placed any trades yet. Head over to the terminal to get started.</p>
              <Link href="/trade">
                <Button variant="outline" className="mt-6 rounded-xl">Go to Terminal</Button>
              </Link>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="block lg:hidden divide-y divide-border/50">
                {paginatedTrades.map((trade) => (
                  <div key={trade.id} className="p-5 hover:bg-muted/5 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-base text-foreground leading-tight">{trade.symbol}</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mt-0.5">{trade.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] uppercase font-bold px-2 py-0 border-none rounded-md',
                            trade.side === 'BUY'
                              ? 'bg-success/10 text-success'
                              : 'bg-destructive/10 text-destructive'
                          )}
                        >
                          {trade.side}
                        </Badge>
                        <Badge
                          className={cn(
                            'text-[10px] font-bold px-2 py-0 border-none rounded-md',
                            trade.status === 'OPEN'
                              ? 'bg-primary/20 text-primary'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {trade.status}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                      <div>
                        <p className="text-muted-foreground text-[11px] uppercase tracking-tight font-semibold mb-1">Quantity</p>
                        <p className="font-bold text-foreground">{trade.quantity}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-[11px] uppercase tracking-tight font-semibold mb-1">Entry Price</p>
                        <p className="font-bold text-foreground">
                          {trade.orderType === 'MARKET' && trade.entryPrice === 0
                            ? 'Market'
                            : formatCurrency(trade.entryPrice)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-[11px] uppercase tracking-tight font-semibold mb-1">Exit Price</p>
                        <p className="font-bold text-foreground">
                          {trade.status === 'CLOSED' ? formatCurrency(trade.exitPrice || 0) : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-[11px] uppercase tracking-tight font-semibold mb-1">Net P&L</p>
                        <p className={cn(
                          'font-bold',
                          trade.status === 'OPEN' ? 'text-muted-foreground' :
                            (trade.pnl || 0) >= 0 ? 'text-profit' : 'text-loss'
                        )}>
                          {trade.status === 'CLOSED'
                            ? `${(trade.pnl || 0) >= 0 ? '+' : ''}${formatCurrency(trade.pnl || 0)}`
                            : '-'
                          }
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-5 pt-4 border-t border-border/30">
                      <p className="text-[11px] text-muted-foreground font-medium bg-muted/20 px-2 py-1 rounded-md">
                        {format(new Date(trade.entryTime), 'dd MMM yyyy, HH:mm')}
                      </p>
                      {(trade.status === 'PENDING' || trade.status === 'OPEN') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancelOrder(trade.id)}
                          disabled={cancellingOrderId === trade.id}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 rounded-lg px-3"
                        >
                          {cancellingOrderId === trade.id ? (
                            <Spinner size={12} />
                          ) : (
                            <>
                              <X className="h-3.5 w-3.5 mr-1.5" />
                              <span className="text-xs font-bold uppercase">Cancel</span>
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/5">
                    <TableRow className="border-border/50 hover:bg-transparent px-2">
                      <TableHead
                        className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-6 cursor-pointer hover:text-foreground transition-colors"
                        onClick={() => toggleSort('date')}
                      >
                        <div className="flex items-center gap-1.5">
                          Date & Time
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Instrument</TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Side</TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Qty</TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Avg. Entry</TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Avg. Exit</TableHead>
                      <TableHead
                        className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-right cursor-pointer hover:text-foreground transition-colors"
                        onClick={() => toggleSort('pnl')}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          Realized P&L
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider pr-6">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTrades.map((trade) => (
                      <TableRow key={trade.id} className="border-border/50 hover:bg-muted/5 transition-colors group">
                        <TableCell className="pl-6 py-4">
                          <div>
                            <p className="font-semibold text-foreground text-sm">
                              {format(new Date(trade.entryTime), 'dd MMM yyyy')}
                            </p>
                            <p className="text-[11px] text-muted-foreground font-medium mt-0.5 opacity-70">
                              {format(new Date(trade.entryTime), 'HH:mm:ss')}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-bold text-foreground text-sm">{trade.symbol}</p>
                            <p className="text-[11px] text-muted-foreground font-medium truncate max-w-[150px] opacity-70">
                              {trade.name}
                              {trade.expiryDate && (
                                <span className={cn(
                                  "ml-2",
                                  isExpired(trade.expiryDate) ? "text-muted-foreground" :
                                    daysToExpiry(trade.expiryDate) === 0 ? "text-destructive font-bold" :
                                      daysToExpiry(trade.expiryDate) <= 2 ? "text-orange-500 font-bold" :
                                        "text-primary/70 font-semibold"
                                )}>
                                  • {formatExpiryLabel(trade.expiryDate)}
                                </span>
                              )}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              'font-bold text-[10px] uppercase border-none px-2 py-0.5 rounded-md',
                              trade.side === 'BUY'
                                ? 'bg-success/10 text-success'
                                : 'bg-destructive/10 text-destructive'
                            )}
                          >
                            {trade.side}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold text-foreground text-sm">
                          {trade.quantity}
                        </TableCell>
                        <TableCell className="text-right text-foreground font-semibold text-sm">
                          {trade.orderType === 'MARKET' && trade.entryPrice === 0
                            ? 'Market'
                            : formatCurrency(trade.entryPrice)}
                        </TableCell>
                        <TableCell className="text-right text-foreground font-semibold text-sm">
                          {trade.status === 'CLOSED' ? formatCurrency(trade.exitPrice!) : '-'}
                        </TableCell>
                        <TableCell className={cn(
                          'text-right font-bold text-sm',
                          trade.status === 'OPEN' ? 'text-muted-foreground' :
                            (trade.pnl || 0) >= 0 ? 'text-profit' : 'text-loss'
                        )}>
                          {trade.status === 'CLOSED'
                            ? `${(trade.pnl || 0) >= 0 ? '+' : ''}${formatCurrency(trade.pnl || 0)}`
                            : '-'
                          }
                        </TableCell>
                        <TableCell className="pr-6">
                          <Badge
                            className={cn(
                              'font-bold text-[10px] uppercase border-none px-2 py-0.5 rounded-md',
                              trade.status === 'OPEN'
                                ? 'bg-primary/20 text-primary'
                                : 'bg-muted text-muted-foreground'
                            )}
                          >
                            {trade.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Enhanced Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-muted/5 border-t border-border/50">
                  <p className="text-xs text-muted-foreground font-medium">
                    Showing <span className="text-foreground font-bold">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="text-foreground font-bold">{Math.min(currentPage * itemsPerPage, filteredAndSortedTrades.length)}</span> of <span className="text-foreground font-bold">{filteredAndSortedTrades.length}</span> results
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="rounded-lg border-border h-9 shadow-sm"
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-1 mx-2">
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                            const page = i + 1;
                            return (
                                <Button
                                    key={page}
                                    variant={currentPage === page ? "default" : "ghost"}
                                    size="sm"
                                    className={cn("w-9 h-9 rounded-lg p-0", currentPage !== page && "text-muted-foreground")}
                                    onClick={() => setCurrentPage(page)}
                                >
                                    {page}
                                </Button>
                            );
                        })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="rounded-lg border-border h-9 shadow-sm"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OrdersPage;
