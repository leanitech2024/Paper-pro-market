import { cn } from '@/lib/utils';
import { ranges, rangeToTimeframe } from './config';

interface RangeSelectorProps {
  currentRange: string | undefined;
  setRange: (r: string) => void;
  setTimeframe: (tf: string) => void;
  isMobile: boolean;
}

export function RangeSelector({ currentRange, setRange, setTimeframe, isMobile }: RangeSelectorProps) {
  const onRangeClick = (r: string) => {
    setRange(r);
    const mapped = rangeToTimeframe[r];
    if (mapped) setTimeframe(mapped);
  };

  if (isMobile) {
    return (
      <div className="shrink-0">
        <div className="flex shrink-0 items-center gap-1 pr-1">
          {ranges.map((r) => (
            <button
              key={r}
              onClick={() => onRangeClick(r)}
              className={cn(
                "h-8 shrink-0 whitespace-nowrap rounded-xl px-2.5 text-[11px] font-semibold tracking-[0.08em] transition-colors",
                currentRange === r
                  ? "bg-blue-600/15 text-blue-600 ring-1 ring-blue-500/20 dark:text-blue-300 dark:ring-blue-400/20"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-slate-200",
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center shrink-0">
      {ranges.map((r) => (
        <button
          key={r}
          onClick={() => onRangeClick(r)}
          className={`px-2 h-7 text-xs font-semibold rounded-sm transition-colors uppercase ${
            currentRange === r
              ? 'text-blue-500 bg-blue-600/10 dark:text-blue-400'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-white/[0.06]'
          }`}
        >
          {r}
        </button>
      ))}
    </div>
  );
}
