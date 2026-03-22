import { alias } from "drizzle-orm/pg-core";
import { count, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { adminAuditLogs, users } from "@paper-market/core/db";
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

type AdminAuditLogsPageProps = {
  searchParams: Promise<{ page?: string; limit?: string }>;
};

export default async function AdminAuditLogsPage({ searchParams }: AdminAuditLogsPageProps) {
  const { page: pageParam, limit: limitParam } = await searchParams;
  const page = Math.max(1, Number(pageParam || 1));
  const limit = Math.max(1, Math.min(100, Number(limitParam || 20)));
  const offset = (page - 1) * limit;

  const [{ total }] = await db.select({ total: count() }).from(adminAuditLogs);

  const adminUsers = alias(users, "admin_users");
  const targetUsers = alias(users, "target_users");

  const rows = await db
    .select({
      id: adminAuditLogs.id,
      action: adminAuditLogs.action,
      details: adminAuditLogs.details,
      createdAt: adminAuditLogs.createdAt,
      adminEmail: adminUsers.email,
      targetEmail: targetUsers.email,
    })
    .from(adminAuditLogs)
    .innerJoin(adminUsers, eq(adminAuditLogs.adminId, adminUsers.id))
    .leftJoin(targetUsers, eq(adminAuditLogs.targetUserId, targetUsers.id))
    .orderBy(desc(adminAuditLogs.createdAt))
    .limit(limit)
    .offset(offset);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Audit Logs</h1>
        <p className="text-sm text-slate-400">Administrative actions captured for compliance.</p>
      </div>

      <Card className="border-slate-800 bg-slate-950/70">
        <CardHeader>
          <CardTitle className="text-white">Admin Actions</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800">
                <TableHead className="text-slate-400">Admin</TableHead>
                <TableHead className="text-slate-400">Action</TableHead>
                <TableHead className="text-slate-400">Target</TableHead>
                <TableHead className="text-slate-400">Details</TableHead>
                <TableHead className="text-slate-400">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((log) => (
                <TableRow key={log.id} className="border-slate-800">
                  <TableCell className="text-slate-200">{log.adminEmail}</TableCell>
                  <TableCell className="text-white">{log.action}</TableCell>
                  <TableCell className="text-slate-300">{log.targetEmail ?? "—"}</TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {log.details ? JSON.stringify(log.details) : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {log.createdAt ? new Date(log.createdAt).toLocaleString() : "-"}
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
        basePath="/admin/audit-logs"
      />
    </div>
  );
}
