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
}

export function TradeControls({
  side, setSide,
  productType, setProductType,
  leverage, setLeverage,
  quantity, setQuantity,
  inputValue, effectiveQuantity,
  isOppositeExitFlow, existingPositionQty,
  stopLoss, setStopLoss,
  target, setTarget,
  hasSl, isSlValid,
  hasTarget, isTargetValid
}: TradeControlsProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 mt-3">
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Quantity</p>
          {isOppositeExitFlow ? (
            <div className="flex h-9 items-center rounded-md border border-border bg-background/70 px-3 text-sm font-semibold text-foreground">Exit ({existingPositionQty})</div>
          ) : (
            <div className="flex items-center overflow-hidden rounded-md border border-border bg-background/70">
              <button type="button" onClick={() => setQuantity(String(Math.max(1, inputValue - 1)))} className="px-3 py-2 text-muted-foreground hover:text-foreground">-</button>
              <input type="text" inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value.replace(/[^\d]/g, ""))} className="w-full bg-transparent py-2 text-center text-sm font-bold text-foreground outline-none" />
              <button type="button" onClick={() => setQuantity(String(inputValue + 1))} className="px-3 py-2 text-muted-foreground hover:text-foreground">+</button>
            </div>
          )}
        </div>
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Units</p>
          <div className="flex h-9 items-center rounded-md border border-border bg-background/70 px-3 text-sm font-bold tabular-nums text-foreground">{effectiveQuantity.toLocaleString("en-IN")}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Product</p>
          <div className="inline-flex w-full rounded-md border border-border bg-background/70 p-0.5">
            {(["CNC", "MIS"] as const).map((value) => (
              <button key={value} type="button" onClick={() => setProductType(value)}
                className={cn("w-1/2 rounded-sm py-1.5 text-[11px] font-semibold",
                  productType === value ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
                {value}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Leverage</p>
          <div className="inline-flex w-full rounded-md border border-border bg-background/70 p-0.5">
            {(productType === 'MIS' ? ["1", "2", "3", "5"] : ["1"]).map((value) => (
              <button key={value} type="button"
                onClick={() => productType === 'MIS' ? setLeverage(value) : undefined}
                disabled={productType === 'CNC' && value !== '1'}
                className={cn("rounded-sm py-1.5 text-[11px] font-semibold",
                  productType === 'MIS' ? "w-1/4" : "w-full",
                  leverage === value ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
                  productType === 'CNC' && "opacity-50 cursor-not-allowed")}>
                {value}x
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Stop Loss</p>
          <input type="number" placeholder={side === "BUY" ? "< Entry" : "> Entry"} value={stopLoss} onChange={(e) => setStopLoss(e.target.value)}
            className={cn("h-9 w-full rounded-md border bg-background/80 px-3 text-sm font-mono text-foreground placeholder:text-muted-foreground outline-none",
              hasSl && !isSlValid ? "border-rose-500/60 focus:ring-1 focus:ring-rose-500/40" : "border-border focus:ring-1 focus:ring-primary/40")} />
        </div>
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Target</p>
          <input type="number" placeholder={side === "BUY" ? "> Entry" : "< Entry"} value={target} onChange={(e) => setTarget(e.target.value)}
            className={cn("h-9 w-full rounded-md border bg-background/80 px-3 text-sm font-mono text-foreground placeholder:text-muted-foreground outline-none",
              hasTarget && !isTargetValid ? "border-rose-500/60 focus:ring-1 focus:ring-rose-500/40" : "border-border focus:ring-1 focus:ring-primary/40")} />
        </div>
      </div>
    </>
  );
}
