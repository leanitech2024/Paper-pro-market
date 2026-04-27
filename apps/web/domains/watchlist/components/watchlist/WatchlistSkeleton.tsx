import { Skeleton } from "@/components/ui/skeleton";

export function WatchlistSkeleton() {
  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200/80 dark:bg-[#0c1322] dark:border-white/[0.08]">
      {/* Header Skeleton */}
      <div className="px-3 h-9 border-b border-slate-200/80 bg-slate-50/80 flex items-center dark:border-white/[0.08] dark:bg-[#10192b]">
        <Skeleton className="h-4 w-24 bg-slate-300/40 dark:bg-white/[0.08]" />
      </div>
      
      {/* List Items Skeleton */}
      <div className="flex-1 p-2 space-y-1">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="flex items-center justify-between px-3 py-2.5 border-b border-slate-200/60 dark:border-white/[0.05]">
            <div className="flex flex-col gap-1">
              <Skeleton className="h-4 w-16 bg-slate-300/40 dark:bg-white/[0.08]" />
              <Skeleton className="h-3 w-24 bg-slate-200/40 dark:bg-white/[0.06]" />
            </div>
            <div className="flex flex-col items-end gap-1">
              <Skeleton className="h-4 w-20 bg-slate-300/40 dark:bg-white/[0.08]" />
              <Skeleton className="h-3 w-16 bg-slate-200/40 dark:bg-white/[0.06]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
