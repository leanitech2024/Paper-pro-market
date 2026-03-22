import { count, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, users } from "@paper-market/core/db";
import { formatCurrency } from "@/lib/utils";
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

type AdminOrdersPageProps = {
  searchParams: Promise<{ page?: string; limit?: string }>;
};

export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  const { page: pageParam, limit: limitParam } = await searchParams;
  const page = Math.max(1, Number(pageParam || 1));
  const limit = Math.max(1, Math.min(100, Number(limitParam || 20)));
  const offset = (page - 1) * limit;

  const [{ total }] = await db.select({ total: count() }).from(orders);

  const rows = await db
    .select({
      id: orders.id,
      userEmail: users.email,
      symbol: orders.symbol,
      side: orders.side,
      quantity: orders.quantity,
      orderType: orders.orderType,
      status: orders.status,
      limitPrice: orders.limitPrice,
      executionPrice: orders.executionPrice,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .innerJoin(users, eq(orders.userId, users.id))
    .orderBy(desc(orders.createdAt))
    .limit(limit)
    .offset(offset);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Orders</h1>
        <p className="text-sm text-slate-400">Latest orders across the platform.</p>
      </div>

      <Card className="border-slate-800 bg-slate-950/70">
        <CardHeader>
          <CardTitle className="text-white">Order Book</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800">
                <TableHead className="text-slate-400">User</TableHead>
                <TableHead className="text-slate-400">Symbol</TableHead>
                <TableHead className="text-slate-400">Side</TableHead>
                <TableHead className="text-slate-400">Qty</TableHead>
                <TableHead className="text-slate-400">Type</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-slate-400 text-right">Price</TableHead>
                <TableHead className="text-slate-400">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((order) => (
                <TableRow key={order.id} className="border-slate-800">
                  <TableCell className="text-slate-200">{order.userEmail}</TableCell>
                  <TableCell className="text-white">{order.symbol}</TableCell>
                  <TableCell className={order.side === "BUY" ? "text-emerald-400" : "text-rose-400"}>
                    {order.side}
                  </TableCell>
                  <TableCell className="text-slate-200">{order.quantity}</TableCell>
                  <TableCell className="text-slate-200">{order.orderType}</TableCell>
                  <TableCell className="text-slate-200">{order.status}</TableCell>
                  <TableCell className="text-right text-slate-200">
                    {formatCurrency(order.executionPrice ?? order.limitPrice ?? "0")}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {order.createdAt ? new Date(order.createdAt).toLocaleString() : "-"}
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
        basePath="/admin/orders"
      />
    </div>
  );
}
