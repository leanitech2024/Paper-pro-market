"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AlertCircle, X } from "lucide-react";

export function PlanExpiredModal() {
  const [open, setOpen] = useState(true);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
      <div className="mx-4 max-w-sm rounded-lg border border-red-900/50 bg-zinc-950 p-6 shadow-2xl animate-in zoom-in-95 duration-300 relative pointer-events-auto">
        <button
          onClick={() => setOpen(false)}
          className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-100 transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="rounded-full bg-red-900/20 p-3">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Subscription Expired</h2>
            <p className="text-sm text-zinc-400">
              Your paper trading subscription has ended. Please upgrade your plan to regain full access to the platform.
            </p>
          </div>

          <div className="w-full pt-4">
            <Link href="/subscription" passHref>
              <Button className="w-full bg-red-600 hover:bg-red-700">
                View Plans
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
