import Link from "next/link";
import { count, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, wallets } from "@paper-market/core/db";
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
import UserActions from "@/components/admin/UserActions";

type AdminUsersPageProps = {
  searchParams: Promise<{ page?: string; limit?: string }>;
};

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const { page: pageParam, limit: limitParam } = await searchParams;
  const page = Math.max(1, Number(pageParam || 1));
  const limit = Math.max(1, Math.min(100, Number(limitParam || 20)));
  const offset = (page - 1) * limit;

  const [{ total }] = await db.select({ total: count() }).from(users);

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
      walletBalance: wallets.balance,
    })
    .from(users)
    .leftJoin(wallets, eq(users.id, wallets.userId))
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Users</h1>
        <p className="text-sm text-slate-400">Manage account status and balances.</p>
      </div>

      <Card className="border-slate-800 bg-slate-950/70">
        <CardHeader>
          <CardTitle className="text-white">User Directory</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800">
                <TableHead className="text-slate-400">User</TableHead>
                <TableHead className="text-slate-400">Role</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-slate-400 text-right">Balance</TableHead>
                <TableHead className="text-slate-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((user) => (
                <TableRow key={user.id} className="border-slate-800">
                  <TableCell>
                    <div className="flex flex-col">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="font-medium text-white hover:underline"
                      >
                        {user.name}
                      </Link>
                      <span className="text-xs text-slate-500">{user.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-200">{user.role}</TableCell>
                  <TableCell className={user.isActive ? "text-emerald-400" : "text-rose-400"}>
                    {user.isActive ? "Active" : "Inactive"}
                  </TableCell>
                  <TableCell className="text-right text-slate-200">
                    {formatCurrency(user.walletBalance ?? "0")}
                  </TableCell>
                  <TableCell className="text-right">
                    <UserActions userId={user.id} isActive={user.isActive} />
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
        basePath="/admin/users"
      />
    </div>
  );
}
