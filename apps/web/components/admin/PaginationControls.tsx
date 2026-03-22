import Link from "next/link";
import { cn } from "@/lib/utils";

type PaginationControlsProps = {
  page: number;
  limit: number;
  total: number;
  basePath: string;
};

export default function PaginationControls({
  page,
  limit,
  total,
  basePath,
}: PaginationControlsProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const prevPage = Math.max(1, page - 1);
  const nextPage = Math.min(totalPages, page + 1);

  const linkClass =
    "inline-flex items-center rounded-md border border-slate-800 px-3 py-1 text-sm transition";

  return (
    <div className="mt-6 flex items-center justify-between text-sm text-slate-400">
      <div>
        Page {page} of {totalPages} • {total} records
      </div>
      <div className="flex items-center gap-2">
        <Link
          href={`${basePath}?page=${prevPage}&limit=${limit}`}
          className={cn(
            linkClass,
            page === 1
              ? "pointer-events-none border-slate-900 text-slate-600"
              : "hover:border-slate-600 hover:text-slate-100"
          )}
        >
          Prev
        </Link>
        <Link
          href={`${basePath}?page=${nextPage}&limit=${limit}`}
          className={cn(
            linkClass,
            page >= totalPages
              ? "pointer-events-none border-slate-900 text-slate-600"
              : "hover:border-slate-600 hover:text-slate-100"
          )}
        >
          Next
        </Link>
      </div>
    </div>
  );
}
