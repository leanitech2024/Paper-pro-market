"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/transactions", label: "Transactions" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/positions", label: "Positions" },
  { href: "/admin/plans", label: "Plans" },
  { href: "/admin/upstox", label: "Upstox" },
  { href: "/admin/audit-logs", label: "Audit Logs" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 border-r border-slate-800 bg-slate-950/80 px-4 py-8">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Paper Market Pro</div>
        <div className="text-lg font-semibold text-white">Admin Console</div>
      </div>
      <nav className="space-y-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block rounded-lg px-3 py-2 text-sm font-medium transition",
                isActive
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
