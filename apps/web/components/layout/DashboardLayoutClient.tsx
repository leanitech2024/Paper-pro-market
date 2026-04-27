'use client';
import { ReactNode, useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/general/Logo';
import { CircleUserRound } from 'lucide-react';
import type { Session } from 'next-auth';

import { useWalletStore } from '@/domains/platform/stores/wallet.store';
import { usePositionsStore } from '@/domains/trading/stores/positions.store';
import { useMarketStream } from '@/domains/market/hooks/use-market-stream';
import { useMarketStore } from '@/domains/market/stores/market.store';
import { MarketStatusBar } from '@/components/layout/MarketStatusBar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { cn } from '@/lib/utils';
import { toInstrumentKey } from '@paper-market/core';
import { useSearchStore } from '@/domains/watchlist/stores/search.store';
import { GlobalSearchModal } from '@/domains/watchlist/components/search/GlobalSearchModal';
import { useSubscriptionStore } from '@/domains/platform/stores/subscription.store';

export default function DashboardLayoutClient({
  children,
  session,
}: {
  children: ReactNode;
  session: Session | null;
}) {
  useMarketStream();
  const pathname = usePathname();

  const fetchWallet = useWalletStore((state) => state.fetchWallet);
  const fetchPositions = usePositionsStore((state) => state.fetchPositions);
  const fetchSubscription = useSubscriptionStore((state) => state.fetchSubscription);
  const seedFromSession = useSubscriptionStore((state) => state.seedFromSession);

  // Seed store immediately from JWT — shows correct lock state before fetch completes
  useEffect(() => {
    if (session?.user?.subscriptionStatus) {
      seedFromSession(
        (session.user as { plan?: string }).plan ?? 'free_trial',
        session.user.subscriptionStatus,
      );
    }
  }, [session, seedFromSession]);

  useEffect(() => {
    fetchWallet();
    const positionsTimer = setTimeout(() => {
      fetchPositions();
    }, 200);
    const subscriptionTimer = setTimeout(() => {
      fetchSubscription();
    }, 400);
    return () => {
      clearTimeout(positionsTimer);
      clearTimeout(subscriptionTimer);
    };
  }, [fetchWallet, fetchPositions, fetchSubscription]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        const isEquity = pathname?.startsWith("/trade/equity");
        const isOptions = pathname?.startsWith("/trade/options");
        const isFutures = pathname?.startsWith("/trade/futures");
        const mode = isEquity ? "EQUITY" : isOptions ? "OPTION" : isFutures ? "FUTURE" : "ALL";
        const placeholder =
          mode === "EQUITY"
            ? "Search equities..."
            : mode === "OPTION"
            ? "Search option contracts..."
            : mode === "FUTURE"
            ? "Search futures contracts..."
            : "Search stocks, indices, commodities...";
        useSearchStore.getState().openSearch({ mode, placeholder });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pathname]);

  return (
    <DashboardContentWrapper session={session}>
      {children}
    </DashboardContentWrapper>
  );
}



function DashboardContentWrapper({
  children,
  session,
}: {
  children: ReactNode;
  session: Session | null;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const isEquityTradeRoute = pathname?.startsWith('/trade/equity');
  const { isOpen, searchMode, placeholder, onSelect, closeSearch } = useSearchStore();
  const isAdmin = session?.user?.role === 'admin';
  // Note: session is already consumed in the parent for seeding — these selectors react to store updates
  const plan = useSubscriptionStore((state) => state.plan);
  const subscriptionStatus = useSubscriptionStore((state) => state.status);

  return (

    <div className="flex min-h-screen w-full font-sans bg-gradient-to-b from-slate-100 via-white to-slate-100/80 text-slate-950 dark:from-[#09111e] dark:via-[#0b1220] dark:to-[#0b1324] dark:text-slate-50">
      <GlobalSearchModal
        open={isOpen}
        onOpenChange={(open) => !open && closeSearch()}
        searchMode={searchMode}
        placeholder={placeholder}
        onSelectStock={onSelect}
      />
      <Sidebar
        isAdmin={isAdmin}
        mobileOpen={mobileMenuOpen}
        setMobileOpen={setMobileMenuOpen}
        compactHidden={isEquityTradeRoute}
        disableMobile={isEquityTradeRoute}
        plan={plan}
        subscriptionStatus={subscriptionStatus}
        user={session?.user ?? null}
      />

      <div
        className={cn(
          'flex-1 flex flex-col transition-all duration-300',
          isEquityTradeRoute ? 'xl:ml-16' : 'md:ml-16',
        )}
      >
        <MobileFloatingHeader />
        <div className="hidden md:block w-full overflow-hidden" style={{ contain: 'layout paint' }}>
          <MarketStatusBar />
        </div>

        <main className="flex-1 overflow-x-hidden w-full max-w-full pb-20 pt-20 md:pb-0 md:pt-0">
          {children}
        </main>
        <MobileBottomNav />
      </div>
    </div>
  )
}

function MobileFloatingHeader() {
  const quotesByInstrument = useMarketStore((state) => state.quotesByInstrument);
  const selectQuote = useMarketStore((state) => state.selectQuote);

  const niftyKey = toInstrumentKey("NSE_INDEX|NIFTY 50");
  const bankNiftyKey = toInstrumentKey("NSE_INDEX|NIFTY BANK");

  const niftyQuote =
    quotesByInstrument[niftyKey] ||
    selectQuote(niftyKey) ||
    selectQuote("NIFTY 50");
  const bankNiftyQuote =
    quotesByInstrument[bankNiftyKey] ||
    selectQuote(bankNiftyKey) ||
    selectQuote("NIFTY BANK");

  const formatPrice = (value: number | undefined) =>
    Number.isFinite(Number(value)) && Number(value) > 0
      ? Number(value).toFixed(2)
      : "--";

  const formatChange = (value: number | undefined) => {
    if (!Number.isFinite(Number(value))) return "--";
    const safe = Number(value);
    const sign = safe > 0 ? "+" : "";
    return `${sign}${safe.toFixed(2)}%`;
  };

  return (
    <div className="fixed left-2 right-2 top-2 z-50 md:hidden">
      <div className="relative flex items-center gap-2 rounded-2xl border border-border/80 bg-background/90 px-2.5 py-1.5 backdrop-blur dark:border-[#1a2e4f] dark:bg-[#0b172b]/88">
        <Link
          href="/dashboard"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted/70 dark:hover:bg-white/[0.06]"
          aria-label="Open dashboard"
        >
          <Logo hideText className="scale-[0.62]" />
        </Link>

        <span className="h-6 w-px shrink-0 bg-border/80 dark:bg-[#1a2e4f]" />

        <div className="min-w-0 flex-1">
          <div className="grid grid-cols-2 gap-2">
            <Link href="/trade/equity?symbol=NIFTY%2050" className="min-w-0 flex flex-col hover:opacity-80 transition-opacity cursor-pointer">
              <p className="truncate text-[9px] uppercase tracking-[0.08em] text-muted-foreground dark:text-slate-400">NIFTY</p>
              <p className="truncate text-[11px] font-semibold text-foreground dark:text-slate-100">{formatPrice(niftyQuote?.price)}</p>
              <p
                className={cn(
                  "truncate text-[9px]",
                  Number(niftyQuote?.changePercent || 0) >= 0
                    ? "text-emerald-600 dark:text-[#2dd4bf]"
                    : "text-rose-600 dark:text-[#fb7185]"
                )}
              >
                {formatChange(niftyQuote?.changePercent)}
              </p>
            </Link>
            <Link href="/trade/equity?symbol=NIFTY%20BANK" className="min-w-0 border-l border-border/80 pl-2 dark:border-[#1a2e4f] flex flex-col hover:opacity-80 transition-opacity cursor-pointer">
              <p className="truncate text-[9px] uppercase tracking-[0.08em] text-muted-foreground dark:text-slate-400">BANKNIFTY</p>
              <p className="truncate text-[11px] font-semibold text-foreground dark:text-slate-100">{formatPrice(bankNiftyQuote?.price)}</p>
              <p
                className={cn(
                  "truncate text-[9px]",
                  Number(bankNiftyQuote?.changePercent || 0) >= 0
                    ? "text-emerald-600 dark:text-[#2dd4bf]"
                    : "text-rose-600 dark:text-[#fb7185]"
                )}
              >
                {formatChange(bankNiftyQuote?.changePercent)}
              </p>
            </Link>
          </div>
        </div>

        <span className="h-6 w-px shrink-0 bg-border/80 dark:bg-[#1a2e4f]" />

        <Link
          href="/profile"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted/70 dark:hover:bg-white/[0.06]"
          aria-label="Open profile"
        >
          <CircleUserRound className="h-5 w-5 text-foreground dark:text-slate-100" />
        </Link>
      </div>
    </div>
  );
}
