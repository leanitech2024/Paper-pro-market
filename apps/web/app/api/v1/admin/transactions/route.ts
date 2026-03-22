import { NextResponse } from "next/server";
import { handleError } from "@/lib/errors";
import { requireAdmin } from "@/lib/admin";
import { AdminService } from "@/services/admin/admin.service";

export async function GET(req: Request) {
  try {
    const authResult = await requireAdmin();
    if (!authResult.ok) return authResult.response;

    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") || 20);
    const page = Number(searchParams.get("page") || 1);
    const result = await AdminService.listTransactions({ page, limit });

    return NextResponse.json({
      success: true,
      data: {
        transactions: result.transactions,
        pagination: result.pagination,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
