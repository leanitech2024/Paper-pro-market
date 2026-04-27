"use client";

import { Settings2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { makeDefaultIndicator } from "@/domains/chart/stores/analysis.store";
import { IndicatorSettingsRow } from "./IndicatorSettingsRow";
import { useIndicatorsMenu } from "./hooks";
import { CATEGORIES } from "./constants";

interface IndicatorsMenuProps {
  symbol: string;
}

export function IndicatorsMenu({ symbol }: IndicatorsMenuProps) {
  const {
    indicators,
    activeTypes,
    filteredCategories,
    search,
    setSearch,
    addIndicator,
    removeIndicator,
    activeCount
  } = useIndicatorsMenu(symbol);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <Settings2 size={14} />
          <span className="hidden sm:inline">Indicators</span>
          {activeCount > 0 && (
            <span className="ml-0.5 bg-blue-600/20 text-blue-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {activeCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-72 max-h-[480px] overflow-y-auto p-0 bg-white border-slate-200/80 dark:bg-[#0c1322] dark:border-white/[0.08]"
        style={{ scrollbarWidth: "thin" }}
      >
        {/* Search */}
        <div className="sticky top-0 z-10 bg-white/95 border-b border-slate-200/80 p-2 dark:bg-[#0c1322]/95 dark:border-white/[0.08]">
          <div className="relative">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search indicators..."
              className="h-7 text-xs pl-11 pr-2"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Categories */}
        <div className="p-1.5 space-y-1">
          {filteredCategories.map((cat) => (
            <div key={cat.name}>
              <div className="px-2 pt-2 pb-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400/70">
                {cat.name}
              </div>
              <div className="space-y-0.5">
                {cat.items.map((item) => {
                  const isActive = activeTypes.has(item.type);
                  return (
                    <button
                      key={item.type}
                      onClick={() => {
                        if (isActive) {
                          const existing = indicators.find((ind) => ind.type === item.type);
                          if (existing) removeIndicator(symbol, existing.id);
                          return;
                        }
                        const def = makeDefaultIndicator(item.type);
                        if (def) addIndicator(symbol, def);
                      }}
                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-xs transition-colors ${
                        isActive
                          ? "bg-blue-600/10 text-blue-500 dark:text-blue-400"
                          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/[0.06] dark:hover:text-white"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-blue-400" : "bg-transparent"}`} />
                        {item.label}
                      </span>
                      {isActive && (
                        <span className="text-[9px] text-blue-400/70 font-medium">ACTIVE</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {filteredCategories.length === 0 && (
            <div className="text-center text-xs text-muted-foreground py-4">
              No indicators match "{search}"
            </div>
          )}
        </div>

        {/* Active indicator settings */}
        {indicators.length > 0 && (
          <>
            <div className="border-t border-slate-200/70 dark:border-white/[0.08] mx-1.5" />
            <div className="p-1.5 space-y-1.5">
              <div className="px-2 pt-1 pb-0.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400/70">
                Active Settings
              </div>
              {indicators.map((ind) => {
                const def = CATEGORIES.flatMap((c) => c.items).find((d) => d.type === ind.type);
                return (
                  <IndicatorSettingsRow
                    key={ind.id}
                    symbol={symbol}
                    indicator={ind}
                    label={def?.label ?? ind.type}
                    paramFields={def?.params}
                  />
                );
              })}
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
