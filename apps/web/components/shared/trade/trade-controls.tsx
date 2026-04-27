import { cn } from "@/lib/utils";

interface TradeControlsProps {
  side: "BUY" | "SELL";
  setSide: (v: "BUY" | "SELL") => void;
  productType: "CNC" | "MIS";
  setProductType: (v: "CNC" | "MIS") => void;
  leverage: string;
  setLeverage: (v: string) => void;
  quantity: string;
  setQuantity: (v: string) => void;
  inputValue: number;
  effectiveQuantity: number;
  isOppositeExitFlow: boolean;
  existingPositionQty: number;
  stopLoss: string;
  setStopLoss: (v: string) => void;
  target: string;
  setTarget: (v: string) => void;
  hasSl: boolean;
  isSlValid: boolean;
  hasTarget: boolean;
  isTargetValid: boolean;
  appearance?: "default" | "minimal";
}

export function TradeControls({
  side, setSide: _setSide,
  productType, setProductType,
  leverage, setLeverage,
  quantity, setQuantity,
  inputValue, effectiveQuantity,
  isOppositeExitFlow, existingPositionQty,
  stopLoss, setStopLoss,
  target, setTarget,
  hasSl, isSlValid,
  hasTarget, isTargetValid,
  appearance = "default",
}: TradeControlsProps) {
  const isMinimal = appearance === "minimal";
  return (
    <>
      <div className="grid grid-cols-2 gap-3 mt-3">
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Quantity</p>
          {isOppositeExitFlow ? (
            <div
              className={cn(
                "flex h-9 items-center rounded-md px-3 text-sm font-semibold text-slate-900 dark:text-slate-100",
                isMinimal
                  ? "bg-slate-50/40 dark:bg-white/[0.04]"
                  : "border border-slate-200/80 bg-slate-50/80 dark:border-white/[0.08] dark:bg-[#10192b]"
              )}
            >
              Exit ({existingPositionQty})
            </div>
          ) : (
            <div
              className={cn(
                "flex items-center overflow-hidden rounded-md",
                isMinimal
                  ? "bg-slate-50/40 dark:bg-white/[0.04]"
                  : "border border-slate-200/80 bg-slate-50/80 dark:border-white/[0.08] dark:bg-[#10192b]"
              )}
            >
              <button type="button" onClick={() => setQuantity(String(Math.max(1, inputValue - 1)))} className="px-3 py-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">-</button>
              <input type="text" inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value.replace(/[^\d]/g, ""))} className="w-full bg-transparent py-2 text-center text-sm font-bold text-slate-900 outline-none dark:text-slate-100" />
              <button type="button" onClick={() => setQuantity(String(inputValue + 1))} className="px-3 py-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">+</button>
            </div>
          )}
        </div>
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Units</p>
          <div
            className={cn(
              "flex h-9 items-center rounded-md px-3 text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100",
              isMinimal
                ? "bg-slate-50/40 dark:bg-white/[0.04]"
                : "border border-slate-200/80 bg-slate-50/80 dark:border-white/[0.08] dark:bg-[#10192b]"
            )}
          >
            {effectiveQuantity.toLocaleString("en-IN")}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Product</p>
          <div
            className={cn(
              "inline-flex w-full rounded-md p-0.5",
              isMinimal
                ? "bg-slate-50/40 dark:bg-white/[0.04]"
                : "border border-slate-200/80 bg-slate-50/80 dark:border-white/[0.08] dark:bg-[#10192b]"
            )}
          >
            {(["CNC", "MIS"] as const).map((value) => (
              <button key={value} type="button" onClick={() => setProductType(value)}
                className={cn("w-1/2 rounded-sm py-1.5 text-[11px] font-semibold",
                  productType === value
                    ? "bg-slate-100 text-slate-900 dark:bg-white/[0.08] dark:text-slate-100"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100")}>
                {value}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Leverage</p>
          <div
            className={cn(
              "inline-flex w-full rounded-md p-0.5",
              isMinimal
                ? "bg-slate-50/40 dark:bg-white/[0.04]"
                : "border border-slate-200/80 bg-slate-50/80 dark:border-white/[0.08] dark:bg-[#10192b]"
            )}
          >
            {(productType === 'MIS' ? ["1", "2", "3", "5"] : ["1"]).map((value) => (
              <button key={value} type="button"
                onClick={() => productType === 'MIS' ? setLeverage(value) : undefined}
                disabled={productType === 'CNC' && value !== '1'}
                className={cn("rounded-sm py-1.5 text-[11px] font-semibold",
                  productType === 'MIS' ? "w-1/4" : "w-full",
                  leverage === value ? "bg-slate-100 text-slate-900 dark:bg-white/[0.06] dark:text-slate-100" : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
                  productType === 'CNC' && "opacity-50 cursor-not-allowed")}>
                {value}x
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Stop Loss</p>
          <input type="number" placeholder={side === "BUY" ? "< Entry" : "> Entry"} value={stopLoss} onChange={(e) => setStopLoss(e.target.value)}
            className={cn(
              "h-9 w-full rounded-md px-3 text-sm font-mono text-slate-900 placeholder:text-slate-400/80 outline-none dark:text-slate-100 dark:placeholder:text-slate-500/70",
              isMinimal ? "bg-slate-50/40 dark:bg-white/[0.04]" : "bg-white/80 dark:bg-[#10192b]",
              hasSl && !isSlValid ? "border-rose-500/60 focus:ring-1 focus:ring-rose-500/40" : "border-slate-200/80 focus:ring-1 focus:ring-primary/40 dark:border-white/[0.08]"
            )} />
        </div>
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Target</p>
          <input type="number" placeholder={side === "BUY" ? "> Entry" : "< Entry"} value={target} onChange={(e) => setTarget(e.target.value)}
            className={cn(
              "h-9 w-full rounded-md px-3 text-sm font-mono text-slate-900 placeholder:text-slate-400/80 outline-none dark:text-slate-100 dark:placeholder:text-slate-500/70",
              isMinimal ? "bg-slate-50/40 dark:bg-white/[0.04]" : "bg-white/80 dark:bg-[#10192b]",
              hasTarget && !isTargetValid ? "border-rose-500/60 focus:ring-1 focus:ring-rose-500/40" : "border-slate-200/80 focus:ring-1 focus:ring-primary/40 dark:border-white/[0.08]"
            )} />
        </div>
      </div>
    </>
  );
}
