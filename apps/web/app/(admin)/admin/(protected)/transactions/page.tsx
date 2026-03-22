import { alias } from "drizzle-orm/pg-core";
import { count, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { ledgerAccounts, ledgerEntries, users } from "@paper-market/core/db";
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

type AdminTransactionsPageProps = {
  searchParams: Promise<{ page?: string; limit?: string }>;
};

export default async function AdminTransactionsPage({ searchParams }: AdminTransactionsPageProps) {
  const { page: pageParam, limit: limitParam } = await searchParams;
  const page = Math.max(1, Number(pageParam || 1));
  const limit = Math.max(1, Math.min(100, Number(limitParam || 20)));
  const offset = (page - 1) * limit;

  const [{ total }] = await db.select({ total: count() }).from(ledgerEntries);

  const debitAccounts = alias(ledgerAccounts, "debit_accounts");
  const creditAccounts = alias(ledgerAccounts, "credit_accounts");
  const debitUsers = alias(users, "debit_users");
  const creditUsers = alias(users, "credit_users");

  const rows = await db
    .select({
      id: ledgerEntries.id,
      amount: ledgerEntries.amount,
      currency: ledgerEntries.currency,
      referenceType: ledgerEntries.referenceType,
      referenceId: ledgerEntries.referenceId,
      createdAt: ledgerEntries.createdAt,
      debitType: debitAccounts.accountType,
      creditType: creditAccounts.accountType,
      debitEmail: debitUsers.email,
      creditEmail: creditUsers.email,
    })
    .from(ledgerEntries)
    .innerJoin(debitAccounts, eq(ledgerEntries.debitAccountId, debitAccounts.id))
    .innerJoin(creditAccounts, eq(ledgerEntries.creditAccountId, creditAccounts.id))
    .innerJoin(debitUsers, eq(debitAccounts.userId, debitUsers.id))
    .innerJoin(creditUsers, eq(creditAccounts.userId, creditUsers.id))
    .orderBy(desc(ledgerEntries.globalSequence))
    .limit(limit)
    .offset(offset);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Transactions</h1>
        <p className="text-sm text-slate-400">Global ledger entries across all users.</p>
      </div>

      <Card className="border-slate-800 bg-slate-950/70">
        <CardHeader>
          <CardTitle className="text-white">Ledger</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800">
                <TableHead className="text-slate-400">Users</TableHead>
                <TableHead className="text-slate-400">Accounts</TableHead>
                <TableHead className="text-slate-400">Reference</TableHead>
                <TableHead className="text-slate-400 text-right">Amount</TableHead>
                <TableHead className="text-slate-400">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((entry) => (
                <TableRow key={entry.id} className="border-slate-800">
                  <TableCell className="text-slate-200">
                    <div className="text-xs text-slate-500">{entry.debitEmail}</div>
                    <div className="text-xs text-slate-500">{entry.creditEmail}</div>
                  </TableCell>
                  <TableCell className="text-xs text-slate-400">
                    {entry.debitType} → {entry.creditType}
                  </TableCell>
                  <TableCell className="text-xs text-slate-400">
                    {entry.referenceType} / {entry.referenceId}
                  </TableCell>
                  <TableCell className="text-right text-slate-200">
                    {formatCurrency(entry.amount)}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : "-"}
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
        basePath="/admin/transactions"
      />
    </div>
  );
}
