import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CandlestickChart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChartStyle } from '@/domains/chart/stores/analysis.store';
import { IndicatorsMenu } from '../IndicatorsMenu';
import { styleLabels } from './config';
import { HeaderSymbol } from './HeaderSymbol';
import { RangeSelector } from './RangeSelector';
import { TimeframeDropdown } from './TimeframeDropdown';
import { ChartStyleDropdown } from './ChartStyleDropdown';
import { HeaderActions } from './HeaderActions';

interface DesktopHeaderProps {
  symbol: string;
  headerText: string;
  chartStyle: ChartStyle;
  compact: boolean;
  isLoading: boolean;
  isFullscreen: boolean;
  range: string | undefined;
  effectiveTimeframe: string;
  activeTimeframeLabel: string;
  styleSearch: string;
  filteredStyleGroups: ChartStyle[][];
  setRange: (r: string) => void;
  setTimeframe: (tf: string) => void;
  setStyleSearch: (s: string) => void;
  onSearchClick?: () => void;
  onChartStyleChange?: (style: ChartStyle) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onScreenshot?: () => void;
  onMaximize?: () => void;
}

export function DesktopHeader({
  symbol,
  headerText,
  chartStyle,
  compact,
  isLoading,
  isFullscreen,
  range,
  effectiveTimeframe,
  activeTimeframeLabel,
  styleSearch,
  filteredStyleGroups,
  setRange,
  setTimeframe,
  setStyleSearch,
  onSearchClick,
  onChartStyleChange,
  onUndo,
  onRedo,
  onScreenshot,
  onMaximize
}: DesktopHeaderProps) {
  return (
    <div
      className={cn(
        "hidden md:flex z-30 shrink-0 border-b border-slate-200/80 bg-white/95 px-1.5 items-center justify-between gap-2 dark:border-white/[0.08] dark:bg-[#0c1322]/95",
        compact ? "h-auto py-1.5" : "h-11",
      )}
    >
      <div className="flex h-full items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex-1 min-w-0">
        <HeaderSymbol headerText={headerText} isLoading={isLoading} onSearchClick={onSearchClick} isMobile={false} />

        <Separator orientation="vertical" className="h-4 bg-slate-200/70 mx-0.5 shrink-0 dark:bg-white/[0.08]" />

        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="sm"
            className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-600/90 text-white text-[10px] font-bold uppercase transition-transform active:scale-95"
            onClick={() => (window as any).triggerTrade?.('BUY')}
          >
            Buy
          </Button>
          <Button
            size="sm"
            className="h-7 px-2.5 bg-rose-600 hover:bg-rose-600/90 text-white text-[10px] font-bold uppercase transition-transform active:scale-95"
            onClick={() => (window as any).triggerTrade?.('SELL')}
          >
            Sell
          </Button>
        </div>

        <Separator orientation="vertical" className="h-4 bg-slate-200/70 mx-0.5 shrink-0 dark:bg-white/[0.08]" />

        <RangeSelector currentRange={range} setRange={setRange} setTimeframe={setTimeframe} isMobile={false} />

        <Separator orientation="vertical" className="h-4 bg-slate-200/70 mx-0.5 shrink-0 dark:bg-white/[0.08]" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs text-slate-600 hover:text-slate-900 transition-none dark:text-slate-400 dark:hover:text-slate-100">
              {activeTimeframeLabel}
            </Button>
          </DropdownMenuTrigger>
          <TimeframeDropdown effectiveTimeframe={effectiveTimeframe} setTimeframe={setTimeframe} setRange={setRange} />
        </DropdownMenu>

        <Separator orientation="vertical" className="h-4 bg-border/50 mx-0.5 shrink-0" />

        <div className="flex items-center shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs text-slate-500 hover:text-slate-900 transition-none dark:text-slate-400 dark:hover:text-slate-100">
                <CandlestickChart className="h-4 w-4" />
                {styleLabels[chartStyle]}
              </Button>
            </DropdownMenuTrigger>
            <ChartStyleDropdown 
              chartStyle={chartStyle}
              styleSearch={styleSearch}
              setStyleSearch={setStyleSearch}
              filteredStyleGroups={filteredStyleGroups}
              onChartStyleChange={onChartStyleChange}
            />
          </DropdownMenu>

          <IndicatorsMenu symbol={symbol} />
        </div>
      </div>

      <HeaderActions
        isFullscreen={isFullscreen}
        onUndo={onUndo}
        onRedo={onRedo}
        onScreenshot={onScreenshot}
        onMaximize={onMaximize}
      />
    </div>
  );
}
