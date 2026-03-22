import { count } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, orders, positions, subscriptions, adminAuditLogs } from "@paper-market/core/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminDashboardPage() {
  const [
    userCountRows,
    orderCountRows,
    positionCountRows,
    planCountRows,
    auditCountRows,
  ] = await Promise.all([
    db.select({ total: count() }).from(users),
    db.select({ total: count() }).from(orders),
    db.select({ total: count() }).from(positions),
    db.select({ total: count() }).from(subscriptions),
    db.select({ total: count() }).from(adminAuditLogs),
  ]);

  const userCount = userCountRows[0]?.total ?? 0;
  const orderCount = orderCountRows[0]?.total ?? 0;
  const positionCount = positionCountRows[0]?.total ?? 0;
  const planCount = planCountRows[0]?.total ?? 0;
  const auditCount = auditCountRows[0]?.total ?? 0;

  const stats = [
    { label: "Total Users", value: Number(userCount ?? 0) },
    { label: "Orders", value: Number(orderCount ?? 0) },
    { label: "Open Positions", value: Number(positionCount ?? 0) },
    { label: "Subscriptions", value: Number(planCount ?? 0) },
    { label: "Audit Events", value: Number(auditCount ?? 0) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Admin Overview</h1>
        <p className="text-sm text-slate-400">Quick snapshot of platform activity.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-slate-800 bg-slate-950/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-white">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
