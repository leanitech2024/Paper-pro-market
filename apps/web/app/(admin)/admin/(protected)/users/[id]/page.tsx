import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, wallets, subscriptions } from "@paper-market/core/db";
import { LedgerService } from "@/domains/platform/server/accounting/ledger/ledger.service";
import { notFound } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import UserActions from "@/components/admin/UserActions";

type AdminUserDetailProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminUserDetailPage({ params }: AdminUserDetailProps) {
  const { id: userId } = await params;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    notFound();
  }

  const [wallet] = await db
    .select()
    .from(wallets)
    .where(eq(wallets.userId, userId))
    .limit(1);

  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  const snapshot = await LedgerService.reconstructUserEquity(userId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/users" className="text-sm text-slate-400 hover:text-slate-200">
            â† Back to users
          </Link>
          <h1 className="text-2xl font-semibold text-white">{user.name}</h1>
          <p className="text-sm text-slate-400">{user.email}</p>
        </div>
        <UserActions userId={user.id} isActive={user.isActive} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-slate-800 bg-slate-950/70">
          <CardHeader>
            <CardTitle className="text-white">Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-300">
            <div className="flex justify-between">
              <span>Role</span>
              <span className="text-white">{user.role}</span>
            </div>
            <div className="flex justify-between">
              <span>Status</span>
              <span className={user.isActive ? "text-emerald-400" : "text-rose-400"}>
                {user.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Joined</span>
              <span className="text-white">
                {user.createdAt ? new Date(user.createdAt).toLocaleString() : "-"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-950/70">
          <CardHeader>
            <CardTitle className="text-white">Wallet Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-300">
            <div className="flex justify-between">
              <span>Cash</span>
              <span className="text-white">{formatCurrency(snapshot.cash)}</span>
            </div>
            <div className="flex justify-between">
              <span>Blocked</span>
              <span className="text-white">{formatCurrency(snapshot.marginBlocked)}</span>
            </div>
            <div className="flex justify-between">
              <span>Equity</span>
              <span className="text-white">{formatCurrency(snapshot.equity)}</span>
            </div>
            <div className="flex justify-between">
              <span>Cache Balance</span>
              <span className="text-white">
                {formatCurrency(wallet?.balance ?? "0")}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-800 bg-slate-950/70">
        <CardHeader>
          <CardTitle className="text-white">Subscription</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-slate-300 md:grid-cols-2">
          <div className="flex justify-between">
            <span>Plan</span>
            <span className="text-white">{subscription?.plan ?? "â€”"}</span>
          </div>
          <div className="flex justify-between">
            <span>Status</span>
            <span className="text-white">{subscription?.status ?? "â€”"}</span>
          </div>
          <div className="flex justify-between">
            <span>Period Start</span>
            <span className="text-white">
              {subscription?.currentPeriodStart
                ? new Date(subscription.currentPeriodStart).toLocaleDateString()
                : "â€”"}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Period End</span>
            <span className="text-white">
              {subscription?.currentPeriodEnd
                ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                : "â€”"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
