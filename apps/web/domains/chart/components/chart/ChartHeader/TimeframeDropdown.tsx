import { DropdownMenuContent, DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { timeframeGroups } from './config';

interface TimeframeDropdownProps {
  effectiveTimeframe: string;
  setTimeframe: (tf: string) => void;
  setRange: (r: string) => void;
}

export function TimeframeDropdown({ effectiveTimeframe, setTimeframe, setRange }: TimeframeDropdownProps) {
  return (
    <DropdownMenuContent
      align="start"
      className="w-56 bg-white border-slate-200/80 max-h-[60vh] overflow-y-auto overscroll-contain md:max-h-none dark:bg-[#0c1322] dark:border-white/[0.08]"
    >
      {timeframeGroups.map((group, groupIndex) => (
        <div key={group.label}>
          {groupIndex > 0 ? <DropdownMenuSeparator className="bg-border/50" /> : null}
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-slate-500/70 dark:text-slate-400/70">
            {group.label}
          </DropdownMenuLabel>
          {group.items.map((item) => (
            <DropdownMenuItem
              key={item.value}
              onClick={() => {
                setTimeframe(item.value);
                setRange("");
              }}
              className={cn(
                "text-xs cursor-pointer text-slate-700 dark:text-slate-300 data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900 dark:data-[highlighted]:bg-white/[0.06] dark:data-[highlighted]:text-white",
                effectiveTimeframe === item.value &&
                  "bg-blue-600/10 font-medium text-blue-500 dark:text-blue-400 data-[highlighted]:bg-blue-600/10 data-[highlighted]:text-blue-500 dark:data-[highlighted]:text-blue-400",
              )}
            >
              {item.label}
            </DropdownMenuItem>
          ))}
        </div>
      ))}
    </DropdownMenuContent>
  );
}
