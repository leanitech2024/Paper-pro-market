"use client";

import { useGlobalStore } from "@/stores/global.store";
import { useMarketStore } from "@/stores/trading/market.store";
import { cn } from "@/lib/utils";
import { symbolToIndexInstrumentKey, toCanonicalSymbol } from "@paper-market/core";
import Link from "next/link";
import { useMemo, useEffect, useRef, useState, Fragment } from "react";
import { TICKER_CONFIG } from "@/lib/ticker-config";

function TickerItem({
  cfg,
  selectedKey,
}: {
  cfg: (typeof TICKER_CONFIG)[number];
  selectedKey: string | null;
}) {
  const quote = useMarketStore((s) => s.quotesByInstrument[cfg.instrumentKey]);

  const price = quote?.price ?? quote?.close ?? null;
  const changePercent = quote?.changePercent ?? 0;
  const hasQuote = price !== null && Number.isFinite(price) && price > 0;

  const prevPriceRef = useRef<number | null>(price);
  const [flashClass, setFlashClass] = useState("");

  useEffect(() => {
    if (price === null || prevPriceRef.current === null || price === prevPriceRef.current) {
      prevPriceRef.current = price;
      return;
    }
    setFlashClass(
      price > prevPriceRef.current
        ? "animate-[flashGreen_0.6s_ease-out]"
        : "animate-[flashRed_0.6s_ease-out]"
    );
    const t = setTimeout(() => setFlashClass(""), 600);
    prevPriceRef.current = price;
    return () => clearTimeout(t);
  }, [price]);

  const isSelected = selectedKey === cfg.instrumentKey;

  return (
    <Link
      href={
        cfg.isIndex
          ? `/trade/equity?symbol=${encodeURIComponent(cfg.symbol)}`
          : `/trade/equity?symbol=${encodeURIComponent(cfg.symbol)}`
      }
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-0.5 rounded-md transition-colors whitespace-nowrap hover:bg-white/5 cursor-pointer shrink-0",
        flashClass
      )}
    >
      {/* Label */}
      <span className={cn("font-semibold tracking-wide text-[11px]", isSelected ? "text-primary" : "text-muted-foreground")}>
        {cfg.label}
      </span>

      {/* Price */}
      <span className="text-foreground tabular-nums text-[11px] font-mono">
        {price !== null ? price.toFixed(2) : "--"}
      </span>

      {/* Change % */}
      <span
        className={cn(
          "text-[10px] tabular-nums font-mono",
          !hasQuote
            ? "text-muted-foreground"
            : changePercent >= 0
            ? "text-[#089981]"
            : "text-[#F23645]"
        )}
      >
        {hasQuote
          ? `${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%`
          : "--"}
      </span>
    </Link>
  );
}

// Thin vertical divider between indices and equities
function Divider() {
  return <div className="h-3.5 w-px bg-white/10 shrink-0 mx-1" /> ;
}

const TICKER_STYLE = (duration: number) => `
  @keyframes scrollTicker {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  .ticker-scroller {
    animation: scrollTicker ${duration}s linear infinite;
  }
  .group:hover .ticker-scroller {
    animation-play-state: paused;
  }
`;

export function MarketStatusBar() {
  const quotesByInstrument = useMarketStore((s) => s.quotesByInstrument);

  useEffect(() => {
    console.log("TICKER DATA:", TICKER_CONFIG.map(cfg => ({
      key: cfg.instrumentKey,
      quote: quotesByInstrument[cfg.instrumentKey]
    })));
  }, [quotesByInstrument]);

  const { selectedSymbol } = useGlobalStore();
  const selectedKey = symbolToIndexInstrumentKey(
    toCanonicalSymbol(selectedSymbol || "")
  );

  const indices = useMemo(() => TICKER_CONFIG.filter((c) => c.isIndex), []);
  const equities = useMemo(() => TICKER_CONFIG.filter((c) => !c.isIndex), []);

  // Duplicate for seamless loop: indices scroll with equities as one band
  const allItems = useMemo(() => TICKER_CONFIG, []);
  const duplicated = useMemo(() => [...allItems, ...allItems], [allItems]);
  const durationSeconds = allItems.length * 2.2;

  return (
    <div
      className="h-8 bg-card/60 backdrop-blur-md border-b border-white/5 flex items-center text-xs overflow-hidden relative group isolate w-full"
      style={{ contain: 'strict' }}
      role="marquee"
      aria-label="Market ticker"
    >
      {/* Fallback native CSS injected just in case Tailwind JIT dev mode didn't hot reload custom keyframes */}
      <style dangerouslySetInnerHTML={{ __html: TICKER_STYLE(durationSeconds) }} />

      <div className="flex items-center gap-1 ticker-scroller" style={{ willChange: 'transform', width: 'max-content' }}>
        {duplicated.map((cfg, idx) => (
          <Fragment key={`${cfg.symbol}-frag-${idx}`}>
            {/* Divider between the indices block and equities block */}
            {idx % allItems.length === indices.length && (
              <Divider key={`div-${idx}`} />
            )}
            <TickerItem
              key={`${cfg.symbol}-${idx}`}
              cfg={cfg}
              selectedKey={selectedKey}
            />
          </Fragment>
        ))}
        {/* Invisible 4px block to exactly balance 2N items gap parity so 50% translation maps mathematically perfect */}
        <div className="w-1 shrink-0" />
      </div>
    </div>
  );
}
