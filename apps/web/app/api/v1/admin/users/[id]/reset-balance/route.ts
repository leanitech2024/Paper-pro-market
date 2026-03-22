import { NextResponse } from "next/server";
import { z } from "zod";
import { handleError } from "@/lib/errors";
import { requireAdmin } from "@/lib/admin";
import { AdminService } from "@/services/admin/admin.service";

const BodySchema = z.object({
  targetBalance: z.coerce.number().min(0).optional(),
  reason: z.string().max(200).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAdmin();
    if (!authResult.ok) return authResult.response;

    const session = authResult.session;
    const { id: userId } = await params;

    const body = await req.json().catch(() => ({}));
    const validated = BodySchema.parse(body);

    const result = await AdminService.resetUserBalance(
      session!.user!.id!,
      userId,
      {
        targetBalance: validated.targetBalance,
        reason: validated.reason,
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        userId,
        balance: result.cash,
        marginBlocked: result.marginBlocked,
        equity: result.equity,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
