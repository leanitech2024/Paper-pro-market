import { NextResponse } from "next/server";
import { handleError } from "@/lib/errors";
import { requireAdmin } from "@/lib/admin";
import { AdminService } from "@/domains/platform/server/admin/admin.service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAdmin();
    if (!authResult.ok) return authResult.response;

    const { id } = await params;

    const { user, wallet, subscription, ledgerSnapshot } =
      await AdminService.getUserDetails(id);

    return NextResponse.json({
      success: true,
      data: {
        user,
        wallet,
        subscription,
        ledgerSnapshot,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
