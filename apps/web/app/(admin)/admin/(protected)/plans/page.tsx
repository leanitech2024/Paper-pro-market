import { count, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscriptions, users } from "@paper-market/core/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PaginationControls from "@/components/admin/PaginationControls";

type AdminPlansPageProps = {
  searchParams: Promise<{ page?: string; limit?: string }>;
};

export default async function AdminPlansPage({ searchParams }: AdminPlansPageProps) {
  const { page: pageParam, limit: limitParam } = await searchParams;
  const page = Math.max(1, Number(pageParam || 1));
  const limit = Math.max(1, Math.min(100, Number(limitParam || 20)));
  const offset = (page - 1) * limit;

  const [{ total }] = await db.select({ total: count() }).from(subscriptions);

  const rows = await db
    .select({
      id: subscriptions.id,
      userEmail: users.email,
      plan: subscriptions.plan,
      status: subscriptions.status,
      currentPeriodStart: subscriptions.currentPeriodStart,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      updatedAt: subscriptions.updatedAt,
    })
    .from(subscriptions)
    .innerJoin(users, eq(subscriptions.userId, users.id))
    .orderBy(desc(subscriptions.updatedAt))
    .limit(limit)
    .offset(offset);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Plans</h1>
        <p className="text-sm text-slate-400">Subscription coverage and lifecycle.</p>
      </div>

      <Card className="border-slate-800 bg-slate-950/70">
        <CardHeader>
          <CardTitle className="text-white">Subscriptions</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800">
                <TableHead className="text-slate-400">User</TableHead>
                <TableHead className="text-slate-400">Plan</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-slate-400">Period</TableHead>
                <TableHead className="text-slate-400">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((plan) => (
                <TableRow key={plan.id} className="border-slate-800">
                  <TableCell className="text-slate-200">{plan.userEmail}</TableCell>
                  <TableCell className="text-white">{plan.plan}</TableCell>
                  <TableCell className="text-slate-200">{plan.status}</TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {plan.currentPeriodStart
                      ? new Date(plan.currentPeriodStart).toLocaleDateString()
                      : "—"}{" "}
                    →{" "}
                    {plan.currentPeriodEnd
                      ? new Date(plan.currentPeriodEnd).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {plan.updatedAt ? new Date(plan.updatedAt).toLocaleString() : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PaginationControls
        page={page}
        limit={limit}
        total={Number(total ?? 0)}
        basePath="/admin/plans"
      />
    </div>
  );
}
