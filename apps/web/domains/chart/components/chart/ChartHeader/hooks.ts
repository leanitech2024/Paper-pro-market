import { useMemo, useState } from 'react';
import { timeframeGroups, styleGroups, styleLabels, rangeToTimeframe } from './config';

export function useChartHeader(range: string | undefined, timeframe: string | undefined) {
  const [styleSearch, setStyleSearch] = useState("");

  const effectiveTimeframe = useMemo(() => {
    return (range ? rangeToTimeframe[range] || timeframe : timeframe) || "1m";
  }, [range, timeframe]);

  const activeTimeframeLabel = useMemo(() => {
    return timeframeGroups
      .flatMap((g) => g.items)
      .find((item) => item.value === effectiveTimeframe)?.label || "1 minute";
  }, [effectiveTimeframe]);

  const filteredStyleGroups = useMemo(() => {
    if (!styleSearch.trim()) return styleGroups;
    
    return styleGroups
      .map((group) =>
        group.filter((style) =>
          styleLabels[style].toLowerCase().includes(styleSearch.toLowerCase())
        )
      )
      .filter((group) => group.length > 0);
  }, [styleSearch]);

  return { styleSearch, setStyleSearch, effectiveTimeframe, activeTimeframeLabel, filteredStyleGroups };
}
