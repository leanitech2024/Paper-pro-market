"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { UserPosition as Position } from "@paper-market/core";
import { usePositionsStore } from "@/stores/trading/positions.store";
import { Minus, Plus, TrendingDown, TrendingUp, Zap } from "lucide-react";

interface PartialCloseDialogProps {
    position: Position | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Live price to use for P&L preview. Falls back to position.currentPrice. */
    livePrice?: number;
}

function isDerivativeInstrument(rawType: string | null | undefined): boolean {
    const type = String(rawType ?? "").toLowerCase();
    return type === "futures" || type === "future" || type === "options" || type === "option";
}

function getLotSize(position: Position): number {
    const isDerivative = isDerivativeInstrument(position.instrument ?? "");
    if (isDerivative) {
        return Math.max(1, position.lotSize ?? 1);
    }
    return 1; // equity — unit-based
}

function isLotBased(position: Position): boolean {
    return isDerivativeInstrument(position.instrument ?? "");
}

function calcPnl(position: Position, qty: number, price: number): number {
    if (price <= 0) return 0;
    const delta = price - position.entryPrice;
    return position.side === "BUY" ? delta * qty : -delta * qty;
}

export function PartialCloseDialog({
    position,
    open,
    onOpenChange,
    livePrice = 0,
}: PartialCloseDialogProps) {
    const closePosition = usePositionsStore((s) => s.closePosition);
    const [qty, setQty] = useState(1);
    const [submitting, setSubmitting] = useState(false);

    const maxQty = position ? Math.abs(position.quantity) : 1;
    const lotSize = position ? getLotSize(position) : 1;
    const lotBased = position ? isLotBased(position) : false;

    // Step for lot-based instruments is 1 lot = lotSize contracts
    // The input shows qty in CONTRACTS always (consistent with the rest of the UI)
    // but we snap to lot boundaries for F&O
    const step = lotSize;

    // Reset to full-close default whenever dialog opens for a new position
    useEffect(() => {
        if (open && position) {
            setQty(maxQty);
        }
    }, [open, position, maxQty]);

    const clampedQty = Math.min(Math.max(step, qty), maxQty);

    const handleChange = useCallback(
        (raw: number) => {
            // Snap to lot boundary for F&O, allow any int for equity
            const snapped = lotBased ? Math.round(raw / step) * step : Math.round(raw);
            setQty(Math.min(Math.max(step, snapped), maxQty));
        },
        [lotBased, step, maxQty]
    );

    const handleIncrement = () => handleChange(clampedQty + step);
    const handleDecrement = () => handleChange(clampedQty - step);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = parseInt(e.target.value, 10);
        if (!Number.isNaN(raw)) handleChange(raw);
    };

    const isFullClose = clampedQty >= maxQty;
    const price = livePrice > 0 ? livePrice : (position?.currentPrice ?? 0);
    const estimatedPnl = position ? calcPnl(position, clampedQty, price) : 0;
    const lots = lotBased ? clampedQty / lotSize : null;

    const handleConfirm = async () => {
        if (!position) return;
        setSubmitting(true);
        try {
            // Pass undefined for full close so backend uses its own default
            const quantityArg = isFullClose ? undefined : clampedQty;
            await closePosition(position.id, quantityArg);
            onOpenChange(false);
        } finally {
            setSubmitting(false);
        }
    };

    if (!position) return null;

    return (
        <Dialog open={open} onOpenChange={(v) => !submitting && onOpenChange(v)}>
            <DialogContent className="w-full max-w-sm gap-0 rounded-2xl border border-white/[0.08] bg-[#0c1322] p-0 shadow-2xl">
                {/* Header */}
                <DialogHeader className="border-b border-white/[0.06] px-5 py-4">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-base font-semibold text-white">
                            Exit Position
                        </DialogTitle>
                        <Badge
                            variant="outline"
                            className={cn(
                                "border-0 text-xs font-semibold",
                                position.side === "BUY"
                                    ? "bg-emerald-500/15 text-emerald-400"
                                    : "bg-rose-500/15 text-rose-400"
                            )}
                        >
                            {position.side === "BUY" ? (
                                <TrendingUp className="mr-1 h-3 w-3" />
                            ) : (
                                <TrendingDown className="mr-1 h-3 w-3" />
                            )}
                            {position.side}
                        </Badge>
                    </div>
                    <DialogDescription className="mt-0.5 text-sm text-slate-400">
                        {position.symbol}
                        {lotBased && (
                            <span className="ml-1.5 text-xs text-slate-500">
                                · Lot size: {lotSize}
                            </span>
                        )}
                    </DialogDescription>
                </DialogHeader>

                {/* Body */}
                <div className="space-y-4 px-5 py-4">
                    {/* Position summary strip */}
                    <div className="grid grid-cols-3 gap-2 rounded-xl bg-white/[0.04] px-3 py-2.5 text-xs">
                        <div>
                            <p className="text-slate-500">Held Qty</p>
                            <p className="mt-0.5 font-semibold text-white">{maxQty}</p>
                        </div>
                        <div>
                            <p className="text-slate-500">Avg Price</p>
                            <p className="mt-0.5 font-semibold text-white">
                                ₹{position.entryPrice.toFixed(2)}
                            </p>
                        </div>
                        <div>
                            <p className="text-slate-500">LTP</p>
                            <p className="mt-0.5 font-semibold text-white">
                                {price > 0 ? `₹${price.toFixed(2)}` : "--"}
                            </p>
                        </div>
                    </div>

                    {/* Qty selector */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-slate-400">
                            {lotBased ? "Close Quantity (contracts)" : "Close Quantity"}
                        </Label>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 shrink-0 rounded-lg border-white/[0.1] bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
                                onClick={handleDecrement}
                                disabled={clampedQty <= step || submitting}
                                aria-label="Decrease quantity"
                            >
                                <Minus className="h-3.5 w-3.5" />
                            </Button>
                            <Input
                                id="close-qty-input"
                                type="number"
                                min={step}
                                max={maxQty}
                                step={step}
                                value={clampedQty}
                                onChange={handleInputChange}
                                disabled={submitting}
                                className="h-9 flex-1 rounded-lg border-white/[0.1] bg-white/[0.04] text-center text-sm font-semibold text-white focus-visible:ring-1 focus-visible:ring-indigo-500"
                            />
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 shrink-0 rounded-lg border-white/[0.1] bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
                                onClick={handleIncrement}
                                disabled={clampedQty >= maxQty || submitting}
                                aria-label="Increase quantity"
                            >
                                <Plus className="h-3.5 w-3.5" />
                            </Button>
                        </div>

                        {/* Lot label for F&O */}
                        {lots !== null && (
                            <p className="text-[11px] text-slate-500">
                                = {lots} lot{lots !== 1 ? "s" : ""}
                                {" "}· {Math.round((maxQty - clampedQty) / lotSize)} lot{Math.round((maxQty - clampedQty) / lotSize) !== 1 ? "s" : ""} remaining after exit
                            </p>
                        )}

                        {/* Quick select buttons */}
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => handleChange(Math.floor(maxQty / 2 / step) * step || step)}
                                disabled={submitting}
                                className="flex-1 rounded-md border border-white/[0.08] bg-white/[0.03] py-1.5 text-[11px] font-semibold text-slate-400 transition-colors hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-indigo-300 disabled:opacity-40"
                            >
                                50%
                            </button>
                            <button
                                type="button"
                                onClick={() => setQty(maxQty)}
                                disabled={submitting}
                                className="flex-1 rounded-md border border-white/[0.08] bg-white/[0.03] py-1.5 text-[11px] font-semibold text-slate-400 transition-colors hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-40"
                            >
                                Close All
                            </button>
                        </div>
                    </div>

                    {/* Estimated P&L preview */}
                    <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-xs">
                        <span className="text-slate-400">
                            {isFullClose ? "Realized P&L (est.)" : `P&L for ${clampedQty} qty (est.)`}
                        </span>
                        <span
                            className={cn(
                                "font-semibold tabular-nums",
                                price <= 0
                                    ? "text-slate-500"
                                    : estimatedPnl >= 0
                                    ? "text-emerald-400"
                                    : "text-rose-400"
                            )}
                        >
                            {price > 0
                                ? `${estimatedPnl >= 0 ? "+" : ""}${formatCurrency(estimatedPnl)}`
                                : "--"}
                        </span>
                    </div>
                </div>

                {/* Footer */}
                <DialogFooter className="border-t border-white/[0.06] px-5 py-4">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={submitting}
                        className="flex-1 rounded-lg border-white/[0.1] bg-transparent text-slate-300 hover:bg-white/[0.06]"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={submitting || clampedQty < step}
                        className={cn(
                            "flex-1 rounded-lg font-semibold",
                            isFullClose
                                ? "bg-rose-600 text-white hover:bg-rose-700"
                                : "bg-amber-600 text-white hover:bg-amber-700"
                        )}
                    >
                        {submitting ? (
                            "Exiting..."
                        ) : (
                            <>
                                <Zap className="mr-1.5 h-3.5 w-3.5" />
                                {isFullClose ? "Close All" : `Exit ${clampedQty}`}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
