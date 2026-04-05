"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";
import { useWalletStore } from "@/stores/wallet.store";
import { useSubscriptionStore } from "@/stores/subscription.store";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Session } from "next-auth";

export default function ProfilePageClient({ session }: { session: Session | null }) {
  const { balance, fetchWallet } = useWalletStore();
  const { plan, status, isTrialActive, trialEndDate, fetchSubscription, hasFetched, isLoading } =
    useSubscriptionStore();

  useEffect(() => {
    fetchWallet();
    if (!hasFetched) fetchSubscription();
  }, [fetchWallet, fetchSubscription, hasFetched]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleLogout = () => {
    signOut({ callbackUrl: "/" });
  };

  const daysLeft = trialEndDate
    ? Math.max(0, Math.ceil((new Date(trialEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const isExpired = status === "expired" || status === "cancelled";
  const planLabel = plan === "free_trial" ? "Free Trial" : plan === "basic" ? "Basic" : "Pro";

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 md:p-8 lg:p-12 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
        </div>

        <div className="space-y-6">
          {/* Personal Information */}
          <section className="rounded-3xl border border-border/50 bg-card/40 backdrop-blur-xl p-8 shadow-sm">
            <h2 className="text-xl font-bold text-foreground mb-6">Personal Information</h2>

            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 border-b border-border/50">
                <div className="text-sm font-medium text-muted-foreground">Name</div>
                <div className="text-sm font-medium text-foreground flex items-center justify-end gap-2 mt-1 sm:mt-0 text-right">
                  {session?.user?.name}
                  {session?.user?.role === "admin" && (
                    <span className="bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full">
                      Admin
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 border-b border-border/50">
                <div className="text-sm font-medium text-muted-foreground">Email Address</div>
                <div className="text-sm font-medium text-foreground mt-1 sm:mt-0 text-right">
                  {session?.user?.email}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4">
                <div className="text-sm font-medium text-muted-foreground">Trading Balance</div>
                <div className="text-sm font-medium text-foreground flex items-center justify-end mt-1 sm:mt-0 text-right">
                  {formatCurrency(balance)}{" "}
                  <span className="text-xs text-muted-foreground font-normal ml-2">(Virtual)</span>
                </div>
              </div>
            </div>
          </section>

          {/* Subscription Section */}
          <section className="rounded-3xl border border-border/50 bg-card/40 backdrop-blur-xl p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <h2 className="text-xl font-bold text-foreground mb-1">Subscription Plan</h2>
                {!hasFetched || isLoading ? (
                  <div className="h-4 w-32 bg-muted rounded animate-pulse mt-2" />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Current Plan: <span className="font-semibold text-foreground">{planLabel}</span>
                    {isTrialActive && ` (${daysLeft} days left)`}
                    {isExpired && ` (Expired)`}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <Link href="/subscription">
                  <Button
                    variant={plan === "pro" && !isExpired ? "outline" : "default"}
                    className="rounded-xl px-6"
                  >
                    {plan === "pro" && !isExpired ? "View Details" : "Upgrade Plan"}
                  </Button>
                </Link>
              </div>
            </div>
          </section>

          {/* Danger Zone / Action */}
          <section className="rounded-3xl border border-destructive/20 bg-destructive/5 p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="font-bold text-foreground">Global Session</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Sign out of your account on this device.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={handleLogout}
              className="rounded-xl px-8 w-full sm:w-auto hover:bg-destructive/90 font-semibold"
            >
              Sign Out
            </Button>
          </section>
        </div>
      </div>
    </div>
  );
}
