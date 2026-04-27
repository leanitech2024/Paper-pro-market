import { DropdownMenuContent } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { ChartStyle } from '@/domains/chart/stores/analysis.store';
import { styleLabels } from './config';

interface ChartStyleDropdownProps {
  chartStyle: ChartStyle;
  styleSearch: string;
  setStyleSearch: (s: string) => void;
  filteredStyleGroups: ChartStyle[][];
  onChartStyleChange?: (style: ChartStyle) => void;
}

export function ChartStyleDropdown({
  chartStyle,
  styleSearch,
  setStyleSearch,
  filteredStyleGroups,
  onChartStyleChange
}: ChartStyleDropdownProps) {
  return (
    <DropdownMenuContent
      align="start"
      className="w-72 max-h-[420px] overflow-y-auto p-0 bg-white border-slate-200/80 dark:bg-[#0c1322] dark:border-white/[0.08]"
      style={{ scrollbarWidth: "thin" }}
    >
      <div className="sticky top-0 z-10 bg-white/95 border-b border-slate-200/80 p-2 dark:bg-[#0c1322]/95 dark:border-white/[0.08]">
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search chart styles..."
            className="h-7 text-xs pl-11 pr-2"
            value={styleSearch}
            onChange={(e) => setStyleSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="p-1.5 space-y-1">
        {filteredStyleGroups.map((group, groupIndex) => (
          <div key={group.join("-")}>
            {groupIndex > 0 ? <div className="h-px bg-slate-200/70 dark:bg-white/[0.08] my-1" /> : null}
            <div className="space-y-0.5">
              {group.map((style) => (
                <button
                  key={style}
                  onClick={() => {
                    onChartStyleChange?.(chartStyle === style ? "CANDLE" : style);
                  }}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-xs transition-colors ${
                    chartStyle === style
                      ? "bg-blue-600/10 text-blue-500 dark:text-blue-400"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/[0.06] dark:hover:text-white"
                  }`}
                >
                  <span>{styleLabels[style]}</span>
                  {chartStyle === style && (
                    <span className="text-[9px] text-blue-500/70 font-medium">ACTIVE</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
        {filteredStyleGroups.length === 0 && (
          <div className="text-center text-xs text-slate-500 py-4 dark:text-slate-400">
            No styles match "{styleSearch}"
          </div>
        )}
      </div>
      <div className="border-t border-slate-200/70 dark:border-white/[0.08] mx-1.5" />
      <div className="p-1.5 space-y-0.5">
        <div className="px-2 pt-1 pb-0.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400/70">
          Advanced
        </div>
        {["Renko", "Line break", "Kagi", "Point & figure"].map((label) => (
          <div
            key={label}
            className="px-2 py-1.5 rounded text-xs text-slate-400 cursor-not-allowed dark:text-slate-500/60"
          >
            {label}
          </div>
        ))}
      </div>
    </DropdownMenuContent>
  );
}
