"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";

/**
 * Rendered by OnboardingLayout when DB says onboarding is complete but
 * the JWT cookie is stale.
 *
 * The middleware bypass is handled by the `onb_done` cookie set by
 * /api/v1/onboarding/complete — so we don't need session.update() here.
 * We still call update() to sync the React session state (UI only),
 * but we don't wait for it before navigating.
 */
export function OnboardingDoneRedirect() {
  const { update } = useSession();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    // Fire-and-forget: sync the React session state so UI shows correct values.
    // Navigation does NOT wait for this — the onb_done cookie in middleware
    // handles the gate bypass independently.
    update({ onboardingCompleted: true }).catch(() => {});

    // Navigate immediately — middleware will read the onb_done cookie
    // (set by the onboarding/complete API) and allow through.
    window.location.href = "/trade/equity";
  }, [update]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="mt-4 text-sm text-zinc-400">Taking you to the dashboard...</p>
    </div>
  );
}
