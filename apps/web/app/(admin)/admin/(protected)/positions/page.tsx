import { count, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { positions, users } from "@paper-market/core/db";
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

type AdminPositionsPageProps = {
  searchParams: Promise<{ page?: string; limit?: string }>;
};

export default async function AdminPositionsPage({ searchParams }: AdminPositionsPageProps) {
  const { page: pageParam, limit: limitParam } = await searchParams;
  const page = Math.max(1, Number(pageParam || 1));
  const limit = Math.max(1, Math.min(100, Number(limitParam || 20)));
  const offset = (page - 1) * limit;

  const [{ total }] = await db.select({ total: count() }).from(positions);

  const rows = await db
    .select({
      id: positions.id,
      userEmail: users.email,
      symbol: positions.symbol,
      quantity: positions.quantity,
      averagePrice: positions.averagePrice,
      realizedPnL: positions.realizedPnL,
      leverage: positions.leverage,
      updatedAt: positions.updatedAt,
    })
    .from(positions)
    .innerJoin(users, eq(positions.userId, users.id))
    .orderBy(desc(positions.updatedAt))
    .limit(limit)
    .offset(offset);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Positions</h1>
        <p className="text-sm text-slate-400">Current holdings and exposure.</p>
      </div>

      <Card className="border-slate-800 bg-slate-950/70">
        <CardHeader>
          <CardTitle className="text-white">Open Positions</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800">
                <TableHead className="text-slate-400">User</TableHead>
                <TableHead className="text-slate-400">Symbol</TableHead>
                <TableHead className="text-slate-400">Qty</TableHead>
                <TableHead className="text-slate-400 text-right">Avg Price</TableHead>
                <TableHead className="text-slate-400 text-right">Realized P&L</TableHead>
                <TableHead className="text-slate-400">Leverage</TableHead>
                <TableHead className="text-slate-400">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((position) => {
                const pnlValue = Number(position.realizedPnL ?? 0);
                return (
                  <TableRow key={position.id} className="border-slate-800">
                    <TableCell className="text-slate-200">{position.userEmail}</TableCell>
                    <TableCell className="text-white">{position.symbol}</TableCell>
                    <TableCell className="text-slate-200">{position.quantity}</TableCell>
                    <TableCell className="text-right text-slate-200">
                      {formatCurrency(position.averagePrice)}
                    </TableCell>
                    <TableCell
                      className={
                        pnlValue >= 0 ? "text-right text-emerald-400" : "text-right text-rose-400"
                      }
                    >
                      {formatCurrency(position.realizedPnL ?? "0")}
                    </TableCell>
                    <TableCell className="text-slate-200">{position.leverage}x</TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {position.updatedAt ? new Date(position.updatedAt).toLocaleString() : "-"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PaginationControls
        page={page}
        limit={limit}
        total={Number(total ?? 0)}
        basePath="/admin/positions"
      />
    </div>
  );
}
