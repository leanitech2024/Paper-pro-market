import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { CandlestickChart, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChartStyle } from '@/domains/chart/stores/analysis.store';
import { IndicatorsMenu } from '../IndicatorsMenu';
import { HeaderSymbol } from './HeaderSymbol';
import { RangeSelector } from './RangeSelector';
import { TimeframeDropdown } from './TimeframeDropdown';
import { ChartStyleDropdown } from './ChartStyleDropdown';
import { resolveToolIcon } from '../toolbar/toolIcons';
import { MOBILE_HEADER_MENUS } from '../toolbar/toolConfig';

interface MobileHeaderProps {
  symbol: string;
  headerText: string;
  chartStyle: ChartStyle;
  isLoading: boolean;
  range: string | undefined;
  effectiveTimeframe: string;
  styleSearch: string;
  filteredStyleGroups: ChartStyle[][];
  activeTool: string | null;
  setRange: (r: string) => void;
  setTimeframe: (tf: string) => void;
  setStyleSearch: (s: string) => void;
  setActiveTool: (tool: string) => void;
  clearAllDrawings: (symbol: string) => void;
  onSearchClick?: () => void;
  onChartStyleChange?: (style: ChartStyle) => void;
}

export function MobileHeader({
  symbol,
  headerText,
  chartStyle,
  isLoading,
  range,
  effectiveTimeframe,
  styleSearch,
  filteredStyleGroups,
  activeTool,
  setRange,
  setTimeframe,
  setStyleSearch,
  setActiveTool,
  clearAllDrawings,
  onSearchClick,
  onChartStyleChange,
}: MobileHeaderProps) {
  return (
    <div className="flex w-full min-w-0 max-w-full flex-col overflow-x-hidden border-b border-slate-200/80 bg-white/95 backdrop-blur-sm dark:border-white/[0.08] dark:bg-[#0c1322]/95 md:hidden">
      <div className="flex w-full min-w-0 max-w-full flex-nowrap items-center gap-1.5 overflow-x-auto overflow-y-hidden overscroll-x-contain px-2 pb-1.5 pt-2 [scrollbar-width:none] [touch-action:pan-x] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
        <HeaderSymbol headerText={headerText} isLoading={isLoading} onSearchClick={onSearchClick} isMobile={true} />

        <RangeSelector currentRange={range} setRange={setRange} setTimeframe={setTimeframe} isMobile={true} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-8 shrink-0 items-center gap-1 rounded-xl border border-slate-200/80 bg-slate-50 px-2.5 text-[10px] font-semibold tracking-[0.12em] text-slate-600 transition-transform active:scale-95 dark:border-white/[0.08] dark:bg-[#10192b] dark:text-slate-300">
              <span>{effectiveTimeframe.toUpperCase()}</span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </button>
          </DropdownMenuTrigger>
          <TimeframeDropdown effectiveTimeframe={effectiveTimeframe} setTimeframe={setTimeframe} setRange={setRange} />
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50 text-slate-500 transition-transform active:scale-95 dark:border-white/[0.08] dark:bg-[#10192b] dark:text-slate-400">
              <CandlestickChart className="h-4 w-4" />
            </button>
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

      <div
        className="flex flex-nowrap items-center gap-1.5 overflow-x-auto overflow-y-hidden overscroll-x-contain border-t border-slate-200/70 px-2 pb-2 pt-1.5 [scrollbar-width:none] [touch-action:pan-x] [-webkit-overflow-scrolling:touch] dark:border-white/[0.06] [&::-webkit-scrollbar]:hidden"
      >
        {MOBILE_HEADER_MENUS.map((menu) => {
          const MenuIcon = resolveToolIcon(menu.icon);
          const activeMenuItem = menu.items.find((item) => item.kind === "tool" && item.id === activeTool);
          const ActiveIcon = resolveToolIcon(activeMenuItem?.icon || menu.icon);
          const isMenuActive = Boolean(activeMenuItem);

          return (
            <DropdownMenu key={menu.id}>
              <DropdownMenuTrigger onPointerDown={(e) => e.stopPropagation()} asChild>
                <button
                  className={cn(
                    "flex h-12 min-w-[3.4rem] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border px-1.5 transition-all",
                    isMenuActive
                      ? "border-blue-500/40 bg-blue-600/10 text-blue-500 dark:border-blue-400/30 dark:text-blue-400"
                      : "border-slate-200/70 bg-slate-50 text-slate-500 dark:border-white/[0.08] dark:bg-[#10192b] dark:text-slate-400",
                  )}
                >
                  {isMenuActive ? <ActiveIcon className="h-4 w-4" /> : <MenuIcon className="h-4 w-4" />}
                  <span className="max-w-full truncate text-center text-[9px] font-semibold leading-none tracking-[0.08em]">
                    {menu.label}
                  </span>
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="start"
                className="w-[260px] max-w-[calc(100vw-20px)] max-h-[65vh] overflow-y-auto overscroll-contain bg-white border-slate-200/80 p-1.5 dark:bg-[#0c1322] dark:border-white/[0.08]"
              >
                <div className="px-2 py-1.5 mb-0.5 flex items-center gap-2 border-b border-slate-100 dark:border-white/[0.06]">
                  <MenuIcon className="h-4 w-4 text-blue-500 dark:text-blue-400 shrink-0" />
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {menu.label}
                  </span>
                </div>
                <div className="space-y-0.5 pt-1">
                  {menu.items.map((item) => {
                    const Icon = resolveToolIcon(item.icon);
                    const isActive = item.kind === "tool" && activeTool === item.id;
                    return (
                      <DropdownMenuItem
                        key={item.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.kind === "action") {
                            clearAllDrawings(symbol);
                            return;
                          }
                          setActiveTool(item.id);
                        }}
                        className={cn(
                          "cursor-pointer gap-2.5 rounded px-2 py-2.5 text-xs transition-colors text-slate-700 dark:text-slate-300 data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900 dark:data-[highlighted]:bg-white/[0.06] dark:data-[highlighted]:text-white",
                          isActive &&
                            "bg-blue-600/10 font-medium text-blue-500 dark:text-blue-400 data-[highlighted]:bg-blue-600/10 data-[highlighted]:text-blue-500 dark:data-[highlighted]:text-blue-400",
                          item.kind === "action" &&
                            "text-rose-600 dark:text-rose-400 data-[highlighted]:text-rose-600 dark:data-[highlighted]:text-rose-400",
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        {isActive && <span className="text-[9px] font-semibold uppercase tracking-wider opacity-60">✓</span>}
                      </DropdownMenuItem>
                    );
                  })}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        })}
      </div>
    </div>
  );
}
