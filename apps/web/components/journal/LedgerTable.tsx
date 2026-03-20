"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LedgerEntryView } from "@/stores/trading/journal.store";
import { format } from "date-fns";

interface LedgerTableProps {
  entries: LedgerEntryView[];
  isLoading?: boolean;
}

export function LedgerTable({ entries, isLoading }: LedgerTableProps) {
  const formatCurrency = (value: string | number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number(value));
  };

  const getReferenceColor = (type: string) => {
    switch (type) {
      case "TRADE":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "ORDER":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "LIQUIDATION":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "EXPIRY":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "ADJUSTMENT":
        return "bg-slate-500/10 text-slate-500 border-slate-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getAccountColor = (type: string) => {
    switch (type) {
      case "CASH":
        return "text-emerald-500";
      case "MARGIN_BLOCKED":
        return "text-amber-500";
      case "REALIZED_PNL":
        return "text-blue-500";
      case "UNREALIZED_PNL":
        return "text-slate-400";
      case "FEES":
        return "text-rose-500";
      default:
        return "text-foreground";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
        Loading ledger entries...
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-[180px]">Time</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Debit (From)</TableHead>
              <TableHead>Credit (To)</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Reference</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No ledger entries found.
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <TableRow key={entry.id} className="hover:bg-muted/5 transition-colors">
                  <TableCell className="font-mono text-[11px] text-muted-foreground">
                    {format(new Date(entry.createdAt), "dd MMM HH:mm:ss")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-[10px] uppercase font-bold px-1.5 h-5", getReferenceColor(entry.referenceType))}>
                      {entry.referenceType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={cn("text-[11px] font-medium uppercase tracking-tight", getAccountColor(entry.debitType))}>
                      {entry.debitType.replace("_", " ")}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={cn("text-[11px] font-medium uppercase tracking-tight", getAccountColor(entry.creditType))}>
                      {entry.creditType.replace("_", " ")}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold">
                    {formatCurrency(entry.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-[10px] font-mono text-muted-foreground bg-muted/30 px-1 py-0.5 rounded">
                      {entry.referenceId.split("_").pop()?.slice(-8) || entry.referenceId.slice(-8)}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
