import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAnalysisStore, IndicatorConfig } from "@/domains/chart/stores/analysis.store";

interface IndicatorSettingsRowProps {
  symbol: string;
  indicator: IndicatorConfig;
  label: string;
  paramFields?: Array<{ key: string; label: string; min?: number; step?: number }>;
}

export function IndicatorSettingsRow({
  symbol,
  indicator,
  label,
  paramFields,
}: IndicatorSettingsRowProps) {
  const updateIndicator = useAnalysisStore((s) => s.updateIndicator);
  const removeIndicator = useAnalysisStore((s) => s.removeIndicator);
  const fields = paramFields ?? [];

  return (
    <div className="rounded-md border border-border/50 bg-card/30 p-2 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold text-foreground">{label}</div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => removeIndicator(symbol, indicator.id)}
            className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
            title="Remove"
          >
            <X size={12} />
          </button>
        </div>
      </div>
      {fields.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {fields.map((field) => (
            <div key={field.key} className="flex items-center gap-1">
              <label className="text-[10px] text-muted-foreground whitespace-nowrap">{field.label}</label>
              <Input
               type="number"
                className="h-6 w-12 text-xs px-1 text-center"
                min={field.min ?? 1}
                step={field.step ?? 1}
                value={indicator.params?.[field.key] ?? ""}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (!Number.isFinite(val)) return;
                  updateIndicator(symbol, indicator.id, {
                    params: { ...indicator.params, [field.key]: val },
                  });
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
