import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

interface HeaderSymbolProps {
  headerText: string;
  isLoading: boolean;
  onSearchClick?: () => void;
  isMobile: boolean;
}

export function HeaderSymbol({ headerText, isLoading, onSearchClick, isMobile }: HeaderSymbolProps) {
  if (isMobile) {
    return (
      <button
        onClick={onSearchClick}
        disabled={isLoading}
        className="flex h-8 max-w-[40vw] shrink-0 items-center gap-1.5 rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 px-2.5 shadow-[0_6px_16px_rgba(15,23,42,0.06)] transition-transform active:scale-95 disabled:opacity-60 dark:border-white/[0.08] dark:bg-[#10192b] dark:shadow-none"
      >
        {isLoading ? (
          <div className="h-3.5 w-3.5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        ) : (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200/70 dark:bg-white/[0.08]">
            <Search className="h-3 w-3 text-slate-500 dark:text-slate-400" />
          </div>
        )}
        <span className="truncate text-[11px] font-bold uppercase tracking-[0.14em] text-slate-800 dark:text-slate-100">
          {headerText}
        </span>
      </button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isLoading}
      className="h-8 gap-1.5 px-2 text-slate-700 font-medium border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-70 shrink-0 dark:border-white/[0.08] dark:bg-[#10192b] dark:text-slate-100 dark:hover:bg-white/[0.08]"
      onClick={onSearchClick}
    >
      {isLoading ? (
        <div className="h-3.5 w-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      ) : (
        <Search className="h-3.5 w-3.5 text-slate-500 dark:text-slate-300" />
      )}
      <span className="text-sm">{headerText}</span>
      <span className="text-[10px] text-slate-500 bg-slate-100 px-1 rounded-sm border border-slate-200 dark:text-slate-300 dark:bg-[#10192b] dark:border-white/[0.08]">
        NSE
      </span>
    </Button>
  );
}
