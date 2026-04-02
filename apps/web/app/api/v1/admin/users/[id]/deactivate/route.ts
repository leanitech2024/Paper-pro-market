import { NextResponse } from "next/server";
import { z } from "zod";
import { handleError } from "@/lib/errors";
import { requireAdmin } from "@/lib/admin";
import { AdminService } from "@/services/admin/admin.service";

const BodySchema = z.object({
  reason: z.string().max(200).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAdmin();
    if (!authResult.ok) return authResult.response;

    const session = authResult.session!;
    const { id: userId } = await params;

    const body = await req.json().catch(() => ({}));
    const validated = BodySchema.parse(body);

    const result = await AdminService.deactivateUser(
      session.user!.id!,
      userId,
      validated.reason
    );

    return NextResponse.json({
      success: true,
      data: {
        userId: result.userId,
        isActive: result.isActive,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
