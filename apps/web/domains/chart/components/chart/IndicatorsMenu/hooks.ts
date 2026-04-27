import { useMemo, useState } from "react";
import { useAnalysisStore } from "@/domains/chart/stores/analysis.store";
import { CATEGORIES } from "./constants";

export function useIndicatorsMenu(symbol: string) {
  const storedIndicators = useAnalysisStore((s) => s.symbolState[symbol]?.indicators);
  const indicators = useMemo(() => storedIndicators ?? [], [storedIndicators]);
  
  const addIndicator = useAnalysisStore((s) => s.addIndicator);
  const removeIndicator = useAnalysisStore((s) => s.removeIndicator);
  const [search, setSearch] = useState("");

  const activeTypes = useMemo(() => new Set(indicators.map((i) => i.type)), [indicators]);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return CATEGORIES;
    const q = search.toLowerCase();
    return CATEGORIES.map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (item) => item.label.toLowerCase().includes(q) || item.type.toLowerCase().includes(q)
      ),
    })).filter((cat) => cat.items.length > 0);
  }, [search]);

  return {
    indicators,
    activeTypes,
    filteredCategories,
    search,
    setSearch,
    addIndicator,
    removeIndicator,
    activeCount: indicators.length
  };
}
