"use client";

import { ChevronDown } from 'lucide-react';
import { useChartTradingPanelData } from './hooks';
import { fmt, fmtVol } from './utils';

interface ChartTradingPanelProps {
  symbol: string;
}

export function ChartTradingPanel({ symbol }: ChartTradingPanelProps) {
  const {
    livePrice,
    qty,
    setQty,
    lastCandle,
    change,
    changePct,
    colorClass
  } = useChartTradingPanelData();

  return (
    <div className="absolute top-3 left-3 z-30 flex flex-col gap-1 min-w-[340px]">
        {/* Data Strip (Top) */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-slate-500/80 bg-white/70 backdrop-blur-[1px] px-2 py-0.5 rounded-sm select-none pointer-events-none dark:bg-[#10192b]/80 dark:text-slate-400/80">
            <div className="flex items-center gap-1 font-bold text-slate-900 dark:text-slate-100">
                {symbol} <span className="w-1 h-1 rounded-full bg-foreground mx-0.5"></span> 1W <span className="w-1 h-1 rounded-full bg-foreground mx-0.5"></span> NSE
            </div>
            {lastCandle && (
                <>
                <span className={colorClass}>●</span>
                <span>O<span className={colorClass}>{fmt(lastCandle.open)}</span></span>
                <span>H<span className={colorClass}>{fmt(lastCandle.high)}</span></span>
                <span>L<span className={colorClass}>{fmt(lastCandle.low)}</span></span>
                <span>C<span className={colorClass}>{fmt(lastCandle.close)}</span></span>
                <span className={colorClass}>{change > 0 ? '+' : ''}{fmt(change)} ({fmt(changePct)}%)</span>
                <span>Vol<span className="text-yellow-500">{fmtVol(20530400)}</span></span>
                </>
            )}
        </div>

        {/* Trading Box */}
        <div className="flex items-center bg-white border border-slate-200/80 rounded-sm shadow-lg overflow-hidden w-fit mt-1 dark:bg-[#0c1322] dark:border-white/[0.08]">
             {/* Sell Button */}
            <button 
                className="flex flex-col items-center justify-center h-10 w-24 bg-[#EF4444] hover:bg-[#DC2626] text-white transition-colors border-r border-black/20"
                onClick={() => (window as any).triggerTrade?.('SELL')}
            >
                <div className="text-[10px] font-bold uppercase opacity-80 mb-[-2px]">Sell</div>
                <div className="text-xs font-bold">{fmt(livePrice - 0.10)}</div>
            </button>

            {/* Qty Input */}
            <div className="flex flex-col items-center justify-center p-1 bg-slate-50 h-10 w-16 relative dark:bg-[#10192b]">
                 <div className="text-[8px] uppercase text-slate-500 font-bold absolute top-1 left-0 w-full text-center dark:text-slate-400">Qty</div>
                 <input 
                    type="number"
                    value={qty}
                    onChange={(e) => setQty(Number(e.target.value))}
                    className="w-full h-full bg-transparent text-center text-sm font-bold text-slate-900 focus:outline-none pt-2 dark:text-slate-100" 
                 />
            </div>

             {/* Buy Button */}
             <button 
                className="flex flex-col items-center justify-center h-10 w-24 bg-[#22C55E] hover:bg-[#16A34A] text-white transition-colors border-l border-black/20"
                onClick={() => (window as any).triggerTrade?.('BUY')}
            >
                <div className="text-[10px] font-bold uppercase opacity-80 mb-[-2px]">Buy</div>
                <div className="text-xs font-bold">{fmt(livePrice)}</div>
            </button>

             {/* Expand/Collapse Toggle (Visual only for now) */}
             <div className="h-10 w-6 flex items-center justify-center bg-white border-l border-slate-200/80 hover:bg-slate-50 cursor-pointer dark:bg-[#0c1322] dark:border-white/[0.08] dark:hover:bg-white/[0.06]">
                 <ChevronDown className="h-3 w-3 text-slate-500 dark:text-slate-400" />
            </div>
        </div>
    </div>
  );
}
