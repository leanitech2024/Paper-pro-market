import { cn } from '@/lib/utils';
import { useWalletStore } from '@/domains/platform/stores/wallet.store';
import { useEffect } from 'react';

interface TopbarProps {
  onMobileMenuToggle?: () => void;
  mobileMenuOpen?: boolean;
}

export function Topbar({ onMobileMenuToggle, mobileMenuOpen = false }: TopbarProps) {
  // Use real wallet balance from API
  const { fetchWallet } = useWalletStore();

  // Fetch wallet on mount and poll every 30 seconds
  useEffect(() => {
    // Initial fetch is handled by DashboardLayoutClient, so we don't need to call it here immediately
    // unless we want to ensure it's fresh for this specific component, but sharing the store state is sufficient.
    
    const interval = setInterval(() => {
      fetchWallet();
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, [fetchWallet]);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
      {/* Mobile Menu Button & Logo */}
      <div className="flex items-center gap-3 md:hidden">
        <button
          onClick={onMobileMenuToggle}
          className="flex h-10 w-10 flex-col items-center justify-center gap-[6px] rounded-full bg-secondary/50 transition-all active:scale-90"
          aria-label="Toggle menu"
        >
          <span
            className={cn(
              "h-[2px] w-5 rounded-full bg-foreground transition-all duration-300 origin-left",
              mobileMenuOpen && "rotate-45 w-6 translate-y-[0px]"
            )}
          />
          <span
            className={cn(
              "h-[2px] w-3 rounded-full bg-foreground transition-all duration-300 origin-left self-start ml-[10px]",
              mobileMenuOpen && "-rotate-45 w-6 ml-0"
            )}
          />
        </button>
        <div className="font-bold text-lg tracking-tight flex items-center gap-1">
          <span className="text-primary">Paper</span>Market
        </div>
      </div>




    </header>
  );
}
